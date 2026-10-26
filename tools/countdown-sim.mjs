// Physik-Test für Countdown: lädt den Logik-Teil aus countdown.html und fliegt Testraketen mit einem einfachen Autopiloten.
// Aufruf: node tools/countdown-sim.mjs [Datei]
// Gibt für jede Testrakete Δv aus dem Bauplan, erreichte Höhe, Bahn und höchste Temperatur aus.
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const src=process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..','countdown.html');
let code=fs.readFileSync(src,'utf8');
code=code.slice(code.indexOf('// ==LOGIK-ANFANG=='),code.indexOf('// ==LOGIK-ENDE=='));
const api=new Function(code+`;return{initBodies,BODIES,P,autoStage,designStats,mkVessel,vCalc,stageNext,worldStep,WS,maxStage,sasRot,ctlInfo,vAlt,vOrbit,apo,peri,
  setV:v=>{VESSELS=v},setS:s=>{S=s},newState,setCrew:f=>{crewById=f}};`)();
api.initBodies();
const S0=api.newState('frei');S0.crew=[{id:'c1',job:'pilot',xp:0,st:'flug'}];api.setS(S0);
api.setCrew(id=>S0.crew.find(c=>c.id===id)||null);
/* Stapel von oben nach unten, Seitenteile: {side:'typ',on:index} wird links und rechts angebaut */
function build(list){
  const parts=[];
  for(const it of list){
    if(typeof it==='object'){const pi=it.on,pr=parts[pi],pd=api.P[pr.t];
      for(const dir of[-1,1]){let par=pi;for(const t of it.side){const pp=parts[par],ppd=api.P[pp.t],d=api.P[t];
        const x=par===pi?pr.x+dir*(pd.w/2+d.w/2):pp.x,y=par===pi?pr.y:pp.y-ppd.h/2-d.h/2;
        parts.push({t,x,y,fx:dir<0?1:0,p:par,a:par===pi?(dir<0?'L':'R'):'bot',n:par===pi?'side':'top'});par=parts.length-1}}
      continue}
    const d=api.P[it];
    if(!parts.length){parts.push({t:it,x:0,y:0,p:-1});continue}
    let pi=parts.length-1;while(parts[pi].a==='L'||parts[pi].a==='R'||parts[pi].n==='top'&&parts[parts[pi].p].a&&['L','R'].includes(parts[parts[pi].p].a))pi--;
    const pr=parts[pi];parts.push({t:it,x:0,y:pr.y-api.P[pr.t].h/2-d.h/2,p:pi,a:'bot',n:'top'});
  }
  parts[0].crew=['c1'];
  const D={parts};api.autoStage(D);return D;
}
function fly(name,list,targetAp){
  const D=build(list),st=api.designStats(D,9.81);
  const V=api.mkVessel(D,name);api.vCalc(V);const B=api.BODIES.murmel;
  let low=0;for(const p of V.d.pts)low=Math.max(low,V.d.cy-p.y);
  V.x=0;V.y=B.R+B.padH+low+.02;V.th=Math.PI/2;V.met0=0;
  api.setV([V]);api.WS.act=V;api.WS.near=[];api.WS.t=0;api.WS.wi=0;
  V.thr=1;api.stageNext(V);
  let maxAlt=0,maxT=0,last=0,circ=false;
  const ctl=(A,dt)=>{
    const alt=api.vAlt(A),up=Math.atan2(A.y,A.x),pro=Math.atan2(A.vy,A.vx),o=api.vOrbit(A);
    let tgt=up-(90-Math.max(0,90-90*Math.pow(Math.min(1,alt/38000),.55)))*Math.PI/180;
    if(Math.hypot(A.vx,A.vy)>100&&alt<B.ah){const d=Math.atan2(Math.sin(tgt-pro),Math.cos(tgt-pro));tgt=pro+Math.max(-.12,Math.min(.12,d))}
    const vr=(A.x*A.vx+A.y*A.vy)/Math.hypot(A.x,A.y);
    if(!circ){A.thr=api.apo(o)-B.R>targetAp?0:1;if(A.thr===0&&alt>B.ah&&vr<30)circ=true}
    if(circ){tgt=pro;A.thr=api.peri(o)-B.R>B.ah+3000?0:1}
    A.sas='hold';A.sasT=tgt;A.ci=api.ctlInfo(A);
    return{thr:A.thr,rot:api.sasRot(A,A.ci,dt),tx:0,ty:0,drive:0};
  };
  for(let f=0;f<60*900;f++){
    const A=api.WS.act;if(!A)break;
    api.worldStep(1/60,ctl);
    maxAlt=Math.max(maxAlt,api.vAlt(A));for(const q of A.parts)maxT=Math.max(maxT,q.T);
    const burning=A.d.eng.some(i=>A.parts[i].on&&A.parts[i].fl>0);
    if(!burning&&A.thr>0&&api.WS.t-last>1&&A.stg<=api.maxStage(A.parts)&&!A.parts.some(q=>q.s===A.stg&&api.P[q.t].chute)){api.stageNext(A);last=api.WS.t}
    const o=api.vOrbit(A);if(circ&&api.peri(o)-B.R>B.ah+3000)break;
  }
  const A=api.WS.act;
  if(!A){console.log(name.padEnd(14),'Δv',String(Math.round(st.dv)).padStart(5),'m/s · max. Höhe',(maxAlt/1e3).toFixed(1),'km · danach abgestürzt (der Test öffnet keine Fallschirme)');return}
  const o=api.vOrbit(A);
  console.log(name.padEnd(14),'Δv',String(Math.round(st.dv)).padStart(5),'m/s · max. Höhe',(maxAlt/1e3).toFixed(1),'km · Ap',((api.apo(o)-B.R)/1e3).toFixed(1),'Pe',((api.peri(o)-B.R)/1e3).toFixed(1),'km · max.',Math.round(maxT),'K · Zeit',Math.round(api.WS.t),'s');
}
fly('Hüpfer',['chute','pod1','s_boeller',{side:['fin'],on:2}],60000);
fly('Zweistufig',['chute','pod1','heat_s','dec_s','tankS2','tankS2','e_hummel','dec_s','s_kracher',{side:['fin'],on:8}],60000);
fly('Mit Boostern',['chute','pod1','heat_s','dec_s','tankS2','tankS2','e_hummel','dec_s','tankS3','tankS2','e_hummel',{side:['dec_r','s_dschlag'],on:8},{side:['fin'],on:10}],60000);
