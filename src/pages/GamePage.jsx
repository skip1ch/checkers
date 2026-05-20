import { useState, useEffect, useRef } from 'react'
import { GL } from '../lib/gl'
import { playSound } from '../lib/sound'
import { sb } from '../lib/supabase'
import { EMOJIS } from '../lib/themes'
import BoardView from '../components/BoardView'
import GameInfoSidebar from '../components/GameInfoSidebar'
import ConfirmModal from '../components/ConfirmModal'

const LEVEL_LABEL = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }
const PLAYER_SECS = 420 // 7 minutes each

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function GamePage({
  mode, level, roomCode, myColor, oppName, oppAvatar,
  selectedEmojis = ['shush', 'wait', 'cry', 'lol', 'shake'],
  initialBoard, initialWt, initialHistory, initialWhiteTime, initialBlackTime,
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
  const [whiteTime, setWhiteTime] = useState(() => initialWhiteTime ?? PLAYER_SECS)
  const [blackTime, setBlackTime] = useState(() => initialBlackTime ?? PLAYER_SECS)
  const [myEmoji, setMyEmoji] = useState(null)
  const [oppEmoji, setOppEmoji] = useState(null)
  const [showResignModal, setShowResignModal] = useState(false)

  const chRef = useRef(null)
  const boardRef = useRef(board); boardRef.current = board
  const wtRef = useRef(wt); wtRef.current = wt
  const historyRef = useRef(history); historyRef.current = history
  const whiteTimeRef = useRef(whiteTime); whiteTimeRef.current = whiteTime
  const blackTimeRef = useRef(blackTime); blackTimeRef.current = blackTime
  const floatTimer = useRef(null)
  const statsFiredRef = useRef(false)
  const syncDebounce = useRef(null)

  /* ── helpers ─────────────────────────────────────────── */

  function elapsedSeconds() {
    return (PLAYER_SECS - whiteTimeRef.current) + (PLAYER_SECS - blackTimeRef.current)
  }

  function fireEnd(showReplay = false) {
    if (!statsFiredRef.current) {
      statsFiredRef.current = true
      localStorage.removeItem('activeMatch')
      onGameEnd({ winner: gameResult, history: historyRef.current, mode, level, timer: elapsedSeconds(), myColor, oppName, showReplay })
    } else if (showReplay) {
      navigate('postgame')
    }
  }

  function syncActiveMatch(newBoard, newWt, newHistory) {
    const saved = JSON.parse(localStorage.getItem('activeMatch') || '{}')
    const updated = {
      ...saved, board: newBoard, wt: newWt, history: newHistory,
      whiteTime: whiteTimeRef.current, blackTime: blackTimeRef.current,
      ts: Date.now(),
    }
    localStorage.setItem('activeMatch', JSON.stringify(updated))
    clearTimeout(syncDebounce.current)
    syncDebounce.current = setTimeout(() => onMove?.(updated), 1000)
  }

  /* ── on mount ─────────────────────────────────────────── */

  useEffect(() => {
    if (mode === 'friend' && roomCode) {
      const entry = { roomCode, myColor, oppName: oppName || '', ts: Date.now() }
      localStorage.setItem('activeMatch', JSON.stringify(entry))
      onMove?.(entry)
    }
    return () => { if (statsFiredRef.current) localStorage.removeItem('activeMatch') }
  }, [])

  /* ── per-player clock ────────────────────────────────── */

  useEffect(() => {
    if (gameResult) return
    const id = setInterval(() => {
      if (wtRef.current) {
        const next = whiteTimeRef.current - 1
        whiteTimeRef.current = next
        setWhiteTime(next)
        if (next <= 0) { setGameResult('B'); playSound('lose') }
      } else {
        const next = blackTimeRef.current - 1
        blackTimeRef.current = next
        setBlackTime(next)
        if (next <= 0) { setGameResult('W'); playSound('win') }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [gameResult])

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
      setGameResult(myColor === 'w' ? 'W' : 'B')
      playSound('win')
      localStorage.removeItem('activeMatch')
    })

    ch.on('broadcast', { event: 'state_request' }, () => {
      if (historyRef.current.length > 0) {
        ch.send({
          type: 'broadcast', event: 'state_sync',
          payload: { board: boardRef.current, wt: wtRef.current, history: historyRef.current, whiteTime: whiteTimeRef.current, blackTime: blackTimeRef.current },
        })
      }
    })

    ch.on('broadcast', { event: 'state_sync' }, ({ payload }) => {
      if (payload.history && payload.history.length > historyRef.current.length) {
        setBoard(payload.board); setWt(payload.wt); setHistory(payload.history)
        setAllMoves(GL.getMoves(payload.board, payload.wt)); setLastMove(null)
        if (payload.whiteTime != null) { setWhiteTime(payload.whiteTime); whiteTimeRef.current = payload.whiteTime }
        if (payload.blackTime != null) { setBlackTime(payload.blackTime); blackTimeRef.current = payload.blackTime }
      }
    })

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: 'state_request', payload: {} })
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
    if (!wasKing && GL.isK(nb[mv.to[0]][mv.to[1]])) setTimeout(() => playSound('king'), 120)
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
    if (mode === 'friend' && !(myColor === 'w' ? wt : !wt)) return
    const piece = board[r][c]
    if (sel && selMoves.some(m => m.to[0] === r && m.to[1] === c)) {
      doMove(selMoves.find(m => m.to[0] === r && m.to[1] === c)); return
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
    setBoard(nb); setWt(true); setSel(null); setSelMoves([])
    setAllMoves(GL.getMoves(nb, true)); setLastMove(null); setGameResult(null)
    setHistory([]); setThinking(false)
    setWhiteTime(PLAYER_SECS); setBlackTime(PLAYER_SECS)
    whiteTimeRef.current = PLAYER_SECS; blackTimeRef.current = PLAYER_SECS
  }

  function doResign() {
    setShowResignModal(false)
    chRef.current?.send({ type: 'broadcast', event: 'resign', payload: {} })
    setGameResult(myColor === 'w' ? 'B' : 'W')
    playSound('lose')
    localStorage.removeItem('activeMatch')
  }

  /* ── derived ──────────────────────────────────────────── */

  const perspective = mode === 'friend' ? (myColor || 'w') : mode === 'local' ? (wt ? 'w' : 'b') : 'w'
  const legalDests = selMoves.map(m => m.to)
  const modeLabel = mode === 'ai' ? `ИИ · ${LEVEL_LABEL[level] || 'Средний'}` : mode === 'local' ? 'Локальная партия' : `С другом${oppName ? ` · ${oppName}` : ''}`
  const pageLabel = mode === 'ai' ? 'Партия с ИИ' : mode === 'local' ? 'Вдвоём за устройством' : 'Игра с другом'
  const pageTitle = mode === 'ai' ? (LEVEL_LABEL[level] || 'Средний') + ' уровень' : mode === 'local' ? 'Hot-seat партия' : 'Онлайн партия'

  const panelEmojis = EMOJIS.filter(e => selectedEmojis.includes(e.id)).slice(0, 5)

  const isNonLocal = mode !== 'local'
  const amWhite = mode === 'ai' ? true : myColor === 'w'
  const myTime = isNonLocal ? (amWhite ? whiteTime : blackTime) : null
  const oppTime = isNonLocal ? (amWhite ? blackTime : whiteTime) : null
  const myIsActive = isNonLocal && !gameResult && (amWhite ? wt : !wt)
  const oppIsActive = isNonLocal && !gameResult && (amWhite ? !wt : wt)
  const myUrgent = myTime != null && myTime < 30
  const myWarn = myTime != null && myTime >= 30 && myTime < 60
  const oppUrgent = oppTime != null && oppTime < 30
  const oppWarn = oppTime != null && oppTime >= 30 && oppTime < 60
  const myDot = amWhite ? 'ptimer-dot-w' : 'ptimer-dot-b'
  const oppDot = amWhite ? 'ptimer-dot-b' : 'ptimer-dot-w'
  const oppLabel = mode === 'ai' ? `ИИ · ${LEVEL_LABEL[level] || 'Средний'}` : (oppName || 'Соперник')

  const isDraw = gameResult === 'DRAW'
  let iWon = null
  if (!isDraw && gameResult) {
    if (mode === 'friend') iWon = (myColor === 'w') === (gameResult === 'W')
    else if (mode === 'local') iWon = null
    else iWon = gameResult === 'W'
  }
  let trophyDelta = 0
  if (!isDraw && gameResult) {
    if (mode === 'ai' && iWon) trophyDelta = level === 'easy' ? 5 : level === 'medium' ? 10 : 20
    else if (mode === 'friend') trophyDelta = iWon ? 25 : -5
  }
  const overlayTitle = isDraw
    ? 'Ничья — время вышло'
    : iWon === null ? (gameResult === 'W' ? 'Победили белые' : 'Победили чёрные')
    : (iWon ? 'Вы выиграли!' : 'Вы проиграли')
  const showTrophy = !isDraw && (iWon === null ? gameResult === 'W' : iWon)

  const elapsed = elapsedSeconds()

  /* ── render ───────────────────────────────────────────── */

  return (
    <div className="game-page">
      {showResignModal && (
        <ConfirmModal
          title="Сдаться?" message="Это засчитается как поражение."
          confirmLabel="Да, сдаться" cancelLabel="Отмена" danger
          onConfirm={doResign} onCancel={() => setShowResignModal(false)}
        />
      )}

      <div className="game-header">
        <div className="game-header-left">
          <p>{pageLabel}</p>
          <h1>{pageTitle}</h1>
        </div>
        <div className="game-header-btns">
          <button className="btn-border" onClick={resetGame}>Новая партия</button>
          <button className="btn-primary btn-sm" onClick={() => navigate('play')}>Сменить режим</button>
          {!gameResult && mode === 'friend' && (
            <button className="btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(192,57,43,0.3)' }}
              onClick={() => setShowResignModal(true)}>Сдаться</button>
          )}
          {!gameResult && (mode === 'ai' || mode === 'local') && (
            <button className="btn-ghost btn-sm" style={{ color: 'var(--text2)' }}
              onClick={() => navigate('play')}>Завершить</button>
          )}
        </div>
      </div>

      <div className="game-body">
        <div className="board-col">
          {/* Opponent timer — above board */}
          {isNonLocal ? (
            <div className={`ptimer-bar${oppIsActive ? ' active' : ''}${oppUrgent ? ' urgent' : oppWarn ? ' warn' : ''}`}>
              {oppAvatar
                ? <img src={oppAvatar} className="ptimer-avatar" alt=""/>
                : <div className={`ptimer-dot ${oppDot}`}/>
              }
              <span className="ptimer-name">{oppLabel}</span>
              <span className="ptimer-time">{fmtTime(oppTime)}</span>
            </div>
          ) : (
            <div className="player-timers">
              <div className={`ptimer${!wt && !gameResult ? ' ptimer-active' : ''}${blackTime < 30 ? ' ptimer-urgent' : blackTime < 60 ? ' ptimer-warn' : ''}`}>
                <div className="ptimer-dot ptimer-dot-b"/>
                <span className="ptimer-label">Чёрные</span>
                <span className="ptimer-val">{fmtTime(blackTime)}</span>
              </div>
              <div className={`ptimer${wt && !gameResult ? ' ptimer-active' : ''}${whiteTime < 30 ? ' ptimer-urgent' : whiteTime < 60 ? ' ptimer-warn' : ''}`}>
                <div className="ptimer-dot ptimer-dot-w"/>
                <span className="ptimer-label">Белые</span>
                <span className="ptimer-val">{fmtTime(whiteTime)}</span>
              </div>
            </div>
          )}

          <BoardView
            board={board} selected={sel} legalDests={legalDests}
            lastMove={lastMove} perspective={perspective} onSquareClick={handleClick}
          />

          {/* My timer — below board */}
          {isNonLocal && (
            <div className={`ptimer-bar ptimer-bar-mine${myIsActive ? ' active' : ''}${myUrgent ? ' urgent' : myWarn ? ' warn' : ''}`}>
              <div className={`ptimer-dot ${myDot}`}/>
              <span className="ptimer-name">Вы</span>
              <span className="ptimer-time">{fmtTime(myTime)}</span>
            </div>
          )}

          {/* Emoji panel */}
          <div className="emoji-panel">
            {panelEmojis.map(e => (
              <button key={e.id} className="emoji-btn" title={e.name} onClick={() => sendEmoji(e.char)}>
                {e.char}
              </button>
            ))}
          </div>
        </div>
        <GameInfoSidebar board={board} wt={wt} gameResult={gameResult} history={history} thinking={thinking} mode={modeLabel} />
      </div>

      {myEmoji && <div key={myEmoji.key} className="emoji-float-wrap emoji-float-mine"><span className="emoji-float-char">{myEmoji.char}</span></div>}
      {oppEmoji && <div key={oppEmoji.key} className="emoji-float-wrap emoji-float-opp"><span className="emoji-float-char">{oppEmoji.char}</span></div>}

      {gameResult && (
        <div className="go-overlay">
          <div className="go-card">
            {showTrophy && <div className="go-icon">🏆</div>}
            {isDraw && <div className="go-icon">🤝</div>}
            <h2 className="go-title">{overlayTitle}</h2>
            <p className="go-sub">{history.length} ходов · {fmtTime(elapsed)}</p>
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
