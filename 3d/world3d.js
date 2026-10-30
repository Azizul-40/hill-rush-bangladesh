// Hill Rush Bangladesh 3D — দুনিয়া: আকাশ, পাহাড়, রাস্তা, গাছ, বাড়ি, হ্রদ, কয়েন ইত্যাদি (সব কোডে বানানো)।
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ম্যাপ-অনুযায়ী পরিবেশ
export const THEMES = {
  sajek:        { zenith:0x3d86d6, horizon:0xd6e8f2, fog:0xcfe0ea, fogD:.0105, sun:[.55,.62,.35], sunC:0xfff0d0, sunI:2.6, hemiSky:0xbfdcff, hemiGnd:0x4d6b3a, grass:[.30,.55,.20], grass2:[.22,.45,.15], soil:0x8a6a4a, road:"dirt", trees:"broad", cloudSea:.8 },
  sylhet:       { zenith:0x4aa2e4, horizon:0xdcf0ea, fog:0xd2eae3, fogD:.0100, sun:[.45,.70,.30], sunC:0xfff4dc, sunI:2.8, hemiSky:0xc6e6ff, hemiGnd:0x3d7a2e, grass:[.26,.62,.18], grass2:[.18,.50,.13], soil:0x8b6a4a, road:"dirt", trees:"broad", tea:true, cloudSea:.2 },
  bandarban:    { zenith:0x5a8db8, horizon:0xdde6ea, fog:0xd0dbe0, fogD:.0150, sun:[.35,.55,.55], sunC:0xffe8c0, sunI:2.2, hemiSky:0xb8d0e8, hemiGnd:0x35523a, grass:[.22,.45,.22], grass2:[.15,.36,.17], soil:0x7a5a40, road:"dirt", trees:"pine", stupa:true, cloudSea:.9 },
  kaptai:       { zenith:0x2f6db0, horizon:0xffd9a0, fog:0xf0d6b0, fogD:.0105, sun:[-.55,.28,.45], sunC:0xffb870, sunI:3.0, hemiSky:0xffe0b8, hemiGnd:0x4a6a3a, grass:[.30,.52,.22], grass2:[.22,.42,.16], soil:0x8a6244, road:"dirt", trees:"broad", lake:true, cloudSea:.1 },
  khagrachhari: { zenith:0x4b97d6, horizon:0xeadcc0, fog:0xe0d8c0, fogD:.0105, sun:[.5,.64,.40], sunC:0xffeed0, sunI:2.7, hemiSky:0xc8dcf0, hemiGnd:0x6a5030, grass:[.34,.52,.20], grass2:[.26,.42,.14], soil:0x9a6040, road:"dirt", trees:"bamboo", stilt:true, cloudSea:.3 },
};

// ---------- সংখ্যা/নয়েজ ----------
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const hash = (x,z)=>{ const s=Math.sin(x*127.1+z*311.7)*43758.5453; return s-Math.floor(s); };
function vnoise(x,z){ const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi; const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  return (hash(xi,zi)*(1-u)+hash(xi+1,zi)*u)*(1-v)+(hash(xi,zi+1)*(1-u)+hash(xi+1,zi+1)*u)*v; }
function fbm(x,z,o=4){ let a=.5,f=1,s=0; for(let i=0;i<o;i++){ s+=a*vnoise(x*f,z*f); f*=2.03; a*=.5; } return s; }
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };

