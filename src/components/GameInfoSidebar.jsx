import { GL } from '../lib/gl'

export default function GameInfoSidebar({ board, wt, gameResult, history, thinking, mode }) {
  let wCount=0, bCount=0, wkCount=0, bkCount=0
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=board[r][c]
    if (GL.isW(p)) { wCount++; if (GL.isK(p)) wkCount++ }
    else if (GL.isB(p)) { bCount++; if (GL.isK(p)) bkCount++ }
  }
  const fmtSq = m => m ? String.fromCharCode(97+m.to[1])+(8-m.to[0]) : ''
  const pairs = []
  for (let i=0;i<history.length;i+=2) pairs.push([history[i], history[i+1]])

  return (
    <div className="game-sidebar">
      <div className="gi-card">
        <p className="gi-label">Режим</p>
        <p className="gi-value">{mode}</p>
      </div>

      <div className="gi-card">
        <p className="gi-label">Ход</p>
        {gameResult ? (
          <p className="gi-value-lg">{gameResult==='W'?'Победили белые':'Победили чёрные'}</p>
        ) : (
          <div className="gi-turn-row">
            <div className="gi-turn-piece" style={{background: wt ? 'linear-gradient(180deg,#fff7ea,#d9c2a0)' : 'linear-gradient(180deg,#3a2516,#0e0805)'}}/>
            <p className="gi-value-lg">{wt?'Белые':'Чёрные'}</p>
            {thinking && <span className="gi-thinking">думает…</span>}
          </div>
        )}
      </div>

      <div className="gi-counts">
        <div className="gi-count-card">
          <p className="gi-label">Белые</p>
          <p className="gi-count-num">{wCount}</p>
          <p className="gi-count-sub">дамок: {wkCount}</p>
        </div>
        <div className="gi-count-card">
          <p className="gi-label">Чёрные</p>
          <p className="gi-count-num">{bCount}</p>
          <p className="gi-count-sub">дамок: {bkCount}</p>
        </div>
      </div>

      <div className="gi-card gi-history">
        <p className="gi-label">История ходов</p>
        {history.length===0 ? (
          <p className="gi-no-moves">Партия ещё не началась</p>
        ) : (
          <div className="gi-moves">
            {pairs.map(([w,b],i) => (
              <div key={i} className="gi-move-row">
                <span className="gi-move-num">{i+1}.</span>
                <span>{fmtSq(w)}</span>
                <span>{b ? fmtSq(b) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
