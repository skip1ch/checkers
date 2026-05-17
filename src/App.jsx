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
  const [ownedThemes, setOwnedThemes] = useState(['classic','night','emerald'])
  const [ownedEmojis, setOwnedEmojis] = useState(['thumb','heart','smile','fire'])
  const [activeThemeId, setActiveThemeId] = useState(() => getSavedTheme())
  const [userWins, setUserWins] = useState(0)
  const pendingNavRef = useRef(null)
  const pendingRoomRef = useRef(null)

  useEffect(() => {
    applyTheme(getSavedTheme())
    const localGems = parseInt(localStorage.getItem('gems') || '0')
    const localThemes = JSON.parse(localStorage.getItem('ownedThemes') || '["classic","night","emerald"]')
    const localEmojis = JSON.parse(localStorage.getItem('ownedEmojis') || '["thumb","heart","smile","fire"]')
    const localWins = parseInt(localStorage.getItem('wins') || '0')
    setGems(localGems)
    setOwnedThemes(localThemes)
    setOwnedEmojis(localEmojis)
    setUserWins(localWins)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomCode = params.get('room')
    const payment = params.get('payment')
    const gemsParam = params.get('gems')
    window.history.replaceState({}, '', window.location.pathname)

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

  async function loadProfile(uid) {
    const { data } = await sb.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setUser(u => ({ ...u, name: data.username || u.name, avatar: data.avatar }))
      if (data.gems != null) setGems(data.gems)
      if (data.owned_themes) setOwnedThemes(data.owned_themes)
      if (data.owned_emojis) setOwnedEmojis(data.owned_emojis)
      if (data.wins != null) setUserWins(data.wins)
    }
  }

  async function handleSignOut() {
    await sb.auth.signOut()
    setSession(null)
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

  function handleGameEnd(result) {
    let iWon = false
    if (result.mode === 'ai') iWon = result.winner === 'W'
    else if (result.mode === 'local') iWon = true
    else iWon = (result.myColor === 'w') === (result.winner === 'W')

    let gemsEarned = 0
    if (iWon) {
      gemsEarned = 50
      const newGems = gems + gemsEarned
      const newWins = userWins + 1
      setGems(newGems)
      setUserWins(newWins)
      localStorage.setItem('gems', String(newGems))
      localStorage.setItem('wins', String(newWins))
      if (session) {
        sb.from('profiles').update({ gems: newGems, wins: newWins }).eq('id', session.user.id)
      }
      if (newWins >= 5 && !ownedEmojis.includes('bolt')) {
        const newEmojis = [...ownedEmojis, 'bolt']
        setOwnedEmojis(newEmojis)
        localStorage.setItem('ownedEmojis', JSON.stringify(newEmojis))
        if (session) sb.from('profiles').update({ owned_emojis: newEmojis }).eq('id', session.user.id)
      }
    }

    setGameResult({ ...result, gemsEarned })
    setScreen('postgame')
    window.scrollTo(0, 0)
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