// ---------- টেক্সচার (canvas-এ আঁকা) ----------
function canvasTex(w,h,draw,repeat){ const c=document.createElement("canvas"); c.width=w; c.height=h; draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; if(repeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; } return t; }
function noiseTex(base=215,amp=40,size=256){
  return canvasTex(size,size,(g,w,h)=>{ const id=g.createImageData(w,h); for(let i=0;i<w*h;i++){ const n=vnoise((i%w)*.08,(i/w|0)*.08)*.6+Math.random()*.4; const v=base+(n-.5)*amp*2; id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v; id.data[i*4+3]=255; } g.putImageData(id,0,0);
    for(let k=0;k<260;k++){ g.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},0,.025)`; g.beginPath(); g.arc(Math.random()*w,Math.random()*h,Math.random()*6+1,0,6.3); g.fill(); } },true);
}
function roadTex(kind){
  return canvasTex(512,256,(g,w,h)=>{
    // মাটির রাস্তা: লালচে-বাদামি, চাকার দাগ (rut), নুড়ি, ভেজা দাগ
    g.fillStyle="#8c6040"; g.fillRect(0,0,w,h);
    const id=g.getImageData(0,0,w,h); for(let i=0;i<w*h;i++){ const x=i%w,y=i/w|0; const n=(vnoise(x*.05,y*.05)-.5)*46+(vnoise(x*.2,y*.2)-.5)*28+(Math.random()-.5)*20; id.data[i*4]+=n; id.data[i*4+1]+=n*.85; id.data[i*4+2]+=n*.7; } g.putImageData(id,0,0);
    // মাঝখানে ঘাসের ফিতা ও চাকার খাঁজ
    // হালকা, নরম খাঁজ (আগের কড়া ডোরা "গ্যাপ"-এর মতো দেখাত)
    for(const cy of [.30,.72]){ const gr=g.createLinearGradient(0,h*(cy-.09),0,h*(cy+.09)); gr.addColorStop(0,"rgba(50,30,18,0)"); gr.addColorStop(.5,"rgba(50,30,18,.16)"); gr.addColorStop(1,"rgba(50,30,18,0)"); g.fillStyle=gr; g.fillRect(0,h*(cy-.09),w,h*.18); }
    for(let i=0;i<7;i++){ g.fillStyle="rgba(60,40,30,.35)"; g.beginPath(); g.ellipse(Math.random()*w,h*(.2+Math.random()*.6),18+Math.random()*30,6+Math.random()*7,0,0,6.3); g.fill(); g.fillStyle="rgba(120,160,190,.18)"; g.beginPath(); g.ellipse(Math.random()*w,h*(.25+Math.random()*.5),10+Math.random()*16,3+Math.random()*4,0,0,6.3); g.fill(); }
    for(let i=0;i<420;i++){ const v=90+Math.random()*100; g.fillStyle=`rgba(${v},${v*.85},${v*.7},.6)`; g.beginPath(); g.arc(Math.random()*w,Math.random()*h,Math.random()*2.4+.6,0,6.3); g.fill(); }
  },true);
}
function softCircleTex(){ return canvasTex(64,64,(g)=>{ const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,"rgba(255,255,255,.9)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle=gr; g.fillRect(0,0,64,64); }); }
function cloudTex(){ return canvasTex(256,128,(g)=>{ for(let i=0;i<46;i++){ const x=40+Math.random()*176,y=44+Math.random()*40-(Math.abs(x-128)/6),r=14+Math.random()*26; const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,"rgba(255,255,255,.55)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.3); g.fill(); } }); }

// ---------- আকাশ ----------
function makeSky(theme){
  const geo=new THREE.SphereGeometry(900,32,16);
  const m=new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{ top:{value:new THREE.Color(theme.zenith)}, hor:{value:new THREE.Color(theme.horizon)}, sunDir:{value:new THREE.Vector3(...theme.sun).normalize()}, sunC:{value:new THREE.Color(theme.sunC)} },
    vertexShader:`varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader:`varying vec3 vP; uniform vec3 top,hor,sunC,sunDir;
      void main(){ float h=clamp(vP.y,-.2,1.); vec3 c=mix(hor,top,pow(max(h,0.),.55));
        float sd=max(dot(normalize(vP),sunDir),0.); c+=sunC*(pow(sd,900.)*3.0+pow(sd,40.)*.45+pow(sd,6.)*.12);
        c=mix(c,hor,smoothstep(.12,-.2,vP.y)); gl_FragColor=vec4(c,1.); }` });
  const mesh=new THREE.Mesh(geo,m); mesh.renderOrder=-10; return mesh;
}

// ---------- ঘন-জ্যামিতি জোড়া দেওয়া (instancing-এর জন্য) ----------
function paintGeo(g,hex){ g=g.index?g.toNonIndexed():g; const c=new THREE.Color(hex), n=g.attributes.position.count, a=new Float32Array(n*3); for(let i=0;i<n;i++){ a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b; } g.setAttribute('color',new THREE.BufferAttribute(a,3)); if(g.attributes.uv) g.deleteAttribute('uv'); return g; }
function merged(parts){ return mergeGeometries(parts.map(([g,hex,x=0,y=0,z=0,rx=0,rz=0])=>{ const gg=paintGeo(g.clone(),hex); const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new THREE.Vector3(1,1,1)); gg.applyMatrix4(m); return gg; })); }
const vcMat = (o={}) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors:true, roughness:.85, metalness:0, flatShading:false }, o));

function treeGeo(kind){
  const I=(r,d=1)=>new THREE.IcosahedronGeometry(r,d), C=(rt,rb,h,s=7)=>new THREE.CylinderGeometry(rt,rb,h,s), K=(r,h,s=8)=>new THREE.ConeGeometry(r,h,s);
  if(kind==="pine") return merged([[C(.22,.34,3.2),0x4a3322,0,1.6,0],[K(2.3,3.2),0x1f4d2b,0,4.0,0],[K(1.8,2.8),0x25592f,0,5.7,0],[K(1.3,2.4),0x2a6334,0,7.3,0],[K(.8,1.8),0x2f6e3a,0,8.8,0]]);
  if(kind==="bamboo"){ const parts=[]; for(let i=0;i<9;i++){ const a=i/9*6.28, r=.5+hash(i,3)*.6, h=8+hash(i,7)*5; parts.push([C(.07,.1,h,6),i%3?0x8aa83a:0xa9b84a,Math.cos(a)*r,h/2,Math.sin(a)*r,Math.sin(a)*.12,-Math.cos(a)*.12]); parts.push([K(.9,1.6,6),0x6f9a2c,Math.cos(a)*r*1.2,h-.3,Math.sin(a)*r*1.2]); } return merged(parts); }
  if(kind==="tea") return merged([[I(.62,1),0x3f9b2c,0,.35,0],[I(.5,1),0x4cae33,.3,.3,.15]]);
  return merged([[C(.26,.4,3.4),0x56402c,0,1.7,0],[I(2.2),0x2f7d2e,0,4.6,0],[I(1.7),0x3c8c35,1.1,3.9,.5],[I(1.6),0x2a7229,-1.1,4.0,-.4],[I(1.3),0x4a9a3c,.2,6.0,.2]]);
}
function scatter(geo, mat, matrices, cast=true){
  const im=new THREE.InstancedMesh(geo, mat, matrices.length); im.castShadow=cast; im.receiveShadow=true;
  matrices.forEach((m,i)=>im.setMatrixAt(i,m)); im.instanceMatrix.needsUpdate=true; im.frustumCulled=false; return im;
}
const _m=new THREE.Matrix4(), _q=new THREE.Quaternion(), _e=new THREE.Euler();
const mkM=(x,y,z,sx,sy,sz,ry=0,rz=0)=>{ _e.set(0,ry,rz); _q.setFromEuler(_e); return _m.clone().compose(new THREE.Vector3(x,y,z),_q,new THREE.Vector3(sx,sy,sz)); };


