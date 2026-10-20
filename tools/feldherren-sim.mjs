// Simulation für Kleine Feldherren: lädt den Logik-Teil aus feldherren.html und lässt den Computer gegen sich selbst spielen.
// Aufruf: node tools/feldherren-sim.mjs [Datei] [Partien je Karte] [Startwert] [-v]
// Prüft dabei, dass jede Partie endet und keine unmöglichen Zustände entstehen, und zeigt Siegquoten je Seite und Feldherr.
// Umgebungsvariablen: MAP = nur diese Karte, FOG=1 mit Nebel, REP='alt=>neu;;alt2=>neu2' ersetzt Text im Logik-Teil (für Experimente)
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const args=process.argv.slice(2).filter(a=>!a.startsWith('-'));
const src=args[0]&&!/^\d+$/.test(args[0])?args.shift():path.join(path.dirname(fileURLToPath(import.meta.url)),'..','feldherren.html');
const GAMES=+(args[0]||20),VERB=process.argv.includes('-v');
let seed=+(args[1]||1);
let code=fs.readFileSync(src,'utf8');
const a=code.indexOf('// ==LOGIK-ANFANG=='),b=code.indexOf('// ==LOGIK-ENDE==');
if(a<0||b<0)throw new Error('Logik-Marker fehlen');
code=code.slice(a,b);
if(process.env.REP)for(const r of process.env.REP.split(';;')){const[x,y]=r.split('=>');if(!code.includes(x))throw new Error('fehlt: '+x);code=code.split(x).join(y)}
const api=new Function(code+`;return{MAPS,FH,FHORD,UNITS,newMatch,aiNext,applyAct,buildMap,MOVE,TER,lp,setR:f=>{R=f}};`)();
api.setR(()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296});
const rnd=n=>Math.floor(Math.random()*n);

// Karten prüfen: Burgen für Fußtruppen gegenseitig erreichbar, Starttruppen auf begehbaren Feldern
for(const M of api.MAPS){
  const m=api.buildMap(M),n=m.w*m.h;
  for(const r of M.top)if(r.length!==M.w)throw new Error(M.id+': Zeile hat falsche Länge: '+r);
  const cs=m.t.map((c,i)=>c==='C'?i:-1).filter(i=>i>=0);
  if(cs.length!==2)throw new Error(M.id+': braucht genau zwei Burgen');
  for(const mt of['fuss','pferd','rad']){
    const seen=new Uint8Array(n);let q=[cs[0]];seen[cs[0]]=1;
    while(q.length){const nq=[];for(const i of q){const x=i%m.w,y=(i/m.w)|0;for(const[nx,ny]of[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(nx<0||ny<0||nx>=m.w||ny>=m.h)continue;const j=ny*m.w+nx;if(seen[j]||!api.MOVE[mt][m.t[j]])continue;seen[j]=1;nq.push(j)}}q=nq}
    if(!seen[cs[1]])throw new Error(M.id+': Burgen für '+mt+' nicht verbunden');
  }
  for(const[k,x,y]of M.units){const c=m.t[y*m.w+x];if(!api.MOVE[api.UNITS[k].mt][c])throw new Error(M.id+': '+k+' steht auf '+c)}
}

const tot={games:0,days:0,why:{},win:[0,0],first:[0,0],fh:{},power:0,acts:0};
for(const f of api.FHORD)tot.fh[f]={g:0,w:0};
const maps=process.env.MAP?api.MAPS.filter(m=>m.id===process.env.MAP):api.MAPS;
for(const M of maps){
  const res={g:0,days:0,win:[0,0],why:{},timeout:0};
  for(let k=0;k<GAMES;k++){
    const fh=[api.FHORD[rnd(5)],api.FHORD[rnd(5)]],first=k%2;
    const g=api.newMatch({map:M.id,fh,fog:!!process.env.FOG,ai:[1,1],names:['Rot','Blau'],first});
    let steps=0;
    while(!g.over&&g.day<=60){
      const act=api.aiNext(g);
      api.applyAct(g,act);
      if(++steps>200000)throw new Error('Endlosschleife auf '+M.id);
      // Zustand prüfen
      const seen=new Set();
      for(const u of g.units){
        if(seen.has(u.i))throw new Error('Zwei Einheiten auf einem Feld: '+M.id+' Tag '+g.day);
        seen.add(u.i);
        if(!(u.hp>0&&u.hp<=100))throw new Error('LP ungültig: '+u.hp);
        if(!api.MOVE[api.UNITS[u.k].mt][g.t[u.i]])throw new Error(u.k+' steht auf '+g.t[u.i]);
      }
      if(g.gold[0]<0||g.gold[1]<0)throw new Error('Gold negativ');
    }
    res.g++;res.days+=g.day;
    if(!g.over){res.timeout++;res.why.zeit=(res.why.zeit||0)+1}
    else{
      res.win[g.over.win]++;res.why[g.over.why]=(res.why[g.over.why]||0)+1;
      tot.first[g.over.win===first?0:1]++;tot.win[g.over.win]++;
      tot.fh[fh[g.over.win]].w++;
    }
    tot.fh[fh[0]].g++;tot.fh[fh[1]].g++;
    tot.power+=g.st.powers[0]+g.st.powers[1];
    if(VERB)console.log(`${M.id} #${k}: ${g.over?['Rot','Blau'][g.over.win]+' ('+g.over.why+')':'Zeit'} an Tag ${g.day}, ${fh.join(' gegen ')}, gebaut ${g.st.built}, Fähigkeiten ${g.st.powers}`);
  }
  tot.games+=res.g;tot.days+=res.days;
  for(const w in res.why)tot.why[w]=(tot.why[w]||0)+res.why[w];
  console.log(`${M.n.padEnd(14)} Ø ${(res.days/res.g).toFixed(1)} Tage · Rot ${res.win[0]} / Blau ${res.win[1]} · ${Object.entries(res.why).map(([k,v])=>k+' '+v).join(', ')}`);
}
console.log(`\nGesamt ${tot.games} Partien, Ø ${(tot.days/tot.games).toFixed(1)} Tage, Enden: ${Object.entries(tot.why).map(([k,v])=>k+' '+v).join(', ')}`);
console.log(`Wer zuerst zieht gewinnt: ${tot.first[0]} · wer als Zweiter zieht: ${tot.first[1]} · Rot ${tot.win[0]} · Blau ${tot.win[1]}`);
console.log(`Fähigkeiten je Partie und Spieler: ${(tot.power/tot.games/2).toFixed(1)}`);
console.log('Feldherren (Siegquote): '+api.FHORD.map(f=>`${f} ${(tot.fh[f].w/Math.max(1,tot.fh[f].g)*100).toFixed(0)} %`).join(' · '));
