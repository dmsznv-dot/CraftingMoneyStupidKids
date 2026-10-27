import type {BlockType} from './core.ts';
// Synthesised sounds from filtered noise; each material has its own colour so digging reads by ear.
export type Sound='hit'|'clank'|'ore'|'blast'|'fuse'|'nudge'|'win'|'break';
// filter: band centre; q: resonance; decay: seconds; gain: loudness; grains: crunch repeats on a break.
const MATERIAL:Record<BlockType,{filter:number;q:number;decay:number;gain:number;type:BiquadFilterType}>={
 coal:{filter:1100,q:1,decay:.06,gain:.4,type:'bandpass'},
 copper:{filter:1950,q:1.4,decay:.06,gain:.4,type:'bandpass'},
 iron:{filter:2100,q:1.5,decay:.06,gain:.4,type:'bandpass'},
 emerald:{filter:2600,q:1.8,decay:.08,gain:.4,type:'bandpass'},
 double:{filter:2800,q:1.8,decay:.1,gain:.4,type:'bandpass'},
 sweep:{filter:1400,q:1.2,decay:.1,gain:.4,type:'bandpass'},
 dirt:{filter:420,q:.7,decay:.07,gain:.5,type:'lowpass'},
 stone:{filter:1700,q:1.1,decay:.06,gain:.45,type:'bandpass'},
 gold:{filter:1900,q:1.3,decay:.06,gain:.45,type:'bandpass'},
 gem:{filter:2300,q:1.6,decay:.06,gain:.45,type:'bandpass'},
 hard:{filter:1250,q:1.4,decay:.07,gain:.5,type:'bandpass'},
 tnt:{filter:700,q:.8,decay:.05,gain:.35,type:'bandpass'},
 obsidian:{filter:2700,q:2.2,decay:.05,gain:.4,type:'bandpass'},
 bedrock:{filter:260,q:1,decay:.09,gain:.6,type:'lowpass'},
};
export class AudioBus {
 context:AudioContext|null=null;out:AudioNode|null=null;noise:AudioBuffer|null=null;enabled=true;muted=false;last=0;lastBreak=0;
 unlock(){
  try{
   if(!this.context){
    const ctx=new AudioContext(),comp=ctx.createDynamicsCompressor(),buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    comp.connect(ctx.destination);this.context=ctx;this.out=comp;this.noise=buffer;
   }
   void this.context.resume();
  }catch{/* silence is safe */}
 }
 pause(on:boolean){this.muted=on;if(on&&this.context?.state==='running')void this.context.suspend().catch(()=>{});else if(!on&&this.context?.state==='suspended')void this.context.resume().catch(()=>{});}
 ready(){return this.enabled&&!this.muted&&!!this.context&&!!this.out&&this.context.state==='running';}
 // A filtered noise burst with a sharp attack: the building block of every dig sound.
 burst(at:number,filter:number,q:number,decay:number,gain:number,type:BiquadFilterType='bandpass'){
  const ctx=this.context!,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  src.buffer=this.noise;f.type=type;f.frequency.value=filter*(.9+Math.random()*.2);f.Q.value=q;
  g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.004);g.gain.exponentialRampToValueAtTime(.001,at+decay);
  src.connect(f);f.connect(g);g.connect(this.out!);src.start(at,Math.random()*.5);src.stop(at+decay+.02);
 }
 tone(at:number,freq:number,end:number,decay:number,gain:number,type:OscillatorType='sine'){
  const ctx=this.context!,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
  o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(end,at+decay);
  g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.001,at+decay);o.connect(g);g.connect(this.out!);o.start(at);o.stop(at+decay+.02);
 }
 play(kind:Sound,material:BlockType='stone'){
  if(!this.ready())return;
  const now=this.context!.currentTime,m=MATERIAL[material];
  if((kind==='hit'||kind==='clank')&&now-this.last<.045)return;
  if(kind==='hit'||kind==='clank')this.last=now;
  // A blast breaks many blocks in one frame; one crunch is enough.
  if(kind==='break'){if(now-this.lastBreak<.03)return;this.lastBreak=now;}
  if(kind==='hit')this.burst(now,m.filter,m.q,m.decay,m.gain,m.type);
  // Glancing off rock the pick cannot cut: a dull knock with a short ring.
  if(kind==='clank'){this.burst(now,m.filter*.7,m.q,.05,m.gain*.7,m.type);this.tone(now,m.filter>1000?1500:420,m.filter>1000?1350:380,.09,.05,'triangle');}
  // Breaking: a louder crunch of three quick grains.
  if(kind==='break')for(let i=0;i<3;i++)this.burst(now+i*.028,m.filter*(1-i*.12),m.q,m.decay*1.6,m.gain*(1-i*.2),m.type);
  if(kind==='ore'){const pitch=[1320,1480,1660,1760][Math.floor(Math.random()*4)];this.tone(now+.02,pitch,pitch*1.02,.22,.07);this.tone(now+.02,pitch*2,pitch*2,.12,.02);}
  if(kind==='fuse')this.burst(now,5200,.6,.45,.12,'highpass');
  if(kind==='blast'){this.burst(now,900,.5,.9,.9,'lowpass');this.burst(now+.03,320,.6,1.4,.8,'lowpass');this.tone(now,90,32,.8,.35);}
  if(kind==='nudge'){const ctx=this.context!,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
   src.buffer=this.noise;f.type='bandpass';f.Q.value=2;f.frequency.setValueAtTime(380,now);f.frequency.exponentialRampToValueAtTime(1500,now+.16);
   g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(.25,now+.05);g.gain.exponentialRampToValueAtTime(.001,now+.2);src.connect(f);f.connect(g);g.connect(this.out!);src.start(now);src.stop(now+.22);}
  if(kind==='win')[523,659,784,1047].forEach((f,i)=>this.tone(now+i*.09,f,f,.28,.06,'triangle'));
 }
}
