import { GL } from '../lib/gl'

function PieceView({ piece }) {
  const isWhite = GL.isW(piece)
  const isKing = GL.isK(piece)
  return (
    <div className={`piece ${isWhite?'piece-w':'piece-b'}`}>
      <div className={`piece-ring ${isWhite?'piece-ring-w':'piece-ring-b'}`}/>
      {isKing && (
        <div className="piece-crown">
          <svg viewBox="0 0 24 24">
            <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"
              fill={isWhite?'#a07a48':'#e0b873'}
              stroke={isWhite?'#6b4423':'#2b1810'}
              strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export default function BoardView({ board, selected, legalDests, lastMove, perspective, onSquareClick }) {
  const rows = perspective==='w' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]
  const cols = perspective==='w' ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0]
  return (
    <div className="board-area">
      <div className="board-wrap">
        <div className="board-frame wood-grain">
          <div className="board-inner">
            <div className="board-grid">
              {rows.map(r => cols.map(c => {
                const dark = (r+c)%2===1
                const piece = board[r][c]
                const isSel = selected && selected[0]===r && selected[1]===c
                const isHint = legalDests.some(d => d[0]===r && d[1]===c)
                const isFrom = lastMove && lastMove.from[0]===r && lastMove.from[1]===c
                const isTo = lastMove && lastMove.to[0]===r && lastMove.to[1]===c
                return (
                  <div key={`${r}-${c}`}
                    className={`board-sq ${dark?'wood-grain':'wood-grain-light'}`}
                    onClick={() => dark && onSquareClick(r,c)}>
                    {(isFrom||isTo) && <div className="sq-hl-last"/>}
                    {isSel && <div className="sq-hl-sel"/>}
                    {isHint && !piece && <div className="hint-dot"/>}
                    {isHint && piece!==GL.E && <div className="sq-cap-ring"/>}
                    {piece!==GL.E && <PieceView piece={piece}/>}
                    {c===(perspective==='w'?0:7) && <span className="coord-lbl coord-row">{8-r}</span>}
                    {r===(perspective==='w'?7:0) && <span className="coord-lbl coord-col">{String.fromCharCode(97+c)}</span>}
                  </div>
                )
              }))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
