import { useState, useEffect } from 'react'
import { THEMES, EMOJIS, GEM_PACKAGES, applyTheme } from '../lib/themes'
import { sb } from '../lib/supabase'

function GemIcon({ size = 16 }) {
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

const BOARD_PATTERN = [
  [0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0],
  [0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0],
]

function ThemePreview({ light, dark }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',borderRadius:10,overflow:'hidden',width:'100%',aspectRatio:'2/1'}}>
      {BOARD_PATTERN.flat().map((isDark, i) => (
        <div key={i} style={{background: isDark ? dark : light}}/>
      ))}
    </div>
  )
}

function ThemeCard({ theme, owned, active, gems, onBuy, onActivate }) {
  const [light, dark] = theme.preview
  const canAfford = gems >= theme.price

  return (
    <div className={`theme-card${active ? ' active' : ''}`} onClick={owned ? onActivate : undefined}>
      <ThemePreview light={light} dark={dark}/>
      <div>
        <div className="theme-name">{theme.name}</div>
        <div className="theme-desc">{theme.desc}</div>
      </div>
      <div className="theme-footer">
        {theme.price === 0 ? (
          <span className="theme-price" style={{color:'var(--green)',fontSize:'.72rem'}}>Бесплатно</span>
        ) : (
          <span className="theme-price">
            <GemIcon size={13}/> {theme.price}
          </span>
        )}
        {active ? (
          <span className="theme-active-badge">✓ Активна</span>
        ) : owned ? (
          <button className="theme-btn theme-btn-free" onClick={e => { e.stopPropagation(); onActivate() }}>Применить</button>
        ) : (
          <button
            className={`theme-btn ${canAfford ? 'theme-btn-buy' : 'theme-btn-locked'}`}
            onClick={e => { e.stopPropagation(); onBuy() }}
            disabled={!canAfford}
          >
            {canAfford ? (theme.price === 0 ? 'Получить' : 'Купить') : 'Мало 💎'}
          </button>
        )}
      </div>
    </div>
  )
}

function EmojiCard({ emoji, owned, gems, userWins, onBuy }) {
  const canAfford = emoji.price > 0 ? gems >= emoji.price : true
  const meetsReq = emoji.req ? userWins >= emoji.req.wins : true
  const available = owned || (canAfford && meetsReq)

  return (
    <div className={`emoji-card${owned ? ' owned' : ''}`}>
      <span className="emoji-char">{emoji.char}</span>
      <span className="emoji-name">{emoji.name}</span>
      {emoji.req && (
        <span className="emoji-req">🏆 {emoji.req.wins} побед</span>
      )}
      {emoji.price > 0 && !emoji.req && (
        <span className="emoji-req" style={{display:'flex',alignItems:'center',gap:3}}>
          <GemIcon size={11}/> {emoji.price}
        </span>
      )}
      {emoji.price === 0 && !emoji.req && (
        <span className="emoji-req" style={{color:'var(--green)'}}>Бесплатно</span>
      )}
      {owned ? (
        <button className="emoji-buy-btn emoji-buy-owned">Есть ✓</button>
      ) : emoji.req ? (
        <button className="emoji-buy-btn emoji-buy-locked" disabled>
          {meetsReq ? 'Разблокировано!' : `Нужно ${emoji.req.wins} побед`}
        </button>
      ) : (
        <button
          className={`emoji-buy-btn ${canAfford ? 'emoji-buy-gem' : 'emoji-buy-locked'}`}
          onClick={onBuy}
          disabled={!canAfford}
        >
          {canAfford ? (emoji.price === 0 ? 'Получить' : 'Купить') : 'Мало 💎'}
        </button>
      )}
    </div>
  )
}

const SUPABASE_FUNCTIONS_URL = 'https://dtemxsvjkxgncvdpjtwg.supabase.co/functions/v1'

function GemPackageCard({ pkg, onBuy, loading }) {
  return (
    <div className={`gem-pkg${pkg.badge ? ' gem-pkg-popular' : ''}`}>
      {pkg.badge && <div className="gem-pkg-badge">{pkg.badge}</div>}
      <div className="gem-pkg-label">{pkg.label}</div>
      <div className="gem-pkg-count">
        <GemIcon size={28}/> {pkg.gems}
      </div>
      <div className="gem-pkg-price">{pkg.price.toLocaleString()} ₸</div>
      <button className="gem-pkg-btn" onClick={() => onBuy(pkg)} disabled={loading}>
        {loading ? 'Загрузка…' : 'Купить'}
      </button>
    </div>
  )
}

