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
    g.fillStyle="rgba(70,90,40,.35)"; g.fillRect(0,h*.44,w,h*.12);
    g.fillStyle="rgba(40,22,12,.38)"; g.fillRect(0,h*.22,w,h*.08); g.fillRect(0,h*.70,w,h*.08);
    g.fillStyle="rgba(190,150,110,.22)"; g.fillRect(0,h*.30,w,h*.04); g.fillRect(0,h*.78,w,h*.04);
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
// মূল: দুনিয়া তৈরি
// ================================================================
export function buildWorld(lv, mapId){
  const th = THEMES[mapId] || THEMES.sajek;
  const R = rng(lv.mapIdx*1000+lv.level*7+13);
  const group = new THREE.Group();
  const L = lv.L, X0 = -40, X1 = L + 120;

  // টেরেইনের উচ্চতা: রাস্তা (|z|<3.2) lv.hgt-এর সমান; দুই পাশে পাহাড়/খাদ
  const gapDepth = (x)=>{ let d=0; for(const g of lv.gaps){ const a=smooth((x-g[0])/.5), b=1-smooth((x-(g[0]+g[1]))/.5); d=Math.max(d,a*b); } return d; };
  const lakeY = -8.5;
  function T(x,z){
    const base = lv.hgt(x);
    let h = base;
    const az = Math.abs(z);
    if(z < -3.2){
      const dz = -z-3.2;
      const n = fbm(x*.03+3.1, z*.03, 4);
      h = base + .30*Math.pow(dz,1.25)*(.55+.9*n) + fbm(x*.08, z*.08, 3)*3.2*smooth(dz/10);
    } else if(z > 3.2){
      const dz = z-3.2;
      h = base - .30*dz*(0.8+.5*fbm(x*.04,z*.04,3)) + (fbm(x*.1,z*.1,3)-.4)*2.2*smooth(dz/6);
      h = Math.max(h, base-26);
    } else {
      h = base + (fbm(x*.5,z*.5,2)-.5)*.0;
    }
    const gd = gapDepth(x) * (1 - smooth((az-10)/10));
    return h - gd*14;
  }

  // ---- টেরেইন মেশ ----
  const zs=[-120,-90,-64,-46,-34,-24,-16,-10,-6.5,-4.6,-3.6,-3.2,3.2,3.6,4.6,6.5,10,16,24,34,48,64,90];
  const dx=.8, nx=Math.ceil((X1-X0)/dx)+1, nz=zs.length;
  const pos=new Float32Array(nx*nz*3), col=new Float32Array(nx*nz*3), uv=new Float32Array(nx*nz*2);
  const idx=[]; const sRGB=(r,g,b)=>new THREE.Color().setRGB(r,g,b,THREE.SRGBColorSpace);
  const gA=sRGB(...th.grass), gB=sRGB(...th.grass2), rock=sRGB(.42,.40,.38), soil=new THREE.Color(th.soil), dark=sRGB(.16,.13,.11);
  for(let i=0;i<nx;i++){ const x=X0+i*dx; for(let j=0;j<nz;j++){ const z=zs[j], y=T(x,z), k=(i*nz+j); pos[k*3]=x; pos[k*3+1]=y; pos[k*3+2]=z; uv[k*2]=x*.07; uv[k*2+1]=z*.07; } }
  for(let i=0;i<nx-1;i++) for(let j=0;j<nz-1;j++){ const a=i*nz+j,b=(i+1)*nz+j,c=(i+1)*nz+j+1,d=i*nz+j+1; idx.push(a,d,b, b,d,c); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
  const nrm=geo.attributes.normal;
  for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){ const k=i*nz+j, x=pos[k*3], y=pos[k*3+1], z=pos[k*3+2], ny=nrm.getY(k);
    const c=new THREE.Color().copy(gA).lerp(gB, fbm(x*.07,z*.07,3));
    const steep=smooth((0.86-ny)/.28); c.lerp(rock, steep*.85);
    const nearRoad=1-smooth((Math.abs(z)-3.4)/2.4); c.lerp(soil, nearRoad*.9);
    if(gapDepth(x)>.02 && Math.abs(z)<14) c.lerp(dark, Math.min(1,gapDepth(x)*1.2)*.9);
    if(th.lake && y<lakeY+2.5) c.lerp(sRGB(.55,.5,.38), smooth((lakeY+2.5-y)/2.5));
    const v=.88+fbm(x*.4,z*.4,2)*.24; c.multiplyScalar(v); col[k*3]=c.r; col[k*3+1]=c.g; col[k*3+2]=c.b; }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const terrain=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({ vertexColors:true, map:noiseTex(190,34), roughness:.95, metalness:0 }));
  terrain.receiveShadow=true; group.add(terrain);

  // ---- রাস্তা (গ্যাপ বাদ দিয়ে) ----
  const rdx=.4, rn=Math.ceil((L+90+30)/rdx); const rp=[],ru=[],ri=[]; let vi=0;
  const roadHalf=3.2;
  for(let i=0;i<rn;i++){ const x0=-30+i*rdx, x1=x0+rdx; if(lv.isGap(x0+rdx/2)||lv.isGap(x0)||lv.isGap(x1)) continue;
    for(const x of [x0,x1]) for(const z of [-roadHalf,roadHalf]){ rp.push(x,lv.hgt(x)+.04,z); ru.push(x/8, (z+roadHalf)/(2*roadHalf)); }
    ri.push(vi,vi+1,vi+2, vi+1,vi+3,vi+2); vi+=4; }
  const rgeo=new THREE.BufferGeometry(); rgeo.setAttribute('position',new THREE.Float32BufferAttribute(rp,3)); rgeo.setAttribute('uv',new THREE.Float32BufferAttribute(ru,2)); rgeo.setIndex(ri); rgeo.computeVertexNormals();
  const rt=roadTex(th.road); rt.repeat.set(1,1);
  const road=new THREE.Mesh(rgeo,new THREE.MeshStandardMaterial({ map:rt, roughness:th.road==="dirt"?1:.88, metalness:0 })); road.receiveShadow=true; group.add(road);

  // গ্যাপের দেয়াল-ছায়া ছাড়া কালো খাদ — টেরেইনের নিচে ইতিমধ্যে নেমে গেছে (gapDepth)।

  // ---- দূরের পাহাড়ের স্তর ----
  const ridges=[]; [[-150,52,.62],[-230,78,.45],[-330,105,.32]].forEach(([zr,hmax,mix],li)=>{
    const n=Math.ceil((L+700)/6), p=[],c=[],ix=[]; const base=new THREE.Color(th.fog).lerp(new THREE.Color().setRGB(.20,.38,.35,THREE.SRGBColorSpace),mix);
    for(let i=0;i<=n;i++){ const x=-300+i*6, h=hmax*(.35+.9*fbm(x*.006+li*9, li*3.3,4)); const cc=base.clone().multiplyScalar(.92+fbm(x*.02,li,2)*.2);
      p.push(x,-40,zr, x,h,zr); c.push(cc.r*.8,cc.g*.8,cc.b*.8, cc.r,cc.g,cc.b); if(i<n){ const a=i*2; ix.push(a,a+1,a+2, a+1,a+3,a+2); } }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(c,3)); g.setIndex(ix);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})); m.frustumCulled=false; ridges.push(m); group.add(m); });

  // ---- গাছ/ঝোপ/পাথর ----
  const treeMat=vcMat();
  const placeRand=(count,zMin,zMax,minD=0)=>{ const out=[]; for(let i=0;i<count;i++){ const x=X0+R()*(X1-X0), z=zMin+R()*(zMax-zMin); if(Math.abs(z)<4.2) continue; if(z>4.2&&z<22) continue; if(lv.gaps.some(g=>x>g[0]-3&&x<g[0]+g[1]+3)) continue; out.push([x,z,T(x,z)]); } return out; };
  const nTrees=Math.round((L+160)*2.3);
  const sets=[];
  const kind=th.trees;
  const backs=placeRand(nTrees, -55,-5), fronts=placeRand(Math.round(nTrees*.5),22,70);
  const mk=(arr,sMin,sMax)=>arr.map(([x,z,y])=>{ const s=sMin+R()*(sMax-sMin); return mkM(x,y-.1,z,s,s*(.9+R()*.3),s,R()*6.28); });
  const trees=scatter(treeGeo(kind),treeMat,[...mk(backs,.9,1.9),...mk(fronts,.8,1.5)]); group.add(trees);
  if(kind!=="broad"){ // মিশ্র: কিছু চওড়া-পাতার গাছও
    group.add(scatter(treeGeo("broad"),treeMat,mk(placeRand(Math.round(nTrees*.25),-45,-6),.8,1.5))); }
  // ঝোপ
  const bushGeo=merged([[new THREE.IcosahedronGeometry(.9,1),0x3d8a30,0,.4,0],[new THREE.IcosahedronGeometry(.7,1),0x4aa03a,.6,.3,.2]]);
  group.add(scatter(bushGeo,treeMat,placeRand(Math.round(nTrees*.9),-30,50).map(([x,z,y])=>{ const s=.5+R()*1.0; return mkM(x,y,z,s,s*.8,s,R()*6); }),false));
  // পাথর
  const rockGeo=paintGeo(new THREE.DodecahedronGeometry(1,0),0x7a7772);
  group.add(scatter(rockGeo,vcMat({roughness:1,flatShading:true}),placeRand(Math.round(nTrees*.35),-18,40).map(([x,z,y])=>{ const s=.4+R()*1.3; return mkM(x,y+s*.25,z,s*1.2,s*.8,s,R()*6,R()*.4); })));

  // ---- চা-বাগান (সিলেট): ঢালে সারি সারি ঝোপ ----
  if(th.tea){ const tm=[]; for(let row=0;row<9;row++){ const z=-9-row*2.6; for(let x=X0;x<X1;x+=1.3){ if(lv.gaps.some(g=>x>g[0]-4&&x<g[0]+g[1]+4)) continue; const y=T(x,z); tm.push(mkM(x+(R()-.5)*.3,y+.1,z,1.2,.9,1.2,R()*6)); } }
    group.add(scatter(treeGeo("tea"),treeMat,tm,false)); }

  // ---- গার্ডরেইল (সামনের দিকে) ও রাস্তার সাইন ----
  { const post=[], rail=[]; const railMat=vcMat({roughness:.5,metalness:.6}); const pg=paintGeo(new THREE.BoxGeometry(.14,1.0,.14),0xb8bcc0), rg=paintGeo(new THREE.BoxGeometry(4,.28,.08),0xd0d4d8);

    // হলুদ বাঁকের সাইন
    const signTex=canvasTex(128,128,(g)=>{ g.fillStyle="#f2c230"; g.fillRect(0,0,128,128); g.strokeStyle="#111"; g.lineWidth=8; g.strokeRect(6,6,116,116); g.fillStyle="#111"; g.beginPath(); g.moveTo(38,92); g.lineTo(38,50); g.lineTo(78,50); g.lineTo(78,36); g.lineTo(98,62); g.lineTo(78,88); g.lineTo(78,72); g.lineTo(58,72); g.lineTo(58,92); g.closePath(); g.fill(); });
    for(let x=46;x<L+60;x+=88){ if(lv.gaps.some(g=>x>g[0]-8&&x<g[0]+g[1]+8)) continue; const y=lv.hgt(x); const s=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshStandardMaterial({map:signTex,roughness:.5,side:THREE.DoubleSide})); s.position.set(x,y+2.7,-4.6); s.castShadow=true; group.add(s); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.6,8),new THREE.MeshStandardMaterial({color:0x666a6e})); pole.position.set(x,y+1.3,-4.6); group.add(pole); }
  }

  // ---- বাড়িঘর ----
  const houseMat=vcMat({roughness:.75});
  const tin=[0x8b9aa5,0x9aa7b0,0xb4552d], wall=[0xd9bd8c,0x9db8d8,0xe2d3b0,0xc9a778];
  function cottage(){ const w=wall[R()*wall.length|0], t=tin[R()*tin.length|0]; return merged([[new THREE.BoxGeometry(4.2,2.4,3.4),w,0,1.2,0],[new THREE.ConeGeometry(3.6,1.6,4),t,0,3.2,0,0,0],[new THREE.BoxGeometry(.8,1.4,.1),0x5a3d28,0,.7,1.72]]); }
  const placeHouses=(n,geoFn,zMin,zMax)=>{ const ms=[]; for(let i=0;i<n;i++){ const x=14+R()*(L+50), z=zMin+R()*(zMax-zMin); if(lv.gaps.some(g=>x>g[0]-8&&x<g[0]+g[1]+8)) continue; const y=T(x,z); const g=geoFn(); const im=scatter(g,houseMat,[mkM(x,y,z,1,1,1,Math.PI/4*(R()<.5?0:1)+ (R()-.5)*.5)]); group.add(im); } };
  if(mapId==="sajek") placeHouses(Math.round(L/16),cottage,-30,-9);
  if(mapId==="sylhet") placeHouses(Math.round(L/40),cottage,-34,-14);
  if(th.stilt){ const stilt=()=>merged([[new THREE.BoxGeometry(4,.2,3.4),0x7a5a3a,0,2.0,0],[new THREE.BoxGeometry(3.8,2.0,3.2),0xb89a62,0,3.1,0],[new THREE.ConeGeometry(3.5,1.7,4),0xc9b36a,0,5.0,0,0,0],[new THREE.CylinderGeometry(.1,.1,2.0,6),0x6b4a2a,-1.8,1,-1.5],[new THREE.CylinderGeometry(.1,.1,2.0,6),0x6b4a2a,1.8,1,-1.5],[new THREE.CylinderGeometry(.1,.1,2.0,6),0x6b4a2a,-1.8,1,1.5],[new THREE.CylinderGeometry(.1,.1,2.0,6),0x6b4a2a,1.8,1,1.5]]); placeHouses(Math.round(L/18),stilt,-32,-9); }
  if(th.stupa){ const x=L*.52, z=-34, y=T(x,z); const gold=0xe3b43c; const g=merged([[new THREE.CylinderGeometry(7,8,1.4,24),0xe8e2d4,0,.7,0],[new THREE.CylinderGeometry(5.2,6,1.2,24),0xf2ecde,0,1.9,0],[new THREE.CylinderGeometry(3.4,4.6,3.2,24),gold,0,4.1,0],[new THREE.ConeGeometry(3.4,6,24),gold,0,8.7,0],[new THREE.CylinderGeometry(.18,.3,4,8),gold,0,13.6,0]]);
    const s=new THREE.Mesh(g,vcMat({roughness:.3,metalness:.7,emissive:0x3a2a00,emissiveIntensity:.35})); s.position.set(x,y,z); s.castShadow=true; group.add(s); }

  // ---- হ্রদ, নৌকা, ঝুলন্ত সেতু (রাঙামাটি-কাপ্তাই) ----
  const animated=[];
  if(th.lake){
    const water=new THREE.Mesh(new THREE.PlaneGeometry(2400,1200,1,1),new THREE.MeshPhysicalMaterial({color:0x1f7fa6,roughness:.08,metalness:.1,clearcoat:1,transparent:true,opacity:.92,envMapIntensity:1.8}));
    water.rotation.x=-Math.PI/2; water.position.set(L/2,lakeY,-200+400); group.add(water); animated.push({o:water,t:"water"});
    for(let i=0;i<4;i++){ const b=new THREE.Group(); const hull=new THREE.Mesh(new THREE.BoxGeometry(4.6,.5,1.2),new THREE.MeshStandardMaterial({color:[0x9a5a2a,0x2a6a9a,0xb03a2a,0x4a8a3a][i],roughness:.7})); hull.position.y=.25; b.add(hull);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,1.4),new THREE.MeshStandardMaterial({color:0x2d3a44})); roof.position.set(-.3,1.3,0); b.add(roof); for(const x of [-1.2,.6]) for(const z of [-.55,.55]){ const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.1,5),new THREE.MeshStandardMaterial({color:0x444})); p.position.set(x,.8,z); b.add(p); }
      b.position.set(40+i*L/4.2+R()*20, lakeY+.05, 22+R()*40); b.rotation.y=(R()-.5)*.8; group.add(b); animated.push({o:b,t:"boat",ph:R()*6,y0:b.position.y}); }
    // ঝুলন্ত সেতু (দূরে)
    const bz=-72, by=lakeY+17, bx0=L*.18, bx1=L*.18+210; const steel=new THREE.MeshStandardMaterial({color:0xcfd4d8,metalness:.8,roughness:.35});
    const deck=new THREE.Mesh(new THREE.BoxGeometry(bx1-bx0,.7,5),new THREE.MeshStandardMaterial({color:0x6b7077,roughness:.8})); deck.position.set((bx0+bx1)/2,by,bz); group.add(deck);
    for(const x of [bx0,bx1]){ for(const z of [bz-2.4,bz+2.4]){ const t=new THREE.Mesh(new THREE.BoxGeometry(1.1,26,1.1),steel); t.position.set(x,by+10,z); t.castShadow=true; group.add(t); } const top=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.0,6),steel); top.position.set(x,by+23,bz); group.add(top); }
    for(const z of [bz-2.4,bz+2.4]){ const pts=[]; for(let i=0;i<=40;i++){ const t=i/40, x=bx0+(bx1-bx0)*t, sag=Math.pow(2*t-1,2); pts.push(new THREE.Vector3(x,by+23-22*(1-sag),z)); }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.18,6),steel));
      for(let i=1;i<40;i+=1){ const p=pts[i]; const h=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,p.y-by,4),steel); h.position.set(p.x,(p.y+by)/2,z); group.add(h); } }
    // দূরের পাহাড়-দ্বীপ (লেকের ওপর সবুজ টিলা)
    for(let i=0;i<7;i++){ const s=14+R()*22; const m=new THREE.Mesh(new THREE.SphereGeometry(s,16,10,0,6.3,0,1.57),new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.2,.42,.2,THREE.SRGBColorSpace).multiplyScalar(.8+R()*.4),roughness:1})); m.position.set(R()*(L+300)-60,lakeY-1,40+R()*130); m.scale.set(1.8,.7,1.2); group.add(m); }
  }

  // ---- মেঘ + "মেঘের সমুদ্র" ----
  const cTex=cloudTex(), clouds=[];
  for(let i=0;i<16;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.85,depthWrite:false,fog:false})); const w=120+R()*140; s.scale.set(w,w*.45,1); s.position.set(-200+R()*900,90+R()*70,-260-R()*180); clouds.push(s); group.add(s); }
  const seaN=Math.round(th.cloudSea*34);
  for(let i=0;i<seaN;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.55+R()*.2,depthWrite:false,color:0xffffff})); const w=70+R()*90; s.scale.set(w,w*.4,1); s.position.set(-40+R()*(L+160), -6+R()*7-(th.lake?0:0), 34+R()*80); group.add(s); clouds.push(s); }

  // ---- ফিনিশ গেট, চেকপয়েন্ট ----
  const fx=lv.finishX, fy=lv.hgt(fx);
  const checker=canvasTex(256,64,(g)=>{ for(let i=0;i<16;i++) for(let j=0;j<4;j++){ g.fillStyle=(i+j)%2?"#111":"#fff"; g.fillRect(i*16,j*16,16,16); } });
  const banner=new THREE.Mesh(new THREE.BoxGeometry(.4,1.6,7.6),new THREE.MeshStandardMaterial({map:checker})); banner.position.set(fx,fy+6.4,0); group.add(banner);
  for(const z of [-3.8,3.8]){ const p=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,7.2,10),new THREE.MeshStandardMaterial({color:0xdfe3e6,metalness:.5,roughness:.4})); p.position.set(fx,fy+3.6,z); p.castShadow=true; group.add(p); }
  const finText=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),new THREE.MeshBasicMaterial({map:canvasTex(512,128,(g,w,h)=>{ g.fillStyle="#0b6b33"; g.fillRect(0,0,w,h); g.fillStyle="#fff"; g.font="bold 78px Arial"; g.textAlign="center"; g.textBaseline="middle"; g.fillText("FINISH",w/2,h/2+4); g.fillStyle="#d4202a"; g.beginPath(); g.arc(60,h/2,22,0,6.3); g.fill(); })})); finText.position.set(fx-.25,fy+8.3,0); finText.rotation.y=-Math.PI/2; group.add(finText);
  const cpFlags=lv.cps.map(cp=>{ const y=lv.hgt(cp.x); const g=new THREE.Group(); const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,5,8),new THREE.MeshStandardMaterial({color:0x333})); pole.position.y=2.5; g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.2,6,1),new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.7})); flag.position.set(0,4.2,1.05); flag.rotation.y=Math.PI/2; g.add(flag); g.position.set(cp.x,y,-3.9); group.add(g); return {g,flag,cp}; });

  // ---- কয়েন ও ফুয়েল ক্যান ----
  const coinGeo=new THREE.CylinderGeometry(.55,.55,.14,28); coinGeo.rotateX(Math.PI/2);
  const coinMesh=new THREE.InstancedMesh(coinGeo,new THREE.MeshStandardMaterial({color:0xffc830,metalness:1,roughness:.28,emissive:0x5a3a00,emissiveIntensity:.5}),Math.max(1,lv.coins.length)); coinMesh.castShadow=true; coinMesh.frustumCulled=false; group.add(coinMesh);
  const canGeo=merged([[new THREE.BoxGeometry(.9,1.1,.5),0xd02a24,0,0,0],[new THREE.BoxGeometry(.4,.2,.3),0x222,.15,.65,0],[new THREE.BoxGeometry(.5,.5,.52),0xf2f2f2,0,.0,0]]);
  const canMesh=new THREE.InstancedMesh(canGeo,vcMat({roughness:.5,metalness:.2,emissive:0x330000,emissiveIntensity:.25}),Math.max(1,lv.cans.length)); canMesh.castShadow=true; canMesh.frustumCulled=false; group.add(canMesh);

  // ---- আলো ----
  const sunDir=new THREE.Vector3(...th.sun).normalize();
  const hemi=new THREE.HemisphereLight(th.hemiSky,th.hemiGnd,.95); group.add(hemi);
  const sun=new THREE.DirectionalLight(th.sunC,th.sunI); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=-48; sc.right=48; sc.top=40; sc.bottom=-40; sc.near=1; sc.far=260; sun.shadow.bias=-.0004; sun.shadow.normalBias=.05;
  group.add(sun); group.add(sun.target);

  const sky=makeSky(th);

  // ঐচ্ছিক: 3d/textures/road_color.jpg, road_normal.jpg, ground_color.jpg, ground_normal.jpg থাকলে ব্যবহার হয় (না থাকলে কোডে-আঁকা টেক্সচার)
  async function applyExternalTextures(){
    const load=async(name,srgb,rep)=>{ try{ const h=await fetch(`./3d/textures/${name}`,{method:"HEAD"}); if(!h.ok) return null; const t=await new THREE.TextureLoader().loadAsync(`./3d/textures/${name}`); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=8; if(srgb) t.colorSpace=THREE.SRGBColorSpace; if(rep) t.repeat.set(...rep); return t; }catch(e){ return null; } };
    const rc=await load("road_color.jpg",true,[1,1]), rn=await load("road_normal.jpg",false,[1,1]);
    if(rc){ rc.repeat.set(1,1); road.material.map=rc; road.material.color.set(0xffffff); } if(rn){ rn.repeat.copy(road.material.map?road.material.map.repeat:new THREE.Vector2(1,1)); road.material.normalMap=rn; }
    const gc=await load("ground_color.jpg",true,[1,1]), gn=await load("ground_normal.jpg",false,[1,1]);
    if(gc){ gc.repeat.set(.9,.9); terrain.material.map=gc; } if(gn){ gn.repeat.set(.9,.9); terrain.material.normalMap=gn; }
    road.material.needsUpdate=true; terrain.material.needsUpdate=true; return !!(rc||gc);
  }
  function update(camPos, S, t){
    sky.position.copy(camPos);
    sun.position.set(S.x+sunDir.x*120,S.y+sunDir.y*120,sunDir.z*120); sun.target.position.set(S.x,S.y,0);
    ridges.forEach((m,i)=>{ m.position.x = camPos.x*(.72+.1*i); });
    clouds.forEach((s,i)=>{ if(s.position.z<0){ s.position.x += .6*(1+i%3)*.016; } });
    for(const a of animated){ if(a.t==="boat"){ a.o.position.y=a.y0+Math.sin(t*1.2+a.ph)*.08; a.o.rotation.z=Math.sin(t*1.0+a.ph)*.03; } }
    // কয়েন ঘোরানো
    let n=0; for(const c of lv.coins){ if(c.taken){ _m.makeScale(0,0,0); } else { _q.setFromEuler(_e.set(0,t*2.2+c.x,0)); _m.compose(new THREE.Vector3(c.x,c.y+Math.sin(t*3+c.x)*.12,0),_q,new THREE.Vector3(1,1,1)); } coinMesh.setMatrixAt(n++,_m); } coinMesh.instanceMatrix.needsUpdate=true; coinMesh.count=lv.coins.length||0;
    n=0; for(const c of lv.cans){ if(c.taken){ _m.makeScale(0,0,0); } else { _q.setFromEuler(_e.set(0,t*1.5,0)); _m.compose(new THREE.Vector3(c.x,c.y+Math.sin(t*2+c.x)*.15,0),_q,new THREE.Vector3(1.3,1.3,1.3)); } canMesh.setMatrixAt(n++,_m); } canMesh.instanceMatrix.needsUpdate=true; canMesh.count=lv.cans.length||0;
    cpFlags.forEach(f=>{ f.flag.material.color.set(f.cp.hit?0x2ecc71:0xffffff); f.flag.rotation.y=Math.PI/2+Math.sin(t*3+f.cp.x)*.12; });
  }
  function dispose(){ group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){ const m=Array.isArray(o.material)?o.material:[o.material]; m.forEach(x=>{ if(x.map) x.map.dispose(); x.dispose(); }); } }); sun.shadow.map&&sun.shadow.map.dispose(); }
  return { group, sky, update, dispose, theme:th, terrainY:T, sun, applyExternalTextures };
}
