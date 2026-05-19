import { useState, useEffect, useRef, Component } from 'react'
import { sb } from './lib/supabase'
import { applyTheme, getSavedTheme } from './lib/themes'
import NavBar from './components/NavBar'
import AuthModal from './components/AuthModal'
import Footer from './components/Footer'
import HomeLanding from './pages/HomeLanding'
import PlayPicker from './pages/PlayPicker'
import GamePage from './pages/GamePage'
import FriendLobby from './pages/FriendLobby'
import PostGamePage from './pages/PostGamePage'
import RulesPage from './pages/RulesPage'
import ShopPage from './pages/ShopPage'
import ProfilePage from './pages/ProfilePage'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{padding:40}}>
        <h2 style={{color:'red'}}>Ошибка рендера</h2>
        <pre style={{whiteSpace:'pre-wrap',color:'#333'}}>{this.state.error.message}{'\n'}{this.state.error.stack}</pre>
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
  const [user, setUser] = useState({ name:'Игрок' })
  const [gameResult, setGameResult] = useState(null)
  const [gems, setGems] = useState(0)
  const [trophies, setTrophies] = useState(0)
  const [ownedThemes, setOwnedThemes] = useState(['classic','night','emerald'])
  const [ownedEmojis, setOwnedEmojis] = useState(['shush','wait','cry','lol','shake'])
  const [activeThemeId, setActiveThemeId] = useState(() => getSavedTheme())
  const [userWins, setUserWins] = useState(0)
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [totalCaptures, setTotalCaptures] = useState(0)
  const [rejoinMatch, setRejoinMatch] = useState(null)
  const pendingNavRef = useRef(null)
  const pendingRoomRef = useRef(null)

  useEffect(() => {
    applyTheme(getSavedTheme())
    const localGems = parseInt(localStorage.getItem('gems') || '0')
    const localTrophies = parseInt(localStorage.getItem('trophies') || '0')
    const localThemes = JSON.parse(localStorage.getItem('ownedThemes') || '["classic","night","emerald"]')
    const localEmojis = JSON.parse(localStorage.getItem('ownedEmojis') || '["shush","wait","cry","lol","shake"]')
    const localWins = parseInt(localStorage.getItem('wins') || '0')
    const localGamesPlayed = parseInt(localStorage.getItem('games_played') || '0')
    const localTotalCaptures = parseInt(localStorage.getItem('total_captures') || '0')
    setGems(localGems)
    setTrophies(localTrophies)
    setOwnedThemes(localThemes)
    // Migrate old default emojis to new defaults
    const OLD_DEFAULTS = ['thumb','heart','smile','fire']
    const isOldDefault = localEmojis.length === 4 && OLD_DEFAULTS.every(id => localEmojis.includes(id))
    setOwnedEmojis(isOldDefault ? ['shush','wait','cry','lol','shake'] : localEmojis)
    setUserWins(localWins)
    setGamesPlayed(localGamesPlayed)
    setTotalCaptures(localTotalCaptures)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    const payment = params.get('payment')
    const gemsParam = params.get('gems')

    // Only clear URL for params we handle — don't touch OAuth ?code= flow
    if (roomCode || payment) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (roomCode) pendingRoomRef.current = roomCode

    if (payment === 'success' && gemsParam) {
      const earned = parseInt(gemsParam)
      setGems(g => {
        const next = g + earned
        localStorage.setItem('gems', String(next))
        return next
      })
      setScreen('shop')
      setTimeout(() => {
        alert(`+${earned} 💎 гемов успешно зачислено! Спасибо за покупку.`)
      }, 500)
    }
    if (payment === 'cancel') setScreen('shop')
  }, [])

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
          const { s, p } = pendingNavRef.current
          pendingNavRef.current = null
          setScreen(s); setScreenParams(p)
        }
        if (pendingRoomRef.current) {
          const rc = pendingRoomRef.current
          pendingRoomRef.current = null
          setScreen('friend-lobby')
          setScreenParams({ autoJoin: rc })
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && pendingRoomRef.current) {
      const rc = pendingRoomRef.current
      pendingRoomRef.current = null
      setScreen('friend-lobby')
      setScreenParams({ autoJoin: rc })
    }
  }, [session])

  useEffect(() => {
    const saved = localStorage.getItem('activeMatch')
    if (!saved) return
    try {
      const m = JSON.parse(saved)
      if (Date.now() - m.ts < 10 * 60 * 1000) {
        setRejoinMatch(m)
      } else {
        localStorage.removeItem('activeMatch')
      }
    } catch { localStorage.removeItem('activeMatch') }
  }, [])

  async function loadProfile(uid) {
    const { data } = await sb.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setUser(u => ({ ...u, name: data.username || u.name, avatar: data.avatar }))
      // Supabase is the source of truth — always overwrite local state
      setGems(data.gems ?? 0)
      setTrophies(data.trophies ?? 0)
      if (data.owned_themes?.length) setOwnedThemes(data.owned_themes)
      if (data.owned_emojis?.length) {
        const OLD_DEFAULTS = ['thumb','heart','smile','fire']
        const isOldDefault = data.owned_emojis.length === 4 && OLD_DEFAULTS.every(id => data.owned_emojis.includes(id))
        setOwnedEmojis(isOldDefault ? ['shush','wait','cry','lol','shake'] : data.owned_emojis)
      }
      // For wins/games/captures: take the higher of Supabase or localStorage
      // (guards against missing DB columns silently returning null)
      const dbWins = data.wins ?? 0
      const dbGames = data.games_played ?? 0
      const dbCaptures = data.total_captures ?? 0
      const localWins = parseInt(localStorage.getItem('wins') || '0')
      const localGames = parseInt(localStorage.getItem('games_played') || '0')
      const localCaptures = parseInt(localStorage.getItem('total_captures') || '0')
      const safeWins = Math.max(dbWins, localWins)
      const safeGames = Math.max(dbGames, localGames)
      const safeCaptures = Math.max(dbCaptures, localCaptures)
      setUserWins(safeWins)
      setGamesPlayed(safeGames)
      setTotalCaptures(safeCaptures)
      // If local was higher, sync it back up to Supabase
      if (safeGames > dbGames || safeWins > dbWins || safeCaptures > dbCaptures) {
        sb.from('profiles').update({ wins: safeWins, games_played: safeGames, total_captures: safeCaptures }).eq('id', uid)
      }
      // Sync localStorage
      localStorage.setItem('gems', String(data.gems ?? 0))
      localStorage.setItem('trophies', String(data.trophies ?? 0))
      localStorage.setItem('wins', String(safeWins))
      localStorage.setItem('games_played', String(safeGames))
      localStorage.setItem('total_captures', String(safeCaptures))
    } else {
      // First Google OAuth login — create profile automatically
      const { data: { user: authUser } } = await sb.auth.getUser()
      if (authUser) {
        const username = authUser.user_metadata?.full_name
          || authUser.user_metadata?.name
          || authUser.email?.split('@')[0]
          || 'Игрок'
        await sb.from('profiles').upsert({
          id: uid,
          username,
          gems: 0,
          wins: 0,
          trophies: 0,
          owned_themes: ['classic', 'night', 'emerald'],
          owned_emojis: ['shush', 'wait', 'cry', 'lol', 'shake'],
        })
        setUser(u => ({ ...u, name: username }))
      }
    }
  }

  async function handleSignOut() {
    await sb.auth.signOut()
    setSession(null)
    setUser({ name: 'Игрок' })
    setGems(0)
    setTrophies(0)
    setOwnedThemes(['classic', 'night', 'emerald'])
    setOwnedEmojis(['shush', 'wait', 'cry', 'lol', 'shake'])
    setUserWins(0)
    setGamesPlayed(0)
    setTotalCaptures(0)
    setRejoinMatch(null)
    localStorage.removeItem('gems')
    localStorage.removeItem('trophies')
    localStorage.removeItem('wins')
    localStorage.removeItem('games_played')
    localStorage.removeItem('total_captures')
    localStorage.removeItem('ownedThemes')
    localStorage.removeItem('ownedEmojis')
    localStorage.removeItem('activeMatch')
    setScreen('home')
  }

  function navigate(s, p={}) {
    const auth_required = ['friend-lobby']
    if (auth_required.includes(s) && !session) {
      pendingNavRef.current = { s, p }
      setShowAuth(true)
      return
    }
    setScreen(s); setScreenParams(p)
    window.scrollTo(0, 0)
  }

  async function handleGameEnd(result) {
    let iWon = false
    if (result.mode === 'ai') iWon = result.winner === 'W'
    else if (result.mode === 'local') iWon = true
    else iWon = (result.myColor === 'w') === (result.winner === 'W')

    const myCaps = result.history
      ? result.history.filter(m => m.white).reduce((s, m) => s + (m.caps?.length || 0), 0)
      : 0
    const newGamesPlayed = gamesPlayed + 1
    const newTotalCaptures = totalCaptures + myCaps
    const newWins = iWon ? userWins + 1 : userWins
    const newGems = iWon ? gems + 50 : gems
    const gemsEarned = iWon ? 50 : 0

    // Trophy logic
    let trophiesEarned = 0
    if (result.mode === 'ai' && iWon) {
      trophiesEarned = result.level === 'easy' ? 5 : result.level === 'medium' ? 10 : 20
    } else if (result.mode === 'friend') {
      trophiesEarned = iWon ? 25 : -5
    }
    const newTrophies = Math.max(0, trophies + trophiesEarned)

    // Update React state
    setGamesPlayed(newGamesPlayed)
    setTotalCaptures(newTotalCaptures)
    setTrophies(newTrophies)
    if (iWon) { setUserWins(newWins); setGems(newGems) }

    // Always sync localStorage immediately
    localStorage.setItem('games_played', String(newGamesPlayed))
    localStorage.setItem('total_captures', String(newTotalCaptures))
    localStorage.setItem('trophies', String(newTrophies))
    if (iWon) {
      localStorage.setItem('wins', String(newWins))
      localStorage.setItem('gems', String(newGems))
    }

    // Save match history entry (last 20)
    const histEntry = {
      id: Date.now(),
      mode: result.mode,
      level: result.level,
      opponent: result.oppName || (result.mode === 'ai' ? `ИИ · ${result.level === 'easy' ? 'Лёгкий' : result.level === 'medium' ? 'Средний' : 'Сложный'}` : result.mode === 'local' ? 'Вдвоём' : 'Друг'),
      won: iWon,
      gemsEarned,
      trophiesEarned,
      moves: result.history?.length || 0,
      timer: result.timer || 0,
      date: new Date().toISOString(),
    }
    const prevHist = JSON.parse(localStorage.getItem('match_history') || '[]')
    localStorage.setItem('match_history', JSON.stringify([histEntry, ...prevHist].slice(0, 20)))

    // Await Supabase update so it definitely saves before user navigates away
    if (session) {
      await sb.from('profiles').update({
        games_played: newGamesPlayed,
        total_captures: newTotalCaptures,
        wins: newWins,
        gems: newGems,
        trophies: newTrophies,
      }).eq('id', session.user.id)
    }

    if (iWon && newWins >= 5 && !ownedEmojis.includes('bolt')) {
      const newEmojis = [...ownedEmojis, 'bolt']
      setOwnedEmojis(newEmojis)
      localStorage.setItem('ownedEmojis', JSON.stringify(newEmojis))
      if (session) sb.from('profiles').update({ owned_emojis: newEmojis }).eq('id', session.user.id)
    }

    if (result.showReplay) {
      setGameResult({ ...result, gemsEarned })
      setScreen('postgame')
      window.scrollTo(0, 0)
    }
  }

  if (session === undefined) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)'}}>
        <div style={{color:'var(--text3)'}}>Загрузка…</div>
      </div>
    )
  }

  const showFooter = ['home','rules','play'].includes(screen)

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)}/>}
      <NavBar
        screen={screen}
        navigate={navigate}
        session={session}
        user={user}
        gems={gems}
        onSignOut={handleSignOut}
        onShowAuth={() => setShowAuth(true)}
      />
      <main style={{flex:1}}>
        {rejoinMatch && screen !== 'game' && (
          <div className="rejoin-banner">
            <span>♟️ У вас есть активный матч с {rejoinMatch.oppName || 'другом'}!</span>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary btn-sm" onClick={() => {
                setRejoinMatch(null)
                navigate('game', { mode:'friend', roomCode: rejoinMatch.roomCode, myColor: rejoinMatch.myColor, oppName: rejoinMatch.oppName })
              }}>Вернуться</button>
              <button className="btn-ghost btn-sm" onClick={() => { setRejoinMatch(null); localStorage.removeItem('activeMatch') }}>Закрыть</button>
            </div>
          </div>
        )}
        {screen==='profile' && (
          <ProfilePage
            navigate={navigate}
            session={session}
            user={user}
            gems={gems}
            trophies={trophies}
            ownedThemes={ownedThemes}
            activeThemeId={activeThemeId}
            userWins={userWins}
            gamesPlayed={gamesPlayed}
            totalCaptures={totalCaptures}
            onSignOut={handleSignOut}
            onRename={name => setUser(u => ({ ...u, name }))}
          />
        )}
        {screen==='home' && <HomeLanding navigate={navigate}/>}
        {screen==='rules' && <RulesPage navigate={navigate}/>}
        {screen==='play' && <PlayPicker navigate={navigate}/>}
        {screen==='shop' && (
          <ShopPage
            navigate={navigate}
            gems={gems}
            setGems={setGems}
            ownedThemes={ownedThemes}
            setOwnedThemes={setOwnedThemes}
            ownedEmojis={ownedEmojis}
            setOwnedEmojis={setOwnedEmojis}
            activeThemeId={activeThemeId}
            setActiveThemeId={setActiveThemeId}
            session={session}
            userWins={userWins}
          />
        )}
        {screen==='game' && (
          <GamePage
            mode={screenParams.mode||'ai'}
            level={screenParams.level||'medium'}
            roomCode={screenParams.roomCode}
            myColor={screenParams.myColor||'w'}
            oppName={screenParams.oppName}
            ownedEmojis={ownedEmojis}
            onGameEnd={handleGameEnd}
            navigate={navigate}
          />
        )}
        {screen==='friend-lobby' && <FriendLobby navigate={navigate} user={user} screenParams={screenParams}/>}
        {screen==='postgame' && (
          <ErrorBoundary>
            <PostGamePage result={gameResult} navigate={navigate}/>
          </ErrorBoundary>
        )}
      </main>
      {showFooter && <Footer/>}
    </>
  )
}
