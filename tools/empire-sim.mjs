// Spiel-Test für Football Empire: lädt den Logik-Teil und spielt ganze Partien mit Computer-Managern durch.
// Aufruf: node tools/empire-sim.mjs [Datei] [Partien] [Vereine]
// Gibt Tore pro Spiel, Heimsiege, Geldverlauf, Ruhm am Ende und Auffälligkeiten aus.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const src = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'empire.html');
const GAMES = +(process.argv[3] || 20);
const ONLY = process.argv[4] ? +process.argv[4] : 0;
let code = fs.readFileSync(src, 'utf8');
const a = code.indexOf('// ==LOGIK-ANFANG=='), b = code.indexOf('// ==LOGIK-ENDE==');
if (a < 0 || b < 0) { console.error('Logik-Markierungen nicht gefunden'); process.exit(1); }
code = code.slice(a, b);
const api = new Function(code + `;return {newGame,addClub,startGame,advance,liveStep,draftStep,enterPhase,pubView,privView,applyAction,pValue,teamPreview,tableOrder,
  setNow:f=>{NOW=f}, setSeed:s=>{SEED=s>>>0}, CARDS, FORMS};`)();

let clock = 1e12;
api.setNow(() => clock);
const stats = { matches: 0, goals: 0, home: 0, draw: 0, away: 0, maxGoals: 0, red: 0, inj: 0, elf: 0, duels: 0, upsets: 0, strongGames: 0, seconds: 0, debts: 0, amateurs: 0 };
const topScorers = [], finalRuhm = [], finalMoney = [], winnersRuhm = [], marketSold = [], marketTotal = [];
function playGame(n, seed) {
  api.setSeed(seed);
  const G = api.newGame({ seasons: 3, len: 'kurz', dice: 'auto' });
  const names = ['FC Nordlicht', 'SV Kesselberg', 'Union Eichwald', 'Rot-Weiß Hafenstadt', 'Eintracht Mühlental', 'Borussia Steinbach', 'TSV Moorbach', 'VfL Sandhausen'];
  for (let i = 0; i < n; i++) api.addClub(G, { name: names[i], bot: true, mgr: 'Bot ' + (i + 1) });
  if (!api.startGame(G)) throw new Error('start failed');
  let guard = 0;
  const t0 = clock;
  while (G.phase !== 'ende') {
    if (++guard > 200000) throw new Error('hängt in Phase ' + G.phase);
    if (G.phase === 'spiel') {
      const pre = G.live ? G.live.ms.map(m => [m.h, m.a, api.teamPreview(G, G.clubs.find(c => c.id === m.h)), api.teamPreview(G, G.clubs.find(c => c.id === m.a))]) : [];
      while (G.phase === 'spiel') {
        clock += 100; api.liveStep(G, clock);
        if (G.live) for (const m of G.live.ms) if (m.duel && !m.duel._c) { m.duel._c = 1; stats.duels++; if (m.duel.kind === 'elf') stats.elf++; }
        if (G.live) for (const m of G.live.ms) for (const e of m.ev) if (!e._c) { e._c = 1; if (e.t === 'red') stats.red++; if (e.t === 'inj') stats.inj++; }
      }
      for (const r of G.results.list) {
        stats.matches++; stats.goals += r.hg + r.ag; stats.maxGoals = Math.max(stats.maxGoals, r.hg + r.ag);
        if (r.hg > r.ag) stats.home++; else if (r.hg === r.ag) stats.draw++; else stats.away++;
        const p = pre.find(x => x[0] === r.h);
        if (p) {
          const sh = p[2].D + p[2].M + p[2].A + p[2].K, sa = p[3].D + p[3].M + p[3].A + p[3].K;
          if (Math.abs(sh - sa) >= 3) { stats.strongGames++; if ((sh > sa && r.hg < r.ag) || (sa > sh && r.ag < r.hg)) stats.upsets++; }
        }
      }
      for (const c of G.clubs) if (c.money < 0) stats.debts++;
      continue;
    }
    if (G.phase === 'saisonende' && G.report) { const a = G.report.awards.find(x => x.k === 'tore'); if (a) topScorers.push(+((a.d.match(/\((\d+)/) || [])[1] || 0) / G.seasonLen); }
    if (G.phase === 'aufdecken') { const res = G.reveal ? G.reveal.res : []; marketTotal.push(res.length); marketSold.push(res.filter(x => x.winner).length); }
    clock += 20000;
    api.advance(G, true);
    JSON.stringify(api.pubView(G)); for (const c of G.clubs) JSON.stringify(api.privView(G, c));
  }
  stats.seconds += (clock - t0) / 1000;
  for (const c of G.clubs) { finalRuhm.push(c.ruhm); finalMoney.push(c.money / 10); stats.amateurs += c.players.filter(p => p.amateur).length; }
  winnersRuhm.push(Math.max(...G.clubs.map(c => c.ruhm)));
  return G;
}
const sizes = ONLY ? [ONLY] : [2, 3, 4, 5, 6];
let gi = 0;
for (const n of sizes) for (let g = 0; g < GAMES; g++) playGame(n, 12345 + (gi++) * 7919);
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length);
console.log('Partien:', gi, '| Spiele:', stats.matches);
console.log('Tore/Spiel:', (stats.goals / stats.matches).toFixed(2), '| max', stats.maxGoals, '| Heim/Unentsch./Auswärts %:', [stats.home, stats.draw, stats.away].map(x => (100 * x / stats.matches).toFixed(0)).join('/'));
console.log('Torduelle/Spiel:', (stats.duels / stats.matches).toFixed(2), '| Elfmeter/Spiel:', (stats.elf / stats.matches).toFixed(2), '| Rote/Spiel:', (stats.red / stats.matches).toFixed(2), '| Verletzungen/Spiel:', (stats.inj / stats.matches).toFixed(2));
console.log('Klar stärkeres Team (≥3 Punkte) verliert:', stats.strongGames ? (100 * stats.upsets / stats.strongGames).toFixed(0) + '% von ' + stats.strongGames : '–');
console.log('Ruhm am Ende Ø', avg(finalRuhm).toFixed(1), '| Sieger Ø', avg(winnersRuhm).toFixed(1), '| min', Math.min(...finalRuhm), '| max', Math.max(...finalRuhm));
console.log('Geld am Ende Ø', avg(finalMoney).toFixed(1), 'Mio | min', Math.min(...finalMoney).toFixed(1), '| max', Math.max(...finalMoney).toFixed(1), '| Spieltage mit Schulden (Verein):', stats.debts);
console.log('Transfermarkt: Ø Karten', avg(marketTotal).toFixed(1), '| Ø verkauft', avg(marketSold).toFixed(1), '| Amateure am Ende', stats.amateurs);
console.log('Torschützenkönig: Ø Tore pro Spieltag', avg(topScorers).toFixed(2), '| max', Math.max(...topScorers).toFixed(2));
console.log('Simulierte Live-Zeit pro Partie (nur Spiele):', (stats.seconds / gi / 60).toFixed(1), 'min');
