const E = 0, W = 1, WK = 2, B = 3, BK = 4;
const isW = p => p === W || p === WK;
const isB = p => p === B || p === BK;
const isK = p => p === WK || p === BK;
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const dark = (r, c) => (r + c) % 2 === 1;
const clone = b => b.map(r => [...r]);
const had = (cs, r, c) => cs.some(([a, d]) => a === r && d === c);

function init() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(E));
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (!dark(r, c)) continue;
    if (r < 3) b[r][c] = B;
    if (r > 4) b[r][c] = W;
  }
  return b;
}

function findCaps(b, r, c, done, wt) {
  const p = b[r][c];
  const res = [];
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  if (isK(p)) {
    for (const [dr, dc] of DIRS) {
      let nr = r + dr, nc = c + dc, enemy = null;
      while (inB(nr, nc)) {
        const t = b[nr][nc];
        if (!enemy) {
          if (t !== E) {
            const isEnemy = wt ? isB(t) : isW(t);
            if (isEnemy && !had(done, nr, nc)) enemy = [nr, nc];
            else break;
          }
        } else {
          if (t !== E) break;
          const nd = [...done, enemy];
          const tb = clone(b);
          tb[r][c] = E; tb[enemy[0]][enemy[1]] = E; tb[nr][nc] = p;
          const more = findCaps(tb, nr, nc, nd, wt);
          if (more.length) more.forEach(m => res.push({ to: m.to, caps: [enemy, ...m.caps] }));
          else res.push({ to: [nr, nc], caps: [enemy] });
        }
        nr += dr; nc += dc;
      }
    }
  } else {
    for (const [dr, dc] of DIRS) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inB(lr, lc)) continue;
      const t = b[mr][mc];
      if (t === E) continue;
      const isEnemy = wt ? isB(t) : isW(t);
      if (!isEnemy || had(done, mr, mc) || b[lr][lc] !== E) continue;
      const promotes = (p === W && lr === 0) || (p === B && lr === 7);
      const nd = [...done, [mr, mc]];
      if (promotes) {
        res.push({ to: [lr, lc], caps: [[mr, mc]] });
      } else {
        const tb = clone(b);
        tb[r][c] = E; tb[mr][mc] = E; tb[lr][lc] = p;
        const more = findCaps(tb, lr, lc, nd, wt);
        if (more.length) more.forEach(m => res.push({ to: m.to, caps: [[mr, mc], ...m.caps] }));
        else res.push({ to: [lr, lc], caps: [[mr, mc]] });
      }
    }
  }
  return res;
}

function getMoves(b, wt) {
  const caps = [], regs = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c];
    if (p === E || (wt ? !isW(p) : !isB(p))) continue;
    const cs = findCaps(b, r, c, [], wt);
    if (cs.length) { cs.forEach(s => caps.push({ from: [r, c], to: s.to, caps: s.caps })); continue; }
    if (isK(p)) {
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        let nr = r + dr, nc = c + dc;
        while (inB(nr, nc) && b[nr][nc] === E) { regs.push({ from: [r, c], to: [nr, nc], caps: [] }); nr += dr; nc += dc; }
      }
    } else {
      const fwd = wt ? -1 : 1;
      for (const dc of [-1, 1]) {
        const nr = r + fwd, nc = c + dc;
        if (inB(nr, nc) && b[nr][nc] === E) regs.push({ from: [r, c], to: [nr, nc], caps: [] });
      }
    }
  }
  return caps.length ? caps : regs;
}

function apply(b, m) {
  const nb = clone(b);
  const [fr, fc] = m.from, [tr, tc] = m.to;
  const p = nb[fr][fc];
  nb[fr][fc] = E;
  m.caps.forEach(([cr, cc]) => nb[cr][cc] = E);
  let np = p;
  if (p === W && tr === 0) np = WK;
  if (p === B && tr === 7) np = BK;
  nb[tr][tc] = np;
  return nb;
}

function evalBoard(b) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c];
    const cb = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 0.5 : 0;
    if (p === W) s += 10 + (7 - r) * 0.4 + cb;
    else if (p === WK) s += 32 + cb;
    else if (p === B) s -= 10 + r * 0.4 + cb;
    else if (p === BK) s -= 32 + cb;
  }
  return s;
}

function minimax(b, depth, alpha, beta, maximizing, wt) {
  const mvs = getMoves(b, wt);
  if (!depth || !mvs.length) return mvs.length ? evalBoard(b) : (maximizing ? -10000 : 10000);
  if (maximizing) {
    let v = -Infinity;
    for (const m of mvs) { v = Math.max(v, minimax(apply(b, m), depth - 1, alpha, beta, false, !wt)); alpha = Math.max(alpha, v); if (beta <= alpha) break; }
    return v;
  } else {
    let v = Infinity;
    for (const m of mvs) { v = Math.min(v, minimax(apply(b, m), depth - 1, alpha, beta, true, !wt)); beta = Math.min(beta, v); if (beta <= alpha) break; }
    return v;
  }
}

function getAIMove(b, wt, diff) {
  const mvs = getMoves(b, wt);
  if (!mvs.length) return null;
  if (diff === 'easy') {
    if (Math.random() < 0.6) return mvs[Math.floor(Math.random() * mvs.length)];
    let best = null, bs = wt ? -Infinity : Infinity;
    for (const m of mvs) { const s = evalBoard(apply(b, m)); if (wt ? s > bs : s < bs) { bs = s; best = m; } }
    return best;
  }
  const depth = diff === 'medium' ? 3 : 5;
  let best = null, bs = wt ? -Infinity : Infinity;
  for (const m of mvs) {
    const s = minimax(apply(b, m), depth - 1, -Infinity, Infinity, !wt, !wt);
    if (wt ? s > bs : s < bs) { bs = s; best = m; }
  }
  if (diff === 'medium' && Math.random() < 0.2) return mvs[Math.floor(Math.random() * mvs.length)];
  return best;
}

function checkWinner(b, wt) {
  if (!getMoves(b, wt).length) return wt ? 'B' : 'W';
  let w = 0, bl = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { if (isW(b[r][c])) w++; else if (isB(b[r][c])) bl++; }
  if (!w) return 'B';
  if (!bl) return 'W';
  return null;
}

export const GL = { E, W, WK, B, BK, isW, isB, isK, dark, init, getMoves, apply, getAIMove, checkWinner };
