import { useState } from 'react'
import { sb } from '../lib/supabase'

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nick, setNick] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function signInGoogle() {
    setError(''); setLoading(true)
    const { error: e } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    })
    if (e) { setError(e.message); setLoading(false) }
  }

  async function submit() {
    setError(''); setLoading(true)
    try {
      if (tab === 'login') {
        const { error: e } = await sb.auth.signInWithPassword({ email, password: pass })
        if (e) setError(e.message === 'Invalid login credentials' ? 'Неверный email или пароль' : e.message)
      } else {
        if (!email || !pass) { setError('Заполни все поля'); setLoading(false); return }
        const { data, error: e } = await sb.auth.signUp({
          email, password: pass,
          options: { data: { username: nick || email.split('@')[0] } }
        })
        if (e) setError(e.message)
        else if (data.user) {
          await sb.from('profiles').upsert({ id: data.user.id, username: nick || email.split('@')[0] })
          setSuccess('Аккаунт создан! Входим…')
        }
      }
    } catch (e) { setError('Ошибка соединения') }
    setLoading(false)
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{display:'flex',justifyContent:'center'}}>
            <div className="navbar-logo-icon wood-grain" style={{width:52,height:52,borderRadius:12}}>
              <div className="navbar-logo-piece" style={{width:28,height:28}}/>
            </div>
          </div>
          <div className="auth-logo-title">Дубовая Доска</div>
          <div className="auth-logo-sub">Войди чтобы сохранять прогресс</div>
        </div>

        <button className="btn-google" onClick={signInGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Загрузка…' : 'Войти через Google'}
        </button>

        <div className="auth-divider">или</div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab==='login'?'auth-tab-active':''}`} onClick={()=>{setTab('login');setError('')}}>Войти</button>
          <button className={`auth-tab ${tab==='signup'?'auth-tab-active':''}`} onClick={()=>{setTab('signup');setError('')}}>Регистрация</button>
        </div>

        {tab==='signup' && (
          <div className="auth-field">
            <label>Никнейм</label>
            <input className="auth-input" placeholder="Игровой ник" value={nick} onChange={e=>setNick(e.target.value)}/>
          </div>
        )}
        <div className="auth-field">
          <label>Email</label>
          <input className="auth-input" type="email" placeholder="email@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div className="auth-field">
          <label>Пароль</label>
          <input className="auth-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <button className="btn-primary btn-full" onClick={submit} disabled={loading} style={{opacity:loading?.6:1}}>
          {loading ? 'Загрузка…' : tab==='login' ? 'Войти →' : 'Создать аккаунт →'}
        </button>
      </div>
    </div>
  )
}
