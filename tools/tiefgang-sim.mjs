// Balancing-Simulation für Tiefgang: lädt den Logik-Teil aus tiefgang.html und spielt mit einem Bot.
// Aufruf: node tools/tiefgang-sim.mjs [Datei] [Startwert] [-v]
// Umgebungsvariablen: OVER = Sekunden zwischen zwei Schichten (Abrechnung + Einkaufen), EVERY = Ausgabe alle n Schichten,
// REP='alt=>neu;;alt2=>neu2' ersetzt Text im Logik-Teil (für Experimente)
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const src=process.argv[2]&&!process.argv[2].startsWith('-')?process.argv[2]:path.join(path.dirname(fileURLToPath(import.meta.url)),'..','tiefgang.html');
let code=fs.readFileSync(src,'utf8');
const a=code.indexOf('// ==LOGIK-ANFANG=='),b=code.indexOf('// ==LOGIK-ENDE==');
code=code.slice(a,b);
// Stellschrauben für Experimente: REP='alt=>neu;;alt2=>neu2'
if(process.env.REP)for(const r of process.env.REP.split(';;')){const[x,y]=r.split('=>');if(!code.includes(x))throw new Error('fehlt: '+x);code=code.split(x).join(y)}
const pre=`function fmt(n){return String(Math.round(n))};function fmtX(n){return String(n)};function fmtD(n){return String(n)};`;
const api=new Function(pre+code+`;return{get S(){return S},set S(v){S=v},get G(){return G},get ST(){return ST},newState,calc,startShift,tick,fingerDown,fingerUp,canDeeper,goDeeper,useSlow,NODES,KNODES,nodeCost,nodeState,buyNode,buyKern,prestigeGain,prestige,lv,kv,setR:f=>{R=f},progress,NC};`)();
let seed=+(process.argv[3]&&!process.argv[3].startsWith('-')?process.argv[3]:1);
api.setR(()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296});
const VERB=process.argv.includes('-v');
api.S=api.newState();api.calc();
const S=()=>api.S;
// Gewichte: wie wichtig ist ein Knoten für einen vernünftigen Spieler
const W={spitze:3,kopf:3,kritc:2,kritd:1.6,schnell:2,durch:1.5,akku:2.5,erhol:1.2,akkukr:1,drohne:2.5,dtakt:1.2,dkraft:1.2,seismo:1,auge:2,glueck:1,ek_kupfer:1.4,ek_eisen:1.4,ek_silber:1.4,ek_gold:1.4,ek_kristall:1.4,tntfund:.8,sprengk:.8,raeum:.7,rampe:1.6,schnellw:1.5};
const GEMP=['reserve','zeitlupe','schatz','blitz','juwelsinn','knall','sprengschlag','schnellw'];
function shop(){
  let n=0;
  for(;;){
    let best=null,bs=1e99;
    for(const id in api.NODES){
      if(api.nodeState(api.NODES,id)!=='ok')continue;
      const c=api.nodeCost(api.NODES[id],api.lv(id));if(!c||c.gem)continue;
      const sc=c.n/(W[id]||1);if(sc<bs){bs=sc;best=[id,c]}
    }
    if(!best||S().coins<best[1].n)break;
    api.buyNode(best[0]);n++;
  }
  for(let k=0;k<20;k++){let done=false;
    for(const id of GEMP){if(api.nodeState(api.NODES,id)!=='ok')continue;const c=api.nodeCost(api.NODES[id],api.lv(id));if(c&&c.gem&&S().gems>=c.n){api.buyNode(id);n++;done=true;break}}
    if(!done)break}
  return n;
}
const KW={kkraft:3.5,kgold:3.5,kakku:1.5,kdrohne:1.5,kramp:2,kedel:.8,kturbo:1.5,kkrit:1.2,kstart:1.3,kwaechter:1.2,kdkraft:1.3};
function kshop(){for(;;){let best=null,bs=1e99;for(const id in api.KNODES){if(api.nodeState(api.KNODES,id)!=='ok')continue;const c=api.nodeCost(api.KNODES[id],api.kv(id));const sc=c.n/(KW[id]||1);if(sc<bs){bs=sc;best=[id,c]}}if(!best||S().split<best[1].n)break;api.buyKern(best[0])}}
// eine Schicht mit dem Bot
const OVER=+(process.env.OVER||20);const DT=1/60,SWITCH=.13;
function playShift(start){
  api.startShift(start);
  let G=api.G,cur=null,wait=0,t=0;
  while(G.mode!=='done'&&t<600){
    t+=DT;
    if(G.mode==='shift'&&!G.trans){
      if(api.canDeeper())api.goDeeper(false);
      if(G.E<4&&api.ST.slow&&!G.slowUsed)api.useSlow();
      if(cur&&(cur.dead||!G.f.blocks.includes(cur))){api.fingerUp(1);cur=null;wait=SWITCH}
      if(!cur){
        wait-=DT;
        if(wait<=0){
          const live=G.f.blocks.filter(b=>!b.dead);
          let pick=null;
          if(G.f.boss)pick=G.f.boss;
          const sp=live.find(b=>b.t==='akku'||b.t==='tnt');
          if(sp&&sp.hp<api.ST.pow*3)pick=sp;
          if(!pick)pick=live.sort((p,q)=>p.hp-q.hp)[0];
          if(pick){cur=pick;api.fingerDown(1,pick.y*6+pick.x)}
        }
      }
    }
    api.tick(DT);
  }
  api.fingerUp(1);
  return{...G.sum,t};
}
let time=0,shift=0,lastBestShift=0,marks={},prestT=[],log=[];
const MARK=[10,25,40,60,80,100];
let shift1=null,maxShiftLen=0,lens=[];
while(time<12*3600&&S().best<101){
  const rm=api.ST.rampMax;
  const start=Math.max(1,Math.min(rm,S().runBest-8));
  const r=playShift(start);shift++;
  time+=r.t+OVER;                                  // Abrechnung und Einkaufen
  lens.push(r.time);maxShiftLen=Math.max(maxShiftLen,r.t);
  if(r.newBest)lastBestShift=shift;
  for(const m of MARK)if(!marks[m]&&S().best>=m)marks[m]=time;
  const coinsAfter=S().coins;
  const bought=shop();
  if(shift===1)shift1={coins:coinsAfter,bought,depth:r.maxD};
  if(VERB&&(shift%(+process.env.EVERY||10)===0||shift<6))console.log(`#${shift} t=${(time/60).toFixed(1)}m start ${start} → ${r.maxD} len ${r.time.toFixed(0)}s coins ${r.coins.toExponential(2)} gems ${S().gems} pow ${api.ST.pow.toExponential(2)} dr ${api.ST.drones} best ${S().best} lv ${Object.entries(S().lv).map(([k,v])=>k.slice(0,4)+v).join(",")}`);
  const pg=api.prestigeGain();if(S().best>=40&&((pg>=Math.max(5,S().splitTot*.4)&&shift-lastBestShift>=5)||pg>=Math.max(10,S().splitTot*1.2)||(pg>=1&&shift-lastBestShift>=12))){
    const g=api.prestigeGain();api.prestige();kshop();prestT.push([time,S().best,g]);
    if(VERB)console.log(`  KERNBOHRUNG bei ${(time/60).toFixed(0)} min, best ${S().best}, +${g} Splitter`);
    lastBestShift=shift;
  }
}
console.log('Schicht 1:',JSON.stringify(shift1));
console.log('Meilensteine (min):',Object.entries(marks).map(([k,v])=>k+': '+(v/60).toFixed(0)).join(' | '));
console.log('Kernbohrungen:',prestT.map(p=>`${(p[0]/60).toFixed(0)}min best ${p[1]} +${p[2]}`).join(' ; '));
console.log('Schichten',shift,'längste',maxShiftLen.toFixed(0),'s; Ø letzte 20:',(lens.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,lens.length)).toFixed(0),'s; Ende',(time/3600).toFixed(2),'h best',S().best);
console.log('Stufen:',JSON.stringify(S().lv));
console.log('Kern:',JSON.stringify(S().kern));
console.log('JSON'+JSON.stringify({m:marks,p:prestT.length,end:time,best:S().best}));
