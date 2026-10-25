import type {SDK,Player} from 'ysdk';
export class PauseGate {
 reasons=new Set<string>();listeners=new Set<()=>void>();
 get paused(){return this.reasons.size>0;}
 set(reason:string,on:boolean){const before=this.reasons.size;on?this.reasons.add(reason):this.reasons.delete(reason);if(before!==this.reasons.size)for(const f of this.listeners)f();}
}
type AdCallbacks={onOpen:()=>void;onRewarded:()=>void;onClose:()=>void;onError:()=>void};
export type AdResult='closed'|'rewarded'|'error'|'unavailable';
export function runAd(gate:PauseGate,invoke:(callbacks:AdCallbacks)=>void,grant?:()=>void):Promise<AdResult>{
 gate.set('ad',true);
 return new Promise(resolve=>{
  let done=false,rewarded=false;
  const end=(error=false)=>{if(done)return;done=true;gate.set('ad',false);resolve(error?'error':rewarded?'rewarded':'closed');};
  try{invoke({onOpen:()=>{if(!done)gate.set('ad',true);},onRewarded:()=>{if(done||rewarded)return;rewarded=true;grant?.();},onClose:()=>end(),onError:()=>end(true)});}catch{end(true);}
 });
}
export class Platform {
 sdk:SDK|null=null;player:Player|null=null;gate=new PauseGate();language='ru';busy=false;running=false;lastAd=-120;activeSeconds=0;
 async init(){
  if(import.meta.env.DEV||import.meta.env.MODE==='preview')return;
  try{
   await new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src='/sdk.js';const timer=setTimeout(()=>reject(Error('SDK timeout')),8000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(Error('SDK unavailable'));};document.head.appendChild(s);});
   this.sdk=await YaGames.init();this.language=this.sdk.environment.i18n.lang;
   this.sdk.on('game_api_pause',()=>this.gate.set('platform',true));
   this.sdk.on('game_api_resume',()=>this.gate.set('platform',false));
   this.player=await this.sdk.getPlayer();
  }catch{ /* Fully playable local fallback; no fake ad or reward. */ }
 }
 ready(){this.sdk?.features.LoadingAPI?.ready();}
 gameplay(on:boolean){if(on===this.running)return;this.running=on;try{on?this.sdk?.features.GameplayAPI?.start():this.sdk?.features.GameplayAPI?.stop();}catch{/* optional telemetry cannot break gameplay */}}
 async advert(rewarded=false,grant?:()=>void):Promise<AdResult>{
  if(this.busy||!this.sdk)return'unavailable';
  if(!rewarded&&(this.activeSeconds<120||this.activeSeconds-this.lastAd<120))return'unavailable';
  this.busy=true;this.lastAd=this.activeSeconds;
  const result=await runAd(this.gate,c=>{if(rewarded)this.sdk!.adv.showRewardedVideo({callbacks:c});else this.sdk!.adv.showFullscreenAdv({callbacks:c});},grant);
  this.busy=false;return result;
 }
}
