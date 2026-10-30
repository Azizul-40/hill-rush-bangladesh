// প্রতিটা গাড়ি (ট্রাক/CNG/বাস…) গ্যাপে ঢুকলে: (ক) আস্তে গেলে পড়ে কি না, (খ) গ্যাস চেপে ধরে ~৪০০px আগে থেকে এলে পার হতে পারে কি না।
// বট মানুষ নয়; এটা শুধু "পড়া সম্ভব" ও "পার হওয়া সম্ভব"—দুটোই যে সত্যি তা দেখায়।
const { chromium } = require('playwright');
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext().then(c=>c.newPage());
  await p.goto('file://'+dir+'/index.html');await p.waitForTimeout(300);
  const res=await p.evaluate(()=>{
    const out=[];
    for(const v of [0,7,8,9,10,11])for(const lvl of [1,10,30,60]){
      let slowFall=0,fastClear=0,tot=0;
      for(let gi=0;gi<3;gi++){
        save.selectedVehicle=v;save.selectedMap=0;startLevel(lvl);
        const G=getGaps();if(!G[gi])continue;tot++;
        const g=G[gi];truck.x=g[0]-90;truck.y=terrainY(truck.x)-60;truck.vx=150;truck.vy=0;truck.angle=0;keys.gas=false;keys.right=false;
        let n=0;while(state==="play"&&n<500){updatePhysics(.02);n++;if(truck.x>g[0]+g[1]+260)break;}
        if(state!=="play")slowFall++;
        save.selectedVehicle=v;startLevel(lvl);const g2=getGaps()[gi];
        truck.x=Math.max(500,g2[0]-420);truck.y=terrainY(truck.x)-60;truck.vx=0;truck.vy=0;truck.angle=0;keys.gas=true;keys.right=true;
        n=0;while(state==="play"&&n<900){updatePhysics(.02);n++;if(truck.x>g2[0]+g2[1]+260)break;}
        if(state==="play"&&truck.x>g2[0]+g2[1])fastClear++;
        keys.gas=keys.right=false;
      }
      out.push({v,lvl,gaps:tot,slowFall,fastClear});
    }
    return out;
  });
  for(const r of res)console.log(JSON.stringify(r));
  await b.close();
})();
