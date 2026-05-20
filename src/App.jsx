import { useState, useEffect, useRef, Component } from 'react'
import { sb } from './lib/supabase'
import { applyTheme, getSavedTheme } from './lib/themes'
import NavBar from './components/NavBar'
import AuthModal from './components/AuthModal'
import ConfirmModal from './components/ConfirmModal'
import Footer from './components/Footer'
import HomeLanding from './pages/HomeLanding'
import PlayPicker from './pages/PlayPicker'
import GamePage from './pages/GamePage'
import FriendLobby from './pages/FriendLobby'
import PostGamePage from './pages/PostGamePage'
import RulesPage from './pages/RulesPage'
import ShopPage from './pages/ShopPage'
import ProfilePage from './pages/ProfilePage'

const DEFAULT_EMOJIS = ['shush', 'wait', 'cry', 'lol', 'shake', 'clap', 'think']
const REJOIN_TTL = 4 * 60 * 60 * 1000 // 4 hours

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40 }}>
        <h2 style={{ color: 'red' }}>Ошибка рендера</h2>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [screen, setScreen] = useState('home')
  const [screenParams, setScreenParams] = useState({})
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState({ name: 'Игрок' })
  const [gameResult, setGameResult] = useState(null)
  const [gems, setGems] = useState(0)
  const [trophies, setTrophies] = useState(0)
  const [ownedThemes, setOwnedThemes] = useState(['classic', 'night', 'emerald'])
  const [ownedEmojis, setOwnedEmojis] = useState(DEFAULT_EMOJIS)
  const [selectedEmojis, setSelectedEmojis] = useState(DEFAULT_EMOJIS.slice(0, 5))
  const [activeThemeId, setActiveThemeId] = useState(() => getSavedTheme())
  const [userWins, setUserWins] = useState(0)
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [totalCaptures, setTotalCaptures] = useState(0)
  const [rejoinMatch, setRejoinMatch] = useState(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const pendingNavRef = useRef(null)
  const pendingRoomRef = useRef(null)

  // ── Bootstrap local state ────────────────────────────────────────────────
  useEffect(() => {
    applyTheme(getSavedTheme())
    const localGems = parseInt(localStorage.getItem('gems') || '0')
    const localTrophies = parseInt(localStorage.getItem('trophies') || '0')
    const localThemes = JSON.parse(localStorage.getItem('ownedThemes') || '["classic","night","emerald"]')
    const localEmojis = JSON.parse(localStorage.getItem('ownedEmojis') || 'null') || DEFAULT_EMOJIS
    const localSelected = JSON.parse(localStorage.getItem('selectedEmojis') || 'null') || DEFAULT_EMOJIS
    const localWins = parseInt(localStorage.getItem('wins') || '0')
    const localGamesPlayed = parseInt(localStorage.getItem('games_played') || '0')
    const localTotalCaptures = parseInt(localStorage.getItem('total_captures') || '0')
    setGems(localGems); setTrophies(localTrophies); setOwnedThemes(localThemes)
    const OLD_DEFAULTS = ['thumb', 'heart', 'smile', 'fire']
    const isOldDefault = localEmojis.length === 4 && OLD_DEFAULTS.every(id => localEmojis.includes(id))
    const safeOwned = isOldDefault ? DEFAULT_EMOJIS : localEmojis
    setOwnedEmojis(safeOwned)
    setSelectedEmojis(localSelected.filter(id => safeOwned.includes(id)).slice(0, 5))
    setUserWins(localWins); setGamesPlayed(localGamesPlayed); setTotalCaptures(localTotalCaptures)

    // Load rejoin match from localStorage (persists across browser close)
    try {
      const saved = localStorage.getItem('activeMatch')
      if (saved) {
        const m = JSON.parse(saved)
        if (m.ts && Date.now() - m.ts < REJOIN_TTL) setRejoinMatch(m)
        else localStorage.removeItem('activeMatch')
      }
    } catch { localStorage.removeItem('activeMatch') }
  }, [])

  // ── URL params (room invite, payment) ───────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    const payment = params.get('payment')
    const gemsParam = params.get('gems')
    if (roomCode || payment) window.history.replaceState({}, '', window.location.pathname)
    if (roomCode) pendingRoomRef.current = roomCode
    if (payment === 'success' && gemsParam) {
      const earned = parseInt(gemsParam)
      setGems(g => { const next = g + earned; localStorage.setItem('gems', String(next)); return next })
      setScreen('shop')
      setTimeout(() => alert(`+${earned} 💎 гемов успешно зачислено! Спасибо за покупку.`), 500)
    }
    if (payment === 'cancel') setScreen('shop')
  }, [])

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session || null)
      if (session) loadProfile(session.user.id)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setSession(session || null)
      if (session) {
        loadProfile(session.user.id)
        setShowAuth(false)
        if (pendingNavRef.current) {
          const { s, p } = pendingNavRef.current; pendingNavRef.current = null
          setScreen(s); setScreenParams(p)
        }
        if (pendingRoomRef.current) {
          const rc = pendingRoomRef.current; pendingRoomRef.current = null
          setScreen('friend-lobby'); setScreenParams({ autoJoin: rc })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && pendingRoomRef.current) {
      const rc = pendingRoomRef.current; pendingRoomRef.current = null
      setScreen('friend-lobby'); setScreenParams({ autoJoin: rc })
    }
  }, [session])

  // ── Load profile from Supabase ───────────────────────────────────────────
  async function loadProfile(uid) {
    const { data } = await sb.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setUser(u => ({ ...u, name: data.username || u.name, avatar: data.avatar }))
      setGems(data.gems ?? 0)
      setTrophies(data.trophies ?? 0)
      if (data.owned_themes?.length) setOwnedThemes(data.owned_themes)
      if (data.owned_emojis?.length) {
        const OLD_DEFAULTS = ['thumb', 'heart', 'smile', 'fire']
        const isOldDefault = data.owned_emojis.length === 4 && OLD_DEFAULTS.every(id => data.owned_emojis.includes(id))
        const safeOwned = isOldDefault ? DEFAULT_EMOJIS : data.owned_emojis
        setOwnedEmojis(safeOwned)
        const localSelected = JSON.parse(localStorage.getItem('selectedEmojis') || 'null') || DEFAULT_EMOJIS
        setSelectedEmojis(localSelected.filter(id => safeOwned.includes(id)).slice(0, 5))
      }
      // Supabase vs localStorage — take higher
      const dbWins = data.wins ?? 0; const dbGames = data.games_played ?? 0; const dbCaptures = data.total_captures ?? 0
      const lWins = parseInt(localStorage.getItem('wins') || '0')
      const lGames = parseInt(localStorage.getItem('games_played') || '0')
      const lCaptures = parseInt(localStorage.getItem('total_captures') || '0')
      const safeWins = Math.max(dbWins, lWins)
      const safeGames = Math.max(dbGames, lGames)
      const safeCaptures = Math.max(dbCaptures, lCaptures)
      setUserWins(safeWins); setGamesPlayed(safeGames); setTotalCaptures(safeCaptures)
      if (safeGames > dbGames || safeWins > dbWins || safeCaptures > dbCaptures)
        sb.from('profiles').update({ wins: safeWins, games_played: safeGames, total_captures: safeCaptures }).eq('id', uid)
      localStorage.setItem('gems', String(data.gems ?? 0))
      localStorage.setItem('trophies', String(data.trophies ?? 0))
      localStorage.setItem('wins', String(safeWins))
      localStorage.setItem('games_played', String(safeGames))
      localStorage.setItem('total_captures', String(safeCaptures))

      // Restore active match from Supabase (works across devices / cleared localStorage)
      if (data.active_match) {
        const m = data.active_match
        if (m.ts && Date.now() - m.ts < REJOIN_TTL) {
          setRejoinMatch(m)
          localStorage.setItem('activeMatch', JSON.stringify(m))
        } else {
          sb.from('profiles').update({ active_match: null }).eq('id', uid)
        }
      }
    } else {
      // First OAuth login — create profile
      const { data: { user: authUser } } = await sb.auth.getUser()
      if (authUser) {
        const username = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Игрок'
        await sb.from('profiles').upsert({ id: uid, username, gems: 0, wins: 0, trophies: 0, owned_themes: ['classic', 'night', 'emerald'], owned_emojis: DEFAULT_EMOJIS })
        setUser(u => ({ ...u, name: username }))
        applyTheme('classic'); setActiveThemeId('classic'); localStorage.setItem('theme', 'classic')
      }
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    setShowSignOutModal(false)
    if (session) sb.from('profiles').update({ active_match: null }).eq('id', session.user.id)
    await sb.auth.signOut()
    setSession(null); setUser({ name: 'Игрок' })
    setGems(0); setTrophies(0)
    setOwnedThemes(['classic', 'night', 'emerald'])
    setOwnedEmojis(DEFAULT_EMOJIS); setSelectedEmojis(DEFAULT_EMOJIS.slice(0, 5))
    setUserWins(0); setGamesPlayed(0); setTotalCaptures(0); setRejoinMatch(null)
    ;['gems', 'trophies', 'wins', 'games_played', 'total_captures', 'ownedThemes', 'ownedEmojis', 'selectedEmojis', 'activeMatch'].forEach(k => localStorage.removeItem(k))
    applyTheme('classic'); setActiveThemeId('classic'); localStorage.setItem('theme', 'classic')
    setScreen('home')
  }

  function handleToggleEmoji(eid) {
    setSelectedEmojis(prev => {
      let next
      if (prev.includes(eid)) { next = prev.filter(id => id !== eid) }
      else if (prev.length >= 5) { next = [...prev.slice(1), eid] }
      else { next = [...prev, eid] }
      localStorage.setItem('selectedEmojis', JSON.stringify(next))
      return next
    })
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(s, p = {}) {
    const auth_required = ['friend-lobby']
    if (auth_required.includes(s) && !session) {
      pendingNavRef.current = { s, p }; setShowAuth(true); return
    }
    setScreen(s); setScreenParams(p); window.scrollTo(0, 0)
  }

  // ── Match move sync → Supabase (called from GamePage on each move) ────────
  async function handleMatchMove(matchData) {
    if (session) {
      // Fire-and-forget — don't await to avoid blocking UI
      sb.from('profiles').update({ active_match: matchData }).eq('id', session.user.id)
    }
    // localStorage already updated by GamePage
  }

  // ── Game end ──────────────────────────────────────────────────────────────
  async function handleGameEnd(result) {
    const isDraw = result.winner === 'DRAW'
    let iWon = false
    if (!isDraw) {
      if (result.mode === 'ai') iWon = result.winner === 'W'
      else if (result.mode === 'local') iWon = true
      else iWon = (result.myColor === 'w') === (result.winner === 'W')
    }
    const myCaps = result.history ? result.history.filter(m => m.white).reduce((s, m) => s + (m.caps?.length || 0), 0) : 0
    const newGamesPlayed = gamesPlayed + 1
    const newTotalCaptures = totalCaptures + myCaps
    const newWins = iWon ? userWins + 1 : userWins
    const newGems = iWon ? gems + 50 : gems
    const gemsEarned = iWon ? 50 : 0
    let trophiesEarned = 0
    if (!isDraw) {
      if (result.mode === 'ai') {
        if (iWon) trophiesEarned = result.level === 'easy' ? 5 : result.level === 'medium' ? 10 : 20
        else trophiesEarned = result.level === 'easy' ? -2 : result.level === 'medium' ? -5 : -10
      } else if (result.mode === 'friend') trophiesEarned = iWon ? 25 : -10
    }
    const newTrophies = Math.max(0, trophies + trophiesEarned)

    setGamesPlayed(newGamesPlayed); setTotalCaptures(newTotalCaptures); setTrophies(newTrophies)
    if (iWon) { setUserWins(newWins); setGems(newGems) }
    localStorage.setItem('games_played', String(newGamesPlayed))
    localStorage.setItem('total_captures', String(newTotalCaptures))
    localStorage.setItem('trophies', String(newTrophies))
    if (iWon) { localStorage.setItem('wins', String(newWins)); localStorage.setItem('gems', String(newGems)) }

    // Store full history for replay from match history page
    const histEntry = {
      id: Date.now(),
      mode: result.mode,
      level: result.level,
      opponent: result.oppName || (result.mode === 'ai'
        ? `ИИ · ${result.level === 'easy' ? 'Лёгкий' : result.level === 'medium' ? 'Средний' : 'Сложный'}`
        : result.mode === 'local' ? 'Вдвоём' : 'Друг'),
      won: iWon,
      gemsEarned,
      trophiesEarned,
      moves: result.history?.length || 0,
      timer: result.timer || 0,
      date: new Date().toISOString(),
      // Full data for replay
      history: result.history || [],
      winner: result.winner,
      myColor: result.myColor || 'w',
    }
    const prevHist = JSON.parse(localStorage.getItem('match_history') || '[]')
    localStorage.setItem('match_history', JSON.stringify([histEntry, ...prevHist].slice(0, 20)))

    // Clear active match from Supabase
    if (session) {
      await sb.from('profiles').update({
        games_played: newGamesPlayed,
        total_captures: newTotalCaptures,
        wins: newWins,
        gems: newGems,
        trophies: newTrophies,
        active_match: null,
      }).eq('id', session.user.id)
    }

    if (iWon && newWins >= 5 && !ownedEmojis.includes('bolt')) {
      const newEmojis = [...ownedEmojis, 'bolt']
      setOwnedEmojis(newEmojis)
      localStorage.setItem('ownedEmojis', JSON.stringify(newEmojis))
      if (session) sb.from('profiles').update({ owned_emojis: newEmojis }).eq('id', session.user.id)
    }

    if (result.showReplay) {
      setGameResult({ ...result, gemsEarned, trophiesEarned })
      setScreen('postgame'); window.scrollTo(0, 0)
    }
  }

  // ── View replay from match history ────────────────────────────────────────
  function handleViewReplay(entry) {
    setGameResult({
      winner: entry.winner,
      history: entry.history || [],
      mode: entry.mode,
      level: entry.level,
      myColor: entry.myColor || 'w',
      timer: entry.timer || 0,
      gemsEarned: entry.gemsEarned || 0,
      showReplay: true,
    })
    setScreen('postgame'); window.scrollTo(0, 0)
  }

  // ── Re-check rejoin whenever user leaves the game screen ─────────────────
  useEffect(() => {
    if (screen === 'game') return
    try {
      const saved = localStorage.getItem('activeMatch')
      if (saved) {
        const m = JSON.parse(saved)
        if (m.ts && Date.now() - m.ts < REJOIN_TTL) setRejoinMatch(m)
        else { localStorage.removeItem('activeMatch'); setRejoinMatch(null) }
      } else { setRejoinMatch(null) }
    } catch { setRejoinMatch(null) }
  }, [screen])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text3)' }}>Загрузка…</div>
      </div>
    )
  }

  const showFooter = ['home', 'rules', 'play'].includes(screen)

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showSignOutModal && (
        <ConfirmModal
          title="Выйти из аккаунта?"
          message="Вы уверены, что хотите выйти?"
          confirmLabel="Да, выйти"
          cancelLabel="Отмена"
          danger
          onConfirm={handleSignOut}
          onCancel={() => setShowSignOutModal(false)}
        />
      )}
      <NavBar
        screen={screen} navigate={navigate} session={session}
        user={user} gems={gems}
        onSignOut={() => setShowSignOutModal(true)}
        onShowAuth={() => setShowAuth(true)}
      />
      <main style={{ flex: 1 }}>
        {rejoinMatch && screen !== 'game' && (
          <div className="rejoin-banner">
            <span>
              {rejoinMatch.mode === 'ai'
                ? `♟️ Незавершённая партия с ИИ (${rejoinMatch.level === 'easy' ? 'Лёгкий' : rejoinMatch.level === 'hard' ? 'Сложный' : 'Средний'})!`
                : `♟️ Активный матч с ${rejoinMatch.oppName || 'другом'}!`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary btn-sm" onClick={() => {
                const m = rejoinMatch
                setRejoinMatch(null)
                // Deduct time elapsed since last save from the active player
                const elapsed = m.ts ? Math.max(0, Math.floor((Date.now() - m.ts) / 1000)) : 0
                const isWhiteTurn = m.wt !== false
                const adjWt = Math.max(0, (m.whiteTime ?? 300) - (isWhiteTurn ? elapsed : 0))
                const adjBt = Math.max(0, (m.blackTime ?? 300) - (!isWhiteTurn ? elapsed : 0))
                if (m.mode === 'ai') {
                  navigate('game', {
                    mode: 'ai',
                    level: m.level || 'medium',
                    initialBoard: m.board,
                    initialWt: m.wt,
                    initialHistory: m.history,
                    initialWhiteTime: adjWt,
                    initialBlackTime: adjBt,
                  })
                } else {
                  navigate('game', {
                    mode: 'friend',
                    roomCode: m.roomCode,
                    myColor: m.myColor,
                    oppName: m.oppName,
                    oppAvatar: m.oppAvatar,
                    initialBoard: m.board,
                    initialWt: m.wt,
                    initialHistory: m.history,
                    initialWhiteTime: adjWt,
                    initialBlackTime: adjBt,
                  })
                }
              }}>Вернуться</button>
              <button className="btn-ghost btn-sm" onClick={() => {
                setRejoinMatch(null)
                localStorage.removeItem('activeMatch')
                if (session) sb.from('profiles').update({ active_match: null }).eq('id', session.user.id)
              }}>Закрыть</button>
            </div>
          </div>
        )}

        {screen === 'home' && <HomeLanding navigate={navigate} />}
        {screen === 'rules' && <RulesPage navigate={navigate} />}
        {screen === 'play' && <PlayPicker navigate={navigate} />}

        {screen === 'shop' && (
          <ShopPage
            navigate={navigate} gems={gems} setGems={setGems}
            ownedThemes={ownedThemes} setOwnedThemes={setOwnedThemes}
            ownedEmojis={ownedEmojis} setOwnedEmojis={setOwnedEmojis}
            activeThemeId={activeThemeId} setActiveThemeId={setActiveThemeId}
            session={session} userWins={userWins}
          />
        )}

        {screen === 'game' && (
          <GamePage
            mode={screenParams.mode || 'ai'}
            level={screenParams.level || 'medium'}
            roomCode={screenParams.roomCode}
            myColor={screenParams.myColor || 'w'}
            oppName={screenParams.oppName}
            oppAvatar={screenParams.oppAvatar}
            selectedEmojis={selectedEmojis.length > 0 ? selectedEmojis : DEFAULT_EMOJIS}
            initialBoard={screenParams.initialBoard}
            initialWt={screenParams.initialWt}
            initialHistory={screenParams.initialHistory}
            initialWhiteTime={screenParams.initialWhiteTime}
            initialBlackTime={screenParams.initialBlackTime}
            onMove={handleMatchMove}
            onGameEnd={handleGameEnd}
            navigate={navigate}
          />
        )}

        {screen === 'profile' && (
          <ProfilePage
            navigate={navigate} session={session} user={user}
            gems={gems} trophies={trophies}
            ownedThemes={ownedThemes} ownedEmojis={ownedEmojis}
            selectedEmojis={selectedEmojis} onToggleEmoji={handleToggleEmoji}
            activeThemeId={activeThemeId}
            userWins={userWins} gamesPlayed={gamesPlayed} totalCaptures={totalCaptures}
            onSignOut={() => setShowSignOutModal(true)}
            onRename={name => setUser(u => ({ ...u, name }))}
            onUpdateAvatar={url => setUser(u => ({ ...u, avatar: url }))}
            onApplyTheme={tid => { applyTheme(tid); setActiveThemeId(tid); localStorage.setItem('theme', tid) }}
            onViewReplay={handleViewReplay}
          />
        )}

        {screen === 'friend-lobby' && <FriendLobby navigate={navigate} user={user} screenParams={screenParams} />}

        {screen === 'postgame' && (
          <ErrorBoundary>
            <PostGamePage result={gameResult} navigate={navigate} />
          </ErrorBoundary>
        )}
      </main>
      {showFooter && <Footer />}
    </>
  )
}
