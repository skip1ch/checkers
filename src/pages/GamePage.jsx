import { useState, useEffect, useRef } from 'react'
import { GL } from '../lib/gl'
import { playSound } from '../lib/sound'
import { sb } from '../lib/supabase'
import { EMOJIS } from '../lib/themes'
import BoardView from '../components/BoardView'
import GameInfoSidebar from '../components/GameInfoSidebar'
import ConfirmModal from '../components/ConfirmModal'

const LEVEL_LABEL = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }
const DRAW_SECONDS = 600 // 10 minutes

export default function GamePage({
  mode, level, roomCode, myColor, oppName,
  selectedEmojis = ['shush', 'wait', 'cry', 'lol', 'shake', 'clap', 'think'],
  initialBoard, initialWt, initialHistory, initialTimer,
  onMove, onGameEnd, navigate,
}) {
  const [board, setBoard] = useState(() => initialBoard || GL.init())
  const [wt, setWt] = useState(() => initialBoard ? (initialWt ?? true) : true)
  const [sel, setSel] = useState(null)
  const [selMoves, setSelMoves] = useState([])
  const [allMoves, setAllMoves] = useState(() => {
    const ib = initialBoard || GL.init()
    const iw = initialBoard ? (initialWt ?? true) : true
    return GL.getMoves(ib, iw)
  })
  const [lastMove, setLastMove] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [history, setHistory] = useState(() => initialHistory || [])
  const [timer, setTimer] = useState(() => initialTimer || 0)
  const [myEmoji, setMyEmoji] = useState(null)
  const [oppEmoji, setOppEmoji] = useState(null)
  const [showResignModal, setShowResignModal] = useState(false)

  const chRef = useRef(null)
  const boardRef = useRef(board); boardRef.current = board
  const wtRef = useRef(wt); wtRef.current = wt
  const historyRef = useRef(history); historyRef.current = history
  const timerRef = useRef(timer); timerRef.current = timer
  const floatTimer = useRef(null)
  const statsFiredRef = useRef(false)
  const syncDebounce = useRef(null)

  /* ── helpers ─────────────────────────────────────────── */

  function fireEnd(showReplay = false) {
    if (!statsFiredRef.current) {
      statsFiredRef.current = true
      localStorage.removeItem('activeMatch')
      onGameEnd({ winner: gameResult, history: historyRef.current, mode, level, timer: timerRef.current, myColor, showReplay })
    } else if (showReplay) {
      navigate('postgame')
    }
  }

  // Persist board state for rejoin (friend mode)
  function syncActiveMatch(newBoard, newWt, newHistory) {
    const saved = JSON.parse(localStorage.getItem('activeMatch') || '{}')
    const updated = {
      ...saved,
      board: newBoard,
      wt: newWt,
      history: newHistory,
      timer: timerRef.current,
      ts: Date.now(),
    }
    localStorage.setItem('activeMatch', JSON.stringify(updated))
    // Debounce Supabase write — max one write per second
    clearTimeout(syncDebounce.current)
    syncDebounce.current = setTimeout(() => onMove?.(updated), 1000)
  }

  /* ── on mount ─────────────────────────────────────────── */

  useEffect(() => {
    if (mode === 'friend' && roomCode) {
      const entry = { roomCode, myColor, oppName: oppName || '', ts: Date.now() }
      localStorage.setItem('activeMatch', JSON.stringify(entry))
      onMove?.(entry) // initial Supabase save
    }
    return () => {
      if (statsFiredRef.current) localStorage.removeItem('activeMatch')
    }
  }, [])

  /* ── game clock ───────────────────────────────────────── */

  useEffect(() => {
    if (gameResult) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [gameResult])

  // 10-minute draw — all modes
  useEffect(() => {
    if (!gameResult && timer >= DRAW_SECONDS) setGameResult('DRAW')
  }, [timer, gameResult])

  /* ── AI move ──────────────────────────────────────────── */

  useEffect(() => {
    if (mode !== 'ai' || wt || gameResult) return
    setThinking(true)
    const delay = level === 'hard' ? 900 + Math.random() * 600 : 500 + Math.random() * 400
    const tid = setTimeout(() => {
      const mv = GL.getAIMove(boardRef.current, false, level || 'medium')
      setThinking(false)
      if (!mv) { setGameResult('W'); playSound('win'); return }
      if (mv.caps.length > 0) playSound('capture'); else playSound('move')
      const nb = GL.apply(boardRef.current, mv)
      setBoard(nb); setWt(true); setLastMove(mv)
      setSel(null); setSelMoves([])
      setAllMoves(GL.getMoves(nb, true))
      setHistory(h => [...h, { from: mv.from, to: mv.to, caps: mv.caps, white: false }])
      const winner = GL.checkWinner(nb, true)
      if (winner) setTimeout(() => { setGameResult(winner); playSound(winner === 'W' ? 'win' : 'lose') }, 300)
    }, delay)
    return () => clearTimeout(tid)
  }, [wt, gameResult])

  /* ── friend channel ───────────────────────────────────── */

  useEffect(() => {
    if (mode !== 'friend' || !roomCode) return
    const ch = sb.channel(`room-${roomCode}`, { config: { broadcast: { self: false } } })
    chRef.current = ch

    ch.on('broadcast', { event: 'move' }, ({ payload }) => {
      const oppWT = myColor !== 'w'
      const m = payload.move
      if (m.caps.length > 0) playSound('capture'); else playSound('move')
      const nb = GL.apply(boardRef.current, m)
      const nwt = !oppWT
      const newHist = [...historyRef.current, { from: m.from, to: m.to, caps: m.caps, white: oppWT }]
      setBoard(nb); setWt(nwt); setLastMove(m)
      setSel(null); setSelMoves([])
      setAllMoves(GL.getMoves(nb, nwt))
      setHistory(newHist)
      syncActiveMatch(nb, nwt, newHist)
      const winner = GL.checkWinner(nb, nwt)
      if (winner) setTimeout(() => { setGameResult(winner); playSound(winner === 'W' ? 'win' : 'lose') }, 300)
    })

    ch.on('broadcast', { event: 'emoji' }, ({ payload }) => {
      setOppEmoji({ char: payload.char, key: Date.now() })
      clearTimeout(floatTimer.current)
      floatTimer.current = setTimeout(() => setOppEmoji(null), 2400)
    })

    ch.on('broadcast', { event: 'resign' }, () => {
      const myWinColor = myColor === 'w' ? 'W' : 'B'
      setGameResult(myWinColor)
      playSound('win')
      localStorage.removeItem('activeMatch')
    })

    // Board state sync — peer asks for current state
    ch.on('broadcast', { event: 'state_request' }, () => {
      if (historyRef.current.length > 0) {
        ch.send({
          type: 'broadcast', event: 'state_sync',
          payload: { board: boardRef.current, wt: wtRef.current, history: historyRef.current, timer: timerRef.current },
        })
      }
    })

    // Board state sync — we receive state after reconnecting
    ch.on('broadcast', { event: 'state_sync' }, ({ payload }) => {
      if (payload.history && payload.history.length > historyRef.current.length) {
        setBoard(payload.board)
        setWt(payload.wt)
        setHistory(payload.history)
        setAllMoves(GL.getMoves(payload.board, payload.wt))
        if (payload.timer) setTimer(payload.timer)
        setLastMove(null)
      }
    })

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Request state in case we reconnected and missed moves
        ch.send({ type: 'broadcast', event: 'state_request', payload: {} })
      }
    })

    return () => ch.unsubscribe()
  }, [])

  /* ── move handling ────────────────────────────────────── */

  function sendEmoji(char) {
    setMyEmoji({ char, key: Date.now() })
    setTimeout(() => setMyEmoji(null), 2400)
    if (mode === 'friend' && chRef.current) {
      chRef.current.send({ type: 'broadcast', event: 'emoji', payload: { char } })
    }
  }

  function doMove(mv) {
    const nb = GL.apply(board, mv)
    const nwt = !wt
    const newHistory = [...history, { from: mv.from, to: mv.to, caps: mv.caps, white: wt }]

    if (mv.caps.length > 0) playSound('capture'); else playSound('move')
    const wasKing = GL.isK(board[mv.from[0]][mv.from[1]])
    const isKingNow = GL.isK(nb[mv.to[0]][mv.to[1]])
    if (!wasKing && isKingNow) setTimeout(() => playSound('king'), 120)

    setBoard(nb); setWt(nwt); setLastMove(mv)
    setSel(null); setSelMoves([])
    setAllMoves(GL.getMoves(nb, nwt))
    setHistory(newHistory)

    if (mode === 'friend') {
      syncActiveMatch(nb, nwt, newHistory)
      chRef.current?.send({ type: 'broadcast', event: 'move', payload: { move: mv } })
    }

    const winner = GL.checkWinner(nb, nwt)
    if (winner) setTimeout(() => { setGameResult(winner); playSound(winner === 'W' ? 'win' : 'lose') }, 300)
  }

  function handleClick(r, c) {
    if (gameResult || thinking) return
    if (mode === 'ai' && !wt) return
    if (mode === 'friend') {
      const myTurn = myColor === 'w' ? wt : !wt
      if (!myTurn) return
    }
    const piece = board[r][c]
    if (sel && selMoves.some(m => m.to[0] === r && m.to[1] === c)) {
      doMove(selMoves.find(m => m.to[0] === r && m.to[1] === c))
      return
    }
    const mine = wt ? GL.isW(piece) : GL.isB(piece)
    if (mine) {
      const pm = allMoves.filter(m => m.from[0] === r && m.from[1] === c)
      if (pm.length) { setSel([r, c]); setSelMoves(pm) }
      return
    }
    setSel(null); setSelMoves([])
  }

  function resetGame() {
    statsFiredRef.current = false
    const nb = GL.init()
    setBoard(nb); setWt(true)
    setSel(null); setSelMoves([])
    setAllMoves(GL.getMoves(nb, true))
    setLastMove(null); setGameResult(null)
    setHistory([]); setTimer(0); setThinking(false)
  }

  function doResign() {
    setShowResignModal(false)
    const oppColor = myColor === 'w' ? 'B' : 'W'
    chRef.current?.send({ type: 'broadcast', event: 'resign', payload: {} })
    setGameResult(oppColor)
    playSound('lose')
    localStorage.removeItem('activeMatch')
  }

  /* ── derived values ───────────────────────────────────── */

  const perspective = mode === 'friend' ? (myColor || 'w') : mode === 'local' ? (wt ? 'w' : 'b') : 'w'
  const legalDests = selMoves.map(m => m.to)
  const modeLabel = mode === 'ai'
    ? `ИИ · ${LEVEL_LABEL[level] || 'Средний'}`
    : mode === 'local' ? 'Локальная партия'
    : `С другом${oppName ? ` · ${oppName}` : ''}`
  const pageLabel = mode === 'ai' ? 'Партия с ИИ' : mode === 'local' ? 'Вдвоём за устройством' : 'Игра с другом'
  const pageTitle = mode === 'ai'
    ? (LEVEL_LABEL[level] || 'Средний') + ' уровень'
    : mode === 'local' ? 'Hot-seat партия' : 'Онлайн партия'

  const panelEmojis = EMOJIS.filter(e => selectedEmojis.includes(e.id))

  // Timer display
  const timeLeft = Math.max(0, DRAW_SECONDS - timer)
  const timerUrgent = timeLeft < 60
  const timerWarn = timeLeft >= 60 && timeLeft < 120
  const timerMins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const timerSecs = String(timeLeft % 60).padStart(2, '0')

  // Overlay
  const isDraw = gameResult === 'DRAW'
  let iWon = null
  if (!isDraw) {
    if (mode === 'friend') iWon = (myColor === 'w') === (gameResult === 'W')
    else if (mode === 'local') iWon = null
    else iWon = gameResult === 'W'
  }
  let trophyDelta = 0
  if (!isDraw && gameResult) {
    if (mode === 'ai' && iWon) {
      trophyDelta = level === 'easy' ? 5 : level === 'medium' ? 10 : 20
    } else if (mode === 'friend') {
      trophyDelta = iWon ? 25 : -5
    }
  }
  const overlayTitle = isDraw
    ? '⏱ Ничья — время вышло'
    : iWon === null
      ? (gameResult === 'W' ? 'Победили белые' : 'Победили чёрные')
      : (iWon ? 'Вы выиграли!' : 'Вы проиграли')
  const showTrophy = !isDraw && (iWon === null ? gameResult === 'W' : iWon)

  /* ── render ───────────────────────────────────────────── */

  return (
    <div className="game-page">
      {showResignModal && (
        <ConfirmModal
          title="Сдаться?"
          message="Это засчитается как поражение. Вы уверены?"
          confirmLabel="Да, сдаться"
          cancelLabel="Отмена"
          danger
          onConfirm={doResign}
          onCancel={() => setShowResignModal(false)}
        />
      )}

      <div className="game-header">
        <div className="game-header-left">
          <p>{pageLabel}</p>
          <h1>{pageTitle}</h1>
        </div>

        {/* Countdown timer */}
        <div className={`game-timer-chip${timerUrgent ? ' timer-urgent' : timerWarn ? ' timer-warn' : ''}`}>
          <span className="timer-icon">⏱</span>
          <span className="timer-value">{timerMins}:{timerSecs}</span>
          <div className="timer-bar">
            <div className="timer-bar-fill" style={{ width: `${(timeLeft / DRAW_SECONDS) * 100}%` }} />
          </div>
        </div>

        <div className="game-header-btns">
          <button className="btn-border" onClick={resetGame}>Новая партия</button>
          <button className="btn-primary btn-sm" onClick={() => navigate('play')}>Сменить режим</button>
          {!gameResult && mode === 'friend' && (
            <button className="btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(192,57,43,0.3)' }}
              onClick={() => setShowResignModal(true)}>
              Сдаться
            </button>
          )}
          {!gameResult && (mode === 'ai' || mode === 'local') && (
            <button className="btn-ghost btn-sm" style={{ color: 'var(--text2)' }}
              onClick={() => navigate('play')}>Завершить</button>
          )}
        </div>
      </div>

      <div className="game-body">
        <div>
          <BoardView
            board={board} selected={sel} legalDests={legalDests}
            lastMove={lastMove} perspective={perspective} onSquareClick={handleClick}
          />
          {/* Emoji panel — all modes */}
          <div className="emoji-panel">
            {panelEmojis.map(e => (
              <button key={e.id} className="emoji-btn" title={e.name} onClick={() => sendEmoji(e.char)}>
                {e.char}
              </button>
            ))}
          </div>
        </div>
        <GameInfoSidebar
          board={board} wt={wt} gameResult={gameResult}
          history={history} thinking={thinking} mode={modeLabel}
        />
      </div>

      {myEmoji && (
        <div key={myEmoji.key} className="emoji-float-wrap emoji-float-mine">
          <span className="emoji-float-char">{myEmoji.char}</span>
        </div>
      )}
      {oppEmoji && (
        <div key={oppEmoji.key} className="emoji-float-wrap emoji-float-opp">
          <span className="emoji-float-char">{oppEmoji.char}</span>
        </div>
      )}

      {gameResult && (
        <div className="go-overlay">
          <div className="go-card">
            {showTrophy && <div className="go-icon">🏆</div>}
            {isDraw && <div className="go-icon">🤝</div>}
            <h2 className="go-title">{overlayTitle}</h2>
            <p className="go-sub">
              {history.length} ходов ·{' '}
              {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
            </p>
            {trophyDelta !== 0 && (
              <div className={`go-trophy-delta ${trophyDelta > 0 ? 'positive' : 'negative'}`}>
                {trophyDelta > 0 ? `+${trophyDelta}` : trophyDelta} 🏆
              </div>
            )}
            {isDraw && <div className="go-trophy-delta neutral">Без изменений 🏆</div>}
            <div className="go-btns">
              <button className="btn-primary" onClick={() => fireEnd(true)}>Разбор партии →</button>
              <button className="btn-border btn-full" onClick={() => { fireEnd(false); resetGame() }}>Ещё раз</button>
              <button className="btn-border btn-full" onClick={() => { fireEnd(false); navigate('play') }}>Сменить режим</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
