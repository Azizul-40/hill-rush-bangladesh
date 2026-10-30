// Pure-pursuit bot on the new 3D physics (Node, no graphics). Honest: a bot is not a human balance proof.
import * as T from '../3d/track3d.js';
export function run(level,map,veh,opts={}){
  const tr=T.makeTrack(level,map,veh), S=T.makeState(tr,6); const dt=1/60;
  let t=0, ev=[], cpS=6;
  while(!S.crashed && t<400){
    const look=Math.min(tr.N-2, S.s+10+Math.abs(S.vf)*.6), p=tr.at(look);
    const dx=p.x-S.x, dz=p.z-S.z; let a=Math.atan2(dz,dx)-S.psi; a=Math.atan2(Math.sin(a),Math.cos(a));
    const g=tr.gaps.find(g=>S.s>g.s0-30&&S.s<g.s0+g.w+2);
    const inp={gas:true,left:a<-.04,right:a>.04,boost:!!g&&S.s>g.s0-14&&S.s<g.s0+1&&S.boostE>10,brake:false,tiltBack:false,tiltFwd:false};
    if(!S.grounded){ inp.tiltFwd = S.pitch>.2; inp.tiltBack = S.pitch<-.2; }
    // slow before sharp turn / slope
    const i0=Math.floor(S.s), curv=Math.abs(tr.cpsi[Math.min(tr.N,i0+25)]-tr.cpsi[i0])/25;
    const vt=g?99:Math.max(7,Math.sqrt(4.5/Math.max(curv,1e-4)));
    if(S.vf>vt){inp.gas=false; inp.brake=S.vf>vt+3;}
    T.step(tr,S,inp,dt); t+=dt;
    for(const e of T.collect(tr,S)){ if(e.type==='finish') return {ok:true,t,S,tr}; }
  }
  return {ok:false,t,S,tr,reason:S.reason};
}
if(process.argv[1].endsWith('track3d_bot.js')){
  const lv=process.argv[2]?[+process.argv[2]]:[1,10,40];
  let pass=0,tot=0;
  for(const L of lv)for(let m=0;m<5;m++)for(let v=0;v<4;v++){ const r=run(L,m,v); tot++; if(r.ok)pass++; else console.log(`FAIL L${L} m${m} v${v}: ${r.reason} s=${r.S.s}/${r.tr.L} t=${r.t.toFixed(0)} lat=${r.S.lat.toFixed(1)}`); }
  console.log(pass+'/'+tot);
}
