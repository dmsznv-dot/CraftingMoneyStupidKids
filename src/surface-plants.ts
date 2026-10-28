/** Decorative plants are seeded independently of mine generation and have no collision. */
export type PlantKind='grass'|'red'|'yellow';
export interface SurfacePlant {column:number;kind:PlantKind;offset:number}
export function surfacePlants(seed:number):SurfacePlant[]{
 let state=(seed^0x6d2b79f5)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const columns=Array.from({length:14},(_,i)=>i);
 for(let i=columns.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[columns[i],columns[j]]=[columns[j],columns[i]];}
 return columns.slice(0,6).map<SurfacePlant>((column,i)=>({column,kind:i===0?'red':i===1?'yellow':'grass',offset:Math.floor(random()*5)-2})).sort((a,b)=>a.column-b.column);
}

/** Original 16×16 sprites: irregular blades, shaded leaves and layered petals. */
export const PLANT_ART:Record<PlantKind,readonly string[]>={
 grass:[
  '................','.....l..........','.....g......l...','..l..g......g...',
  '..g..g..l...g...','..g..g..g..gd...','l.g.dgd.g..gd.l.',
  'gdg.dgd.g..gd.g.','gdg.dgd.dg.gd.g.','gdg.dgd.dg.dgdg.',
  '.dgdgdgdgdgdgd..','..dgd.dgd.dgd...','..dgd.dgd.dgd...',
  '...gd..dg..dg...','...gd..dg..dg...','...dd..dd..dd...',
 ],
 red:[
  '................','................','....rRrr........','...rRRRRr.......',
  '..rRRPRRr.......','..rRPRRRr.......','...rrRRr........','....rrd.........',
  '.....gd.........','.g...gd....l....','.lg..gd..lg.....','..lgggdggl......',
  '...dggdgd.......','.....gd.........','.....gd.........','.....dd.........',
 ],
 yellow:[
  '................','................','......yYy.......','....yyYYYy......',
  '...yYYYpYYy.....','...yYpYYYYy.....','....yyYYYy......','......yyd.......',
  '.......gd.......','..g....gd...g...','..lg...gd..lg...','...lgg.gd.gl....',
  '....dgggdgg.....','......dgd.......','.......gd.......','.......dd.......',
 ],
};
export const PLANT_COLORS:Record<PlantKind,Record<string,number>>={
 grass:{d:0x39682d,g:0x5e9a39,l:0x86b952},
 red:{d:0x38692d,g:0x57953a,l:0x83b74b,r:0xa72d27,R:0xdf4938,P:0xf3784b},
 yellow:{d:0x3b6c2d,g:0x5a9638,l:0x86b74a,y:0xc99429,Y:0xf0ca42,p:0xffe979},
};
