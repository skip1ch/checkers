function GemIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0}}>
      <path d="M5,3 L15,3 L18,8 L10,18 L2,8 Z" fill="#29b6f6"/>
      <path d="M5,3 L15,3 L10,8 Z" fill="rgba(255,255,255,0.55)"/>
      <path d="M2,8 L5,3 L10,8 Z" fill="rgba(255,255,255,0.2)"/>
      <path d="M18,8 L15,3 L10,8 Z" fill="rgba(0,0,0,0.15)"/>
      <path d="M2,8 L10,18 L10,8 Z" fill="rgba(0,0,0,0.1)"/>
      <path d="M18,8 L10,18 L10,8 Z" fill="rgba(0,0,0,0.22)"/>
      <path d="M5,3 L15,3 L18,8 L10,18 L2,8 Z" fill="none" stroke="#0277bd" strokeWidth="0.7"/>
      <line x1="2" y1="8" x2="18" y2="8" stroke="#0277bd" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  )
}

export default function NavBar({ screen, navigate, session, user, gems, onSignOut, onShowAuth }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo" onClick={() => navigate('home')}>
          <div className="navbar-logo-icon wood-grain">
            <div className="navbar-logo-piece"/>
          </div>
          <span className="navbar-logo-text">Дубовая Доска</span>
        </div>
        <nav className="navbar-nav">
          <button className={`nav-link ${screen==='play'?'active':''}`} onClick={() => navigate('play')}>Играть</button>
          <button className={`nav-link ${screen==='rules'?'active':''}`} onClick={() => navigate('rules')}>Правила</button>
          <button className={`nav-link ${screen==='shop'?'active':''}`} onClick={() => navigate('shop')}>Магазин</button>
        </nav>
        <div className="navbar-right">
          <div className="nav-gems" onClick={() => navigate('shop')} title="Открыть магазин">
            <GemIcon size={14}/>
            <span>{gems ?? 0}</span>
          </div>
          {session ? (
            <>
              <button className="nav-user-btn" onClick={() => navigate('profile')} title="Профиль">
                <span className="nav-user-avatar">
                  {user?.avatar
                    ? <img src={user.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                    : (user?.name || 'И')[0].toUpperCase()
                  }
                </span>
                <span className="nav-user-name">{user?.name || 'Игрок'}</span>
              </button>
              <button className="btn-ghost btn-sm" onClick={onSignOut}>Выйти</button>
              <button className="btn-primary btn-sm" onClick={() => navigate('play')}>Начать партию</button>
            </>
          ) : (
            <>
              <button className="btn-ghost btn-sm" onClick={onShowAuth}>Войти</button>
              <button className="btn-primary btn-sm" onClick={() => navigate('play')}>Начать партию</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