// ================================================================
// মূল: দুনিয়া তৈরি (tr = makeTrack(...) এর ফল)
// ================================================================
const CELLQ = (nx,nz)=>nx*nz;
export function buildWorld(tr, mapId){
  const th = THEMES[mapId] || THEMES.sajek;
  const R = rng(tr.mapIdx*1000+tr.level*7+13);
  const group = new THREE.Group();
  const { L, N, gaps, nx, nz, CELL, minX, minZ, field, cx, cz, cpsi, ch } = tr;
  const ROAD_HALF = 3.5;
  const sRGB=(r,g,b)=>new THREE.Color().setRGB(r,g,b,THREE.SRGBColorSpace);

  // রাস্তার সাপেক্ষে স্থান: s = দূরত্ব, off = পাশে (ডান = +)
  const P = (s,off)=>{ const p=tr.at(Math.max(0,Math.min(N-1,s))); const x=p.x-Math.sin(p.psi)*off, z=p.z+Math.cos(p.psi)*off; return { x, z, y:tr.hAt(x,z), psi:p.psi, h:p.h }; };
  const gapNear=(s,a=6,b=6)=>gaps.some(g=>s>g.s0-a-tr.RAMP&&s<g.s0+g.w+b+tr.LAND*0.5);
  const sA=(tr.sideSign(L*.5)); // কোন পাশে পাহাড় বেশি
  const hillSide = sA>=0 ? 1 : -1;  // +1 = ডান পাশে পাহাড়

  // ---- টেরেইন মেশ ----
  const pos=new Float32Array(nx*nz*3), col=new Float32Array(nx*nz*3), uv=new Float32Array(nx*nz*2), near=new Uint8Array(nx*nz);
  const gA=sRGB(...th.grass), gB=sRGB(...th.grass2), rock=sRGB(.42,.40,.38), soil=new THREE.Color(th.soil), dark=sRGB(.15,.12,.10), sand=sRGB(.55,.5,.38);
  const lakeY = th.lake ? (Math.min(...Array.from(ch).slice(0,N))-5) : -9999;
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const k=j*nx+i; const x=minX+i*CELL, z=minZ+j*CELL; pos[k*3]=x; pos[k*3+1]=field[k]; pos[k*3+2]=z; uv[k*2]=x*.07; uv[k*2+1]=z*.07;
    near[k]=(tr.nodeIdx[k]>=0 && tr.nodeD[k]<110)?1:0; }
  const idx=[];
  for(let j=0;j<nz-1;j++) for(let i=0;i<nx-1;i++){ const a=j*nx+i, b=a+1, c=a+nx+1, d=a+nx; if(!(near[a]||near[b]||near[c]||near[d])) continue; idx.push(a,c,b, a,d,c); }   // physics: কর্ণ (i,j)-(i+1,j+1)
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
  const nrm=geo.attributes.normal;
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const k=j*nx+i; if(!near[k]){ col[k*3]=gA.r; col[k*3+1]=gA.g; col[k*3+2]=gA.b; continue; }
    const x=pos[k*3], y=pos[k*3+1], z=pos[k*3+2], ny=nrm.getY(k);
    const n=tr.nodeIdx[k]; const tx=Math.cos(cpsi[n]), tz=Math.sin(cpsi[n]); const lat=(x-cx[n])*(-tz)+(z-cz[n])*tx, ad=Math.abs(lat);
    const c=new THREE.Color().copy(gA).lerp(gB, fbm(x*.07,z*.07,3));
    const steep=smooth((0.86-ny)/.28); c.lerp(rock, steep*.85);
    c.lerp(soil, (1-smooth((ad-ROAD_HALF)/3.0))*.92);
    const dN=tr.nodeD[k]; if(tr.inGapS(n) && dN<40) c.lerp(dark, .65*(1-smooth((dN-18)/22)) + steep*.2);
    if(th.lake && y<lakeY+2.5) c.lerp(sand, smooth((lakeY+2.5-y)/2.5));
    c.multiplyScalar(.88+fbm(x*.4,z*.4,2)*.24); col[k*3]=c.r; col[k*3+1]=c.g; col[k*3+2]=c.b; }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const terrain=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({ vertexColors:true, map:noiseTex(190,34), roughness:.95, metalness:0 }));
  terrain.receiveShadow=true; terrain.frustumCulled=false; group.add(terrain);

  // ---- মাটির রাস্তা (গ্যাপে ভাঙা) ----
  const rp=[],ru=[],ri=[]; let vi=0;
  const inGapExact=s=>gaps.some(g=>s>=g.s0&&s<=g.s0+g.w);
  const segs=[]; { let a=0; const cuts=[]; gaps.forEach(g=>cuts.push([g.s0,g.s0+g.w])); cuts.sort((p,q)=>p[0]-q[0]); for(const [c0,c1] of cuts){ segs.push([a,c0]); a=c1; } segs.push([a,N-2]); }
  const rowAt=(s)=>{ const p=tr.at(s); return [[p.x+Math.sin(p.psi)*ROAD_HALF, p.h+.05, p.z-Math.cos(p.psi)*ROAD_HALF],[p.x-Math.sin(p.psi)*ROAD_HALF, p.h+.05, p.z+Math.cos(p.psi)*ROAD_HALF]]; };
  for(const [a,b] of segs){ const n=Math.max(1,Math.ceil((b-a)/1)); for(let i=0;i<n;i++){ const s0=a+(b-a)*i/n, s1=a+(b-a)*(i+1)/n; const r0=rowAt(s0), r1=rowAt(s1);
      // বাঁ(-off) প্রথমে, ডান(+off) পরে — r[0] = বাঁ দিক
      for(const [r,s] of [[r0,s0],[r1,s1]]){ rp.push(...r[0],...r[1]); ru.push(s/8,0, s/8,1); }
      ri.push(vi,vi+1,vi+2, vi+1,vi+3,vi+2); vi+=4; } }
  const rgeo=new THREE.BufferGeometry(); rgeo.setAttribute('position',new THREE.Float32BufferAttribute(rp,3)); rgeo.setAttribute('uv',new THREE.Float32BufferAttribute(ru,2)); rgeo.setIndex(ri); rgeo.computeVertexNormals();
  // উপরমুখী নিশ্চিত করা
  { const nn=rgeo.attributes.normal; if(nn.count && nn.getY(0)<0){ const ix=rgeo.index.array; for(let q=0;q<ix.length;q+=3){ const t=ix[q+1]; ix[q+1]=ix[q+2]; ix[q+2]=t; } rgeo.computeVertexNormals(); } }
  const rt=roadTex(th.road);
  const road=new THREE.Mesh(rgeo,new THREE.MeshStandardMaterial({ map:rt, roughness:1, metalness:0, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 })); road.receiveShadow=true; road.frustumCulled=false; group.add(road);

  // ---- দূরের পাহাড়ের বলয় (ক্যামেরার সাথে ঘোরে) ----
  const ridges=[]; [[430,120,.60],[560,170,.42],[700,230,.30]].forEach(([rad,hmax,mix],li)=>{
    const n=160, p=[],c=[],ix=[]; const base=new THREE.Color(th.fog).lerp(new THREE.Color().setRGB(.20,.38,.35,THREE.SRGBColorSpace),mix);
    for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2, h=hmax*(.30+.9*fbm(Math.cos(a)*3+li*9, Math.sin(a)*3+li*3.3,4)); const cc=base.clone().multiplyScalar(.92+fbm(a*5,li,2)*.2);
      p.push(Math.cos(a)*rad,-60,Math.sin(a)*rad, Math.cos(a)*rad,h-30,Math.sin(a)*rad); c.push(cc.r*.8,cc.g*.8,cc.b*.8, cc.r,cc.g,cc.b); if(i<n){ const q=i*2; ix.push(q,q+1,q+2, q+1,q+3,q+2); } }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(c,3)); g.setIndex(ix);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})); m.frustumCulled=false; ridges.push(m); group.add(m); });

  // ---- গাছ/ঝোপ/পাথর ----
  const treeMat=vcMat();
  const placeRand=(count,offMin,offMax,sideOnly=0)=>{ const out=[]; for(let q=0;q<count;q++){ const s=R()*(N-10); let off=offMin+R()*(offMax-offMin); if(sideOnly) off=Math.abs(off)*sideOnly; if(Math.abs(off)<8.5) continue; if(gapNear(s,10,10)) continue; const p=P(s,off); if(p.y<-90) continue; if(th.lake && p.y<lakeY+1.2) continue; out.push([p.x,p.z,p.y]); } return out; };
  const nTrees=Math.round((L+160)*3.0);
  const kind=th.trees;
  const mk=(arr,sMin,sMax)=>arr.map(([x,z,y])=>{ const s=sMin+R()*(sMax-sMin); return mkM(x,y-.1,z,s,s*(.9+R()*.3),s,R()*6.28); });
  group.add(scatter(treeGeo(kind),treeMat,[...mk(placeRand(nTrees,-70,70),.9,1.9)]));
  if(kind!=="broad") group.add(scatter(treeGeo("broad"),treeMat,mk(placeRand(Math.round(nTrees*.25),-60,60),.8,1.5)));
  const bushGeo=merged([[new THREE.IcosahedronGeometry(.9,1),0x3d8a30,0,.4,0],[new THREE.IcosahedronGeometry(.7,1),0x4aa03a,.6,.3,.2]]);
  group.add(scatter(bushGeo,treeMat,placeRand(Math.round(nTrees*.9),-30,30).map(([x,z,y])=>{ const s=.5+R()*1.0; return mkM(x,y,z,s,s*.8,s,R()*6); }),false));
  const rockGeo=paintGeo(new THREE.DodecahedronGeometry(1,0),0x7a7772);
  group.add(scatter(rockGeo,vcMat({roughness:1,flatShading:true}),placeRand(Math.round(nTrees*.4),-26,26).map(([x,z,y])=>{ const s=.4+R()*1.3; return mkM(x,y+s*.25,z,s*1.2,s*.8,s,R()*6,R()*.4); })));

  // ---- চা-বাগান ----
  if(th.tea){ const tm=[]; for(let row=0;row<8;row++){ const off=hillSide*(9+row*2.6); for(let s=8;s<N-8;s+=1.4){ if(gapNear(s,10,10)) continue; const p=P(s,off); const p2=P(s+1.5,off); if(Math.abs(p2.y-p.y)>1.4) continue; tm.push(mkM(p.x+(R()-.5)*.3,p.y+.1,p.z,1.2,.9,1.2,R()*6)); } }
    group.add(scatter(treeGeo("tea"),treeMat,tm,false)); }

  // ---- সাইন: বাঁকের তীর + খাদ ----
  const signTex=canvasTex(128,128,(g)=>{ g.fillStyle="#f2c230"; g.fillRect(0,0,128,128); g.strokeStyle="#111"; g.lineWidth=8; g.strokeRect(6,6,116,116); g.fillStyle="#111"; g.beginPath(); g.moveTo(38,92); g.lineTo(38,50); g.lineTo(78,50); g.lineTo(78,36); g.lineTo(98,62); g.lineTo(78,88); g.lineTo(78,72); g.lineTo(58,72); g.lineTo(58,92); g.closePath(); g.fill(); });
  const poleMat=new THREE.MeshStandardMaterial({color:0x666a6e});
  const oriented=(s,off,yOff=0)=>{ const p=P(s,off); const g=new THREE.Group(); g.position.set(p.x,p.y+yOff,p.z); g.rotation.y=-p.psi; group.add(g); return g; };
  for(let s=50;s<L-10;s+=90){ if(gapNear(s,16,10)) continue; const g=oriented(s,-(ROAD_HALF+1.3)); const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshStandardMaterial({map:signTex,roughness:.5,side:THREE.DoubleSide})); sg.rotation.y=-Math.PI/2; sg.position.y=2.7; sg.castShadow=true; g.add(sg); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.6,8),poleMat); pole.position.y=1.3; g.add(pole); }

  // ---- গ্যাপ (খাদ): সতর্ক-খুঁটি, সাইন, লিপের বেড়া, নিচের কুয়াশা, লাফের র‍্যাম্পের তীর ----
  { const stripeGeo=merged([0,1,2,3,4,5].map(i=>[new THREE.CylinderGeometry(.11,.11,.26,8),i%2?0xf2f2f2:0xff7a10,0,.13+i*.26,0])); const stripes=[];
    const warn=canvasTex(256,256,(g)=>{ g.fillStyle="#ffcf1f"; g.beginPath(); g.moveTo(128,10); g.lineTo(246,230); g.lineTo(10,230); g.closePath(); g.fill(); g.lineWidth=14; g.strokeStyle="#111"; g.stroke(); g.fillStyle="#111"; g.font="bold 70px 'Noto Sans Bengali','Siyam Rupali',Arial"; g.textAlign="center"; g.fillText("খাদ",128,204); g.fillRect(120,70,16,70); g.fillRect(120,150,16,16); });
    const hazard=canvasTex(256,64,(g)=>{ for(let i=-2;i<10;i++){ g.fillStyle=i%2?"#111":"#ffcf1f"; g.beginPath(); g.moveTo(i*40,64); g.lineTo(i*40+40,0); g.lineTo(i*40+80,0); g.lineTo(i*40+40,64); g.closePath(); g.fill(); } });
    const jumpTex=canvasTex(256,64,(g,w,h)=>{ g.fillStyle="#0b6b33"; g.fillRect(0,0,w,h); g.fillStyle="#fff"; g.font="bold 44px Arial"; g.textAlign="center"; g.textBaseline="middle"; g.fillText("SPEED UP & JUMP ▶",w/2,h/2+2); });
    const mistT=cloudTex(); tr.mist=[];
    for(const gp of gaps){ const gs=gp.s0, ge=gp.s0+gp.w;
      for(const s of [gs-.6, ge+.6]) for(const off of [-(ROAD_HALF+.25), ROAD_HALF+.25]){ const p=P(s,off); stripes.push(mkM(p.x,tr.roadH(s),p.z,1.2,1.2,1.2)); }
      for(const [ds,off] of [[-30,-(ROAD_HALF+1.6)],[-16,ROAD_HALF+1.6]]){ const g=oriented(gs+ds,off); const sg=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),new THREE.MeshStandardMaterial({map:warn,transparent:true,side:THREE.DoubleSide,roughness:.5})); sg.rotation.y=-Math.PI/2; sg.position.y=3.2; sg.castShadow=true; g.add(sg); const pl=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3,8),poleMat); pl.position.y=1.5; g.add(pl); }
      { const g=oriented(gs-.2,0); g.position.y=tr.roadH(gs)+.5; const bar=new THREE.Mesh(new THREE.BoxGeometry(.12,.5,ROAD_HALF*2+.6),new THREE.MeshStandardMaterial({map:hazard,roughness:.6})); g.add(bar); }
      { const g=oriented(gs-tr.RAMP*.55,-(ROAD_HALF+1.0)); const b=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.05),new THREE.MeshBasicMaterial({map:jumpTex,side:THREE.DoubleSide})); b.rotation.y=-Math.PI/2; b.position.y=1.2; g.add(b); const pl=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.2,6),poleMat); pl.position.y=.6; g.add(pl); }
      for(let k=0;k<5;k++){ const mid=P(gs+gp.w/2,(k-2)*5); const m=new THREE.Sprite(new THREE.SpriteMaterial({map:mistT,transparent:true,opacity:.55,depthWrite:false})); m.scale.set(26,10,1); m.position.set(mid.x,tr.gapFloor.get(gp)+4+k*.8,mid.z); group.add(m); }
    }
    group.add(scatter(stripeGeo,vcMat({roughness:.5}),stripes,false)); }

  // ---- বাড়িঘর ----
  const houseMat=vcMat({roughness:.75});
  const tin=[0x8b9aa5,0x9aa7b0,0xb4552d], wall=[0xd9bd8c,0x9db8d8,0xe2d3b0,0xc9a778];
  function cottage(){ const w=wall[R()*wall.length|0], t=tin[R()*tin.length|0]; return merged([[new THREE.BoxGeometry(4.4,3.6,3.6),0x7a756c,0,-.9,0],[new THREE.BoxGeometry(4.2,2.4,3.4),w,0,1.2,0],[new THREE.ConeGeometry(3.6,1.6,4),t,0,3.2,0,0,0],[new THREE.BoxGeometry(.8,1.4,.1),0x5a3d28,0,.7,1.72]]); }
  const placeHouses=(n,geoFn,offMin,offMax)=>{ for(let q=0;q<n;q++){ for(let tryN=0;tryN<4;tryN++){ const s=16+R()*(L-20); const off=(R()<.5?-1:1)*(offMin+R()*(offMax-offMin)); if(gapNear(s,10,10)) continue; const p=P(s,off); const hs=[P(s,off+2.5).y,P(s,off-2.5).y,P(s+2.5,off).y,P(s-2.5,off).y]; if(Math.max(...hs)-Math.min(...hs)>1.8||p.y<-90) continue; if(th.lake&&p.y<lakeY+1.5) continue;
        group.add(scatter(geoFn(),houseMat,[mkM(p.x,Math.min(p.y,...hs)+.1,p.z,1,1,1,-p.psi+(R()-.5)*.6)])); break; } } };
  if(mapId==="sajek") placeHouses(Math.round(L/16),cottage,10,36);
  if(mapId==="sylhet") placeHouses(Math.round(L/40),cottage,14,38);
  if(th.stilt){ const stilt=()=>merged([[new THREE.BoxGeometry(4,.2,3.4),0x7a5a3a,0,2.0,0],[new THREE.BoxGeometry(3.8,2.0,3.2),0xb89a62,0,3.1,0],[new THREE.ConeGeometry(3.5,1.7,4),0xc9b36a,0,5.0,0,0,0],[new THREE.CylinderGeometry(.1,.1,3.0,6),0x6b4a2a,-1.8,.5,-1.5],[new THREE.CylinderGeometry(.1,.1,3.0,6),0x6b4a2a,1.8,.5,-1.5],[new THREE.CylinderGeometry(.1,.1,3.0,6),0x6b4a2a,-1.8,.5,1.5],[new THREE.CylinderGeometry(.1,.1,3.0,6),0x6b4a2a,1.8,.5,1.5]]); placeHouses(Math.round(L/18),stilt,10,34); }
  if(th.stupa){ let best=null; for(const off of [hillSide*40,-hillSide*40,hillSide*55,-hillSide*55,hillSide*30]){ const p=P(L*.52,off); if(!best||Math.abs(p.y-p.h)<Math.abs(best.y-best.h)) best=p; }
    const gold=0xe3b43c; const g=merged([[new THREE.CylinderGeometry(7,8,1.4,24),0xe8e2d4,0,.7,0],[new THREE.CylinderGeometry(5.2,6,1.2,24),0xf2ecde,0,1.9,0],[new THREE.CylinderGeometry(3.4,4.6,3.2,24),gold,0,4.1,0],[new THREE.ConeGeometry(3.4,6,24),gold,0,8.7,0],[new THREE.CylinderGeometry(.18,.3,4,8),gold,0,13.6,0]]);
    const s=new THREE.Mesh(g,vcMat({roughness:.3,metalness:.7,emissive:0x3a2a00,emissiveIntensity:.35})); s.position.set(best.x,best.y-.4,best.z); s.castShadow=true; group.add(s); }

  // ---- হ্রদ, নৌকা, ঝুলন্ত সেতু ----
  const animated=[]; let water=null;
  if(th.lake){
    let cxm=0,czm=0; for(let i=0;i<N;i+=10){ cxm+=cx[i]; czm+=cz[i]; } cxm/=Math.ceil(N/10); czm/=Math.ceil(N/10);
    water=new THREE.Mesh(new THREE.PlaneGeometry(3600,3600,1,1),new THREE.MeshPhysicalMaterial({color:0x1f7fa6,roughness:.08,metalness:.1,clearcoat:1,transparent:true,opacity:.92,envMapIntensity:1.8}));
    water.rotation.x=-Math.PI/2; water.position.set(cxm,lakeY,czm); group.add(water);
    let nb=0; for(let q=0;q<200&&nb<5;q++){ const s=20+R()*(L-30), off=(R()<.5?-1:1)*(18+R()*60); const p=P(s,off); if(p.y>lakeY-1.5) continue;
      const b=new THREE.Group(); const hull=new THREE.Mesh(new THREE.BoxGeometry(4.6,.5,1.2),new THREE.MeshStandardMaterial({color:[0x9a5a2a,0x2a6a9a,0xb03a2a,0x4a8a3a,0x7a4a8a][nb],roughness:.7})); hull.position.y=.25; b.add(hull);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,1.4),new THREE.MeshStandardMaterial({color:0x2d3a44})); roof.position.set(-.3,1.3,0); b.add(roof); for(const x of [-1.2,.6]) for(const z of [-.55,.55]){ const pp=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.1,5),new THREE.MeshStandardMaterial({color:0x444})); pp.position.set(x,.8,z); b.add(pp); }
      b.position.set(p.x,lakeY+.05,p.z); b.rotation.y=R()*6.28; group.add(b); animated.push({o:b,t:"boat",ph:R()*6,y0:b.position.y}); nb++; }
    // ঝুলন্ত সেতু (জলের ওপর, রাস্তার পাশে দূরে)
    { let spot=null; for(const off of [-1,1]) for(const d of [90,120,160,200]){ const q=P(L*.35,off*d); if(q.y<lakeY-2){ const q2=P(L*.35+0,off*d); spot=q2; spot.psi=q.psi; break; } if(spot) break; }
      if(spot){ const by=lakeY+15, len=170, steel=new THREE.MeshStandardMaterial({color:0xcfd4d8,metalness:.8,roughness:.35}); const bg=new THREE.Group(); bg.position.set(spot.x,0,spot.z); bg.rotation.y=-spot.psi; group.add(bg); const x0=-len/2,x1=len/2;
        const deck=new THREE.Mesh(new THREE.BoxGeometry(len,.7,5),new THREE.MeshStandardMaterial({color:0x6b7077,roughness:.8})); deck.position.set(0,by,0); bg.add(deck);
        for(const x of [x0,x1]){ for(const z of [-2.4,2.4]){ const t=new THREE.Mesh(new THREE.BoxGeometry(1.1,by-lakeY+26,1.1),steel); t.position.set(x,(by+26+lakeY)/2,z); t.castShadow=true; bg.add(t); } const top=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.0,6),steel); top.position.set(x,by+25,0); bg.add(top); }
        for(const z of [-2.4,2.4]){ const pts=[]; for(let i=0;i<=40;i++){ const t=i/40, x=x0+(x1-x0)*t, sag=Math.pow(2*t-1,2); pts.push(new THREE.Vector3(x,by+25-23*(1-sag),z)); } bg.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.18,6),steel)); for(let i=1;i<40;i++){ const p=pts[i]; const h=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,p.y-by,4),steel); h.position.set(p.x,(p.y+by)/2,z); bg.add(h); } } } }
  }

  // ---- মেঘ ও "মেঘের সমুদ্র" ----
  const cTex=cloudTex(), clouds=[];
  for(let i=0;i<16;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.85,depthWrite:false,fog:false})); const w=120+R()*140; s.scale.set(w,w*.45,1); const a=R()*6.28, r=420+R()*160; s.userData={a,r,hy:110+R()*70}; clouds.push(s); group.add(s); }
  const seaN=Math.round(th.cloudSea*Math.max(30,L/8));
  for(let i=0;i<seaN;i++){ const s=R()*N, off=-hillSide*(20+R()*110); const p=P(s,off); const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.55+R()*.2,depthWrite:false,color:0xffffff})); const w=70+R()*90; sp.scale.set(w,w*.4,1); sp.position.set(p.x,tr.roadH(s)-14+R()*8,p.z); group.add(sp); }

  // ---- ফিনিশ গেট, চেকপয়েন্ট ----
  const checker=canvasTex(256,64,(g)=>{ for(let i=0;i<16;i++) for(let j=0;j<4;j++){ g.fillStyle=(i+j)%2?"#111":"#fff"; g.fillRect(i*16,j*16,16,16); } });
  { const g=oriented(L,0); const gw=ROAD_HALF+.5;
    const banner=new THREE.Mesh(new THREE.BoxGeometry(.4,1.6,gw*2),new THREE.MeshStandardMaterial({map:checker})); banner.position.y=6.4; g.add(banner);
    for(const z of [-gw,gw]){ const p=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,7.2,10),new THREE.MeshStandardMaterial({color:0xdfe3e6,metalness:.5,roughness:.4})); p.position.set(0,3.6,z); p.castShadow=true; g.add(p); }
    const finText=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),new THREE.MeshBasicMaterial({map:canvasTex(512,128,(c,w,h)=>{ c.fillStyle="#0b6b33"; c.fillRect(0,0,w,h); c.fillStyle="#fff"; c.font="bold 78px Arial"; c.textAlign="center"; c.textBaseline="middle"; c.fillText("FINISH",w/2,h/2+4); c.fillStyle="#d4202a"; c.beginPath(); c.arc(60,h/2,22,0,6.3); c.fill(); }),side:THREE.DoubleSide})); finText.position.set(-.25,8.3,0); finText.rotation.y=-Math.PI/2; g.add(finText); }
  const cpFlags=tr.cps.map(cp=>{ const g=oriented(cp.s,ROAD_HALF+.9); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,5,8),new THREE.MeshStandardMaterial({color:0x333})); pole.position.y=2.5; g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.2,6,1),new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.7})); flag.position.set(0,4.2,-1.05); flag.rotation.y=Math.PI/2; g.add(flag); return {g,flag,cp}; });

  // ---- কয়েন ও ফুয়েল ক্যান ----
  const coinGeo=new THREE.CylinderGeometry(.55,.55,.14,28); coinGeo.rotateX(Math.PI/2);
  const coinMesh=new THREE.InstancedMesh(coinGeo,new THREE.MeshStandardMaterial({color:0xffc830,metalness:1,roughness:.28,emissive:0x5a3a00,emissiveIntensity:.5}),Math.max(1,tr.coins.length)); coinMesh.castShadow=true; coinMesh.frustumCulled=false; group.add(coinMesh);
  const canGeo=merged([[new THREE.BoxGeometry(.9,1.1,.5),0xd02a24,0,0,0],[new THREE.BoxGeometry(.4,.2,.3),0x222,.15,.65,0],[new THREE.BoxGeometry(.5,.5,.52),0xf2f2f2,0,.0,0]]);
  const canMesh=new THREE.InstancedMesh(canGeo,vcMat({roughness:.5,metalness:.2,emissive:0x330000,emissiveIntensity:.25}),Math.max(1,tr.cans.length)); canMesh.castShadow=true; canMesh.frustumCulled=false; group.add(canMesh);

  // ---- আলো ----
  const sunDir=new THREE.Vector3(...th.sun).normalize();
  const hemi=new THREE.HemisphereLight(th.hemiSky,th.hemiGnd,.95); group.add(hemi);
  const sun=new THREE.DirectionalLight(th.sunC,th.sunI); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=-52; sc.right=52; sc.top=52; sc.bottom=-52; sc.near=1; sc.far=320; sun.shadow.bias=-.0004; sun.shadow.normalBias=.05;
  group.add(sun); group.add(sun.target);

  const sky=makeSky(th);

  async function applyExternalTextures(){
    const load=async(name,srgb,rep)=>{ try{ const h=await fetch(`./3d/textures/${name}`,{method:"HEAD"}); if(!h.ok) return null; const t=await new THREE.TextureLoader().loadAsync(`./3d/textures/${name}`); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; if(srgb) t.colorSpace=THREE.SRGBColorSpace; if(rep) t.repeat.set(...rep); return t; }catch(e){ return null; } };
    const rc=await load("road_color.jpg",true,[1,1]), rn=await load("road_normal.jpg",false,[1,1]);
    if(rc){ road.material.map=rc; road.material.color.set(0xffffff); } if(rn){ rn.repeat.copy(road.material.map?road.material.map.repeat:new THREE.Vector2(1,1)); road.material.normalMap=rn; }
    const gc=await load("ground_color.jpg",true,[1,1]), gn=await load("ground_normal.jpg",false,[1,1]);
    if(gc){ gc.repeat.set(.9,.9); terrain.material.map=gc; } if(gn){ gn.repeat.set(.9,.9); terrain.material.normalMap=gn; }
    road.material.needsUpdate=true; terrain.material.needsUpdate=true; return !!(rc||gc);
  }
  const _v=new THREE.Vector3(), _sc=new THREE.Vector3(1,1,1);
  function update(camPos, S, t){
    sky.position.copy(camPos);
    sun.position.set(S.x+sunDir.x*140,S.y+sunDir.y*140,S.z+sunDir.z*140); sun.target.position.set(S.x,S.y,S.z);
    ridges.forEach((m)=>{ m.position.set(camPos.x,0,camPos.z); });
    clouds.forEach((s)=>{ const u=s.userData; u.a+=.00008; s.position.set(camPos.x+Math.cos(u.a)*u.r,u.hy,camPos.z+Math.sin(u.a)*u.r); });
    for(const a of animated){ if(a.t==="boat"){ a.o.position.y=a.y0+Math.sin(t*1.2+a.ph)*.08; a.o.rotation.z=Math.sin(t*1.0+a.ph)*.03; } }
    let n=0; for(const c of tr.coins){ if(c.taken){ _m.makeScale(0,0,0); } else { _q.setFromEuler(_e.set(0,t*2.2+c.s,0)); _m.compose(_v.set(c.x,c.y+Math.sin(t*3+c.s)*.12,c.z),_q,_sc); } coinMesh.setMatrixAt(n++,_m); } coinMesh.instanceMatrix.needsUpdate=true; coinMesh.count=tr.coins.length||0;
    n=0; for(const c of tr.cans){ if(c.taken){ _m.makeScale(0,0,0); } else { _q.setFromEuler(_e.set(0,t*1.5,0)); _m.compose(_v.set(c.x,c.y+Math.sin(t*2+c.s)*.15,c.z),_q,_v.clone().set(1.3,1.3,1.3)); } canMesh.setMatrixAt(n++,_m); } canMesh.instanceMatrix.needsUpdate=true; canMesh.count=tr.cans.length||0;
    cpFlags.forEach(f=>{ f.flag.material.color.set(f.cp.hit?0x2ecc71:0xffffff); f.flag.rotation.y=Math.PI/2+Math.sin(t*3+f.cp.s)*.12; });
  }
  function dispose(){ group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){ const m=Array.isArray(o.material)?o.material:[o.material]; m.forEach(x=>{ if(x.map) x.map.dispose(); x.dispose(); }); } }); sun.shadow.map&&sun.shadow.map.dispose(); }
  return { group, sky, update, dispose, theme:th, sun, applyExternalTextures, road, terrain };
}
