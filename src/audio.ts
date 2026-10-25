export class AudioBus {
 context:AudioContext|null=null;enabled=true;muted=false;last=0;
 unlock(){try{this.context??=new AudioContext();void this.context.resume();}catch{/* silence is safe */}}
 pause(on:boolean){this.muted=on;if(on&&this.context?.state==='running')void this.context.suspend().catch(()=>{});else if(!on&&this.context?.state==='suspended')void this.context.resume().catch(()=>{});}
 play(kind:'hit'|'clank'|'ore'|'blast'|'nudge'|'win'){
  if(!this.enabled||this.muted||!this.context||this.context.state!=='running')return;
  const ctx=this.context,now=ctx.currentTime;if((kind==='hit'||kind==='clank')&&now-this.last<.045)return;this.last=now;
  const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
  const freq={hit:110,clank:1250,ore:680,blast:65,nudge:290,win:880}[kind];o.type=kind==='ore'||kind==='win'?'sine':kind==='clank'?'square':'triangle';
  o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(freq*(kind==='blast'?.18:1.5),now+.11);
  g.gain.setValueAtTime(kind==='blast'?.08:kind==='clank'?.018:.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.18);o.start(now);o.stop(now+.2);
 }
}
