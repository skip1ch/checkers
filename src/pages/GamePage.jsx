import { useState, useEffect, useRef } from 'react'
import { GL } from '../lib/gl'
import { playSound } from '../lib/sound'
import { sb } from '../lib/supabase'
import { EMOJIS } from '../lib/themes'
import BoardView from '../components/BoardView'
import GameInfoSidebar from '../components/GameInfoSidebar'

const LEVEL_LABEL = { easy:'Лёгкий', medium:'Средний', hard:'Сложный' }

export default function GamePage({ mode, level, roomCode, myColor, oppName, ownedEmojis = ['thumb','heart','smile','fire'], onGameEnd, navigate }) {
  const [board, setBoard] = useState(() => GL.init())
  const [wt, setWt] = useState(true)
  const [sel, setSel] = useState(null)
  const [selMoves, setSelMoves] = useState([])
  const [allMoves, setAllMoves] = useState(() => GL.getMoves(GL.init(), true))
  const [lastMove, setLastMove] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [history, setHistory] = useState([])
  const [timer, setTimer] = useState(0)
  const [floatingEmoji, setFloatingEmoji] = useState(null)
  const chRef = useRef(null)
  const boardRef = useRef(board)
  boardRef.current = board
  const wtRef = useRef(wt)
  wtRef.current = wt
  const floatTimer = useRef(null)

  useEffect(() => {
    if (gameResult) return
    const id = setInterval(() => setTimer(t => t+1), 1000)
    return () => clearInterval(id)
  }, [gameResult])

  useEffect(() => {
    if (mode !== 'ai' || wt || gameResult) return
    setThinking(true)
    const delay = level==='hard' ? 900+Math.random()*600 : 500+Math.random()*400
    const tid = setTimeout(() => {
      const mv = GL.getAIMove(boardRef.current, false, level||'medium')
      setThinking(false)
      if (!mv) { setGameResult('W'); playSound('win'); return }
      if (mv.caps.length > 0) playSound('capture'); else playSound('move')
      const nb = GL.apply(boardRef.current, mv)
      setBoard(nb); setWt(true); setLastMove(mv)
      setSel(null); setSelMoves([])
      setAllMoves(GL.getMoves(nb, true))
      setHistory(h => [...h, { from:mv.from, to:mv.to, caps:mv.caps, white:false }])
      const winner = GL.checkWinner(nb, true)
      if (winner) setTimeout(() => { setGameResult(winner); playSound(winner==='W'?'win':'lose') }, 300)
    }, delay)
    return () => clearTimeout(tid)
  }, [wt, gameResult])

  useEffect(() => {
    if (mode !== 'friend' || !roomCode) return
    const ch = sb.channel(`room-${roomCode}`, {config:{broadcast:{self:false}}})
    chRef.current = ch
    ch.on('broadcast', {event:'move'}, ({payload}) => {
      const oppWT = myColor !== 'w'
      const m = payload.move
      if (m.caps.length > 0) playSound('capture'); else playSound('move')
      const nb = GL.apply(boardRef.current, m)
      const nwt = !oppWT
      setBoard(nb); setWt(nwt); setLastMove(m)
      setSel(null); setSelMoves([])
      setAllMoves(GL.getMoves(nb, nwt))
      setHistory(h => [...h, { from:m.from, to:m.to, caps:m.caps, white:oppWT }])
      const winner = GL.checkWinner(nb, nwt)
      if (winner) setTimeout(() => { setGameResult(winner); playSound(winner==='W'?'win':'lose') }, 300)
    })
    ch.on('broadcast', {event:'emoji'}, ({payload}) => {
      showEmoji(payload.char)
    })
    ch.subscribe()
    return () => ch.unsubscribe()
  }, [])

  function showEmoji(char) {
    setFloatingEmoji({ char, key: Date.now() })
    clearTimeout(floatTimer.current)
    floatTimer.current = setTimeout(() => setFloatingEmoji(null), 2200)
  }

  function sendEmoji(char) {
    showEmoji(char)
    if (chRef.current) {
      chRef.current.send({ type:'broadcast', event:'emoji', payload:{ char } })
    }
  }

  function doMove(mv) {
    const nb = GL.apply(board, mv)
    const nwt = !wt
    if (mv.caps.length > 0) playSound('capture'); else playSound('move')
    const wasKing = GL.isK(board[mv.from[0]][mv.from[1]])
    const isKingNow = GL.isK(nb[mv.to[0]][mv.to[1]])
    if (!wasKing && isKingNow) setTimeout(() => playSound('king'), 120)
    setBoard(nb); setWt(nwt); setLastMove(mv)
    setSel(null); setSelMoves([])
    setAllMoves(GL.getMoves(nb, nwt))
    setHistory(h => [...h, { from:mv.from, to:mv.to, caps:mv.caps, white:wt }])
    if (mode==='friend' && chRef.current) {
      chRef.current.send({type:'broadcast', event:'move', payload:{move:mv}})
    }
    const winner = GL.checkWinner(nb, nwt)
    if (winner) setTimeout(() => { setGameResult(winner); playSound(winner==='W'?'win':'lose') }, 300)
  }

  function handleClick(r, c) {
    if (gameResult || thinking) return
    if (mode==='ai' && !wt) return
    if (mode==='friend') {
      const myTurn = myColor==='w' ? wt : !wt
      if (!myTurn) return
    }
    const piece = board[r][c]
    if (sel && selMoves.some(m => m.to[0]===r && m.to[1]===c)) {
      doMove(selMoves.find(m => m.to[0]===r && m.to[1]===c))
      return
    }
    const mine = wt ? GL.isW(piece) : GL.isB(piece)
    if (mine) {
      const pm = allMoves.filter(m => m.from[0]===r && m.from[1]===c)
      if (pm.length) { setSel([r,c]); setSelMoves(pm) }
      return
    }
    setSel(null); setSelMoves([])
  }

  function resetGame() {
    const nb = GL.init()
    setBoard(nb); setWt(true)
    setSel(null); setSelMoves([])
    setAllMoves(GL.getMoves(nb, true))
    setLastMove(null); setGameResult(null)
    setHistory([]); setTimer(0); setThinking(false)
  }

  const perspective = mode==='friend' ? (myColor||'w') : mode==='local' ? (wt?'w':'b') : 'w'
  const legalDests = selMoves.map(m => m.to)
  const modeLabel = mode==='ai' ? `ИИ · ${LEVEL_LABEL[level]||'Средний'}` : mode==='local' ? 'Локальная партия' : `С другом${oppName?` · ${oppName}`:''}`
  const pageLabel = mode==='ai' ? 'Партия с ИИ' : mode==='local' ? 'Вдвоём за устройством' : 'Игра с другом'
  const pageTitle = mode==='ai' ? (LEVEL_LABEL[level]||'Средний')+' уровень' : mode==='local' ? 'Hot-seat партия' : 'Онлайн партия'

  const myEmojis = EMOJIS.filter(e => ownedEmojis.includes(e.id))

  return (
    <div className="game-page">
      <div className="game-header">
        <div className="game-header-left">
          <p>{pageLabel}</p>
          <h1>{pageTitle}</h1>
        </div>
        <div className="game-header-btns">
          <button className="btn-border" onClick={resetGame}>Новая партия</button>
          <button className="btn-primary btn-sm" onClick={() => navigate('play')}>Сменить режим</button>
        </div>
      </div>

      <div className="game-body">
        <div>
          <BoardView board={board} selected={sel} legalDests={legalDests} lastMove={lastMove} perspective={perspective} onSquareClick={handleClick}/>
          {mode === 'friend' && (
            <div className="emoji-panel">
              {myEmojis.map(e => (
                <button key={e.id} className="emoji-btn" title={e.name} onClick={() => sendEmoji(e.char)}>
                  {e.char}
                </button>
              ))}
            </div>
          )}
        </div>
        <GameInfoSidebar board={board} wt={wt} gameResult={gameResult} history={history} thinking={thinking} mode={modeLabel}/>
      </div>

      {floatingEmoji && (
        <div key={floatingEmoji.key} className="emoji-float-wrap">
          <span className="emoji-float-char">{floatingEmoji.char}</span>
        </div>
      )}

      {gameResult && (
        <div className="go-overlay">
          <div className="go-card">
            {(() => {
              let iWon
              if (mode === 'friend') iWon = (myColor === 'w') === (gameResult === 'W')
              else if (mode === 'local') iWon = null
              else iWon = gameResult === 'W'
              const showTrophy = iWon === null ? gameResult==='W' : iWon
              const title = iWon === null
                ? (gameResult==='W' ? 'Победили белые' : 'Победили чёрные')
                : (iWon ? 'Вы выиграли!' : 'Вы проиграли')
              return <>{showTrophy && <div className="go-icon">🏆</div>}<h2 className="go-title">{title}</h2></>
            })()}
            <p className="go-sub">{history.length} ходов · {String(Math.floor(timer/60)).padStart(2,'0')}:{String(timer%60).padStart(2,'0')}</p>
            <div className="go-btns">
              <button className="btn-primary" onClick={() => onGameEnd({ winner:gameResult, history, mode, level, timer, myColor })}>Разбор партии →</button>
              <button className="btn-border btn-full" onClick={resetGame}>Ещё раз</button>
              <button className="btn-border btn-full" onClick={() => navigate('play')}>Сменить режим</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