export default function ShopPage({ navigate, gems, setGems, ownedThemes, setOwnedThemes, ownedEmojis, setOwnedEmojis, activeThemeId, setActiveThemeId, session, userWins = 0 }) {
  const [msg, setMsg] = useState(null)
  const [buyingGems, setBuyingGems] = useState(false)

  async function buyGemsPackage(pkg) {
    if (!session) { setMsg({ text: 'Войди в аккаунт чтобы купить гемы', err: true }); return }
    setBuyingGems(true)
    try {
      const { data: { session: authSession } } = await sb.auth.getSession()
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ packageId: pkg.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMsg({ text: data.error || 'Ошибка оплаты', err: true })
      }
    } catch {
      setMsg({ text: 'Ошибка подключения', err: true })
    } finally {
      setBuyingGems(false)
    }
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3000)
    return () => clearTimeout(t)
  }, [msg])

  async function syncProfile(updates) {
    if (!session) return
    await sb.from('profiles').update(updates).eq('id', session.user.id)
  }

  function buyTheme(theme) {
    if (gems < theme.price) { setMsg({ text: 'Не хватает гемов!', err: true }); return }
    const newGems = gems - theme.price
    const newOwned = [...ownedThemes, theme.id]
    setGems(newGems)
    setOwnedThemes(newOwned)
    localStorage.setItem('ownedThemes', JSON.stringify(newOwned))
    localStorage.setItem('gems', String(newGems))
    syncProfile({ gems: newGems, owned_themes: newOwned })
    activateTheme(theme.id)
    setMsg({ text: `Тема «${theme.name}» куплена!`, err: false })
  }

  function activateTheme(themeId) {
    applyTheme(themeId)
    setActiveThemeId(themeId)
  }

  function buyEmoji(emoji) {
    if (emoji.req && userWins < emoji.req.wins) { setMsg({ text: 'Недостаточно побед', err: true }); return }
    if (emoji.price > 0 && gems < emoji.price) { setMsg({ text: 'Не хватает гемов!', err: true }); return }
    const newGems = emoji.price > 0 ? gems - emoji.price : gems
    const newOwned = [...ownedEmojis, emoji.id]
    setGems(newGems)
    setOwnedEmojis(newOwned)
    localStorage.setItem('ownedEmojis', JSON.stringify(newOwned))
    if (emoji.price > 0) localStorage.setItem('gems', String(newGems))
    syncProfile({ gems: newGems, owned_emojis: newOwned })
    setMsg({ text: `Эмодзи «${emoji.name}» куплено!`, err: false })
  }

  return (
    <div className="shop-page">
      <div className="shop-hero">
        <h1>Магазин</h1>
        <p>Украшай свою игру, получай гемы за победы</p>
        <div className="shop-gems-bar">
          <div className="shop-gems-badge">
            <GemIcon size={20}/>
            <span>{gems} гемов</span>
          </div>
          {!session && (
            <span style={{fontSize:'.78rem',color:'var(--text3)'}}>Войди чтобы сохранить прогресс</span>
          )}
        </div>
      </div>

      {msg && (
        <div className={`shop-msg ${msg.err ? 'shop-msg-err' : 'shop-msg-ok'}`}>{msg.text}</div>
      )}

      {/* Themes */}
      <section className="shop-section">
        <div className="shop-section-head">
          <h2>Темы доски</h2>
          <p>Измени внешний вид доски и фигур — тема применяется сразу</p>
        </div>
        <div className="theme-grid">
          {THEMES.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              owned={ownedThemes.includes(theme.id)}
              active={activeThemeId === theme.id}
              gems={gems}
              onBuy={() => buyTheme(theme)}
              onActivate={() => activateTheme(theme.id)}
            />
          ))}
        </div>
      </section>

      <div className="shop-divider"/>

      {/* Emojis */}
      <section className="shop-section">
        <div className="shop-section-head">
          <h2>Эмодзи-реакции</h2>
          <p>Используй во время игры с другом — кидай реакции прямо в матче</p>
        </div>
        <div className="emoji-grid">
          {EMOJIS.map(emoji => (
            <EmojiCard
              key={emoji.id}
              emoji={emoji}
              owned={ownedEmojis.includes(emoji.id)}
              gems={gems}
              userWins={userWins}
              onBuy={() => buyEmoji(emoji)}
            />
          ))}
        </div>
      </section>

      <div className="shop-divider"/>

      {/* Buy Gems */}
      <section className="shop-section">
        <div className="shop-section-head">
          <h2>Пополнить гемы</h2>
          <p>Зарабатывай гемы за победы (+50 за каждую) или купи сразу</p>
        </div>
        <div className="gems-grid">
          {GEM_PACKAGES.map(pkg => (
            <GemPackageCard key={pkg.id} pkg={pkg} onBuy={buyGemsPackage} loading={buyingGems}/>
          ))}
        </div>
        <p className="shop-coming-soon">💳 Оплата через Kaspi Pay · Stripe · Halyk Bank — скоро будет доступна</p>
      </section>
    </div>
  )
}
