import { GL } from '../lib/gl'

export default function MiniBoard({ boardState, fromSq, toSq }) {
  return (
    <div className="mini-board-wrap">
      <div className="mini-board">
        {Array.from({length:64}, (_,i) => {
          const r = Math.floor(i/8), c = i%8
          const isDark = GL.dark(r,c), piece = boardState[r][c]
          const isFrom = fromSq && fromSq[0]===r && fromSq[1]===c
          const isTo = toSq && toSq[0]===r && toSq[1]===c
          const hasP = piece !== GL.E, isWp = hasP && GL.isW(piece)
          return (
            <div key={i} className={`mini-sq ${isDark?'wood-grain':'wood-grain-light'}`}>
              {isFrom && <div className="mini-sq-hl-from"/>}
              {isTo && <div className="mini-sq-hl-to"/>}
              {hasP && <div className={`mini-pc${isWp?' mini-pw':' mini-pb'}`}/>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
