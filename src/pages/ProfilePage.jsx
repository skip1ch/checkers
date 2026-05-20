import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { THEMES, EMOJIS } from '../lib/themes'
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
    </svg>
  )
}

const RANKS = [
  { min: 0,   label: 'Новичок',   emoji: '🌱', color: '#7aad6e' },
  { min: 5,   label: 'Любитель',  emoji: '⚔️',  color: '#6b9fd4' },
  { min: 15,  label: 'Игрок',     emoji: '🎯',  color: '#c9a227' },
  { min: 30,  label: 'Мастер',    emoji: '👑',  color: '#a0522d' },
  { min: 50,  label: 'Ветеран',   emoji: '⭐',  color: '#8e44ad' },
  { min: 100, label: 'Легенда',   emoji: '🏆',  color: '#c0392b' },
]

function getRank(games) {
  let rank = RANKS[0]
  for (const r of RANKS) { if (games >= r.min) rank = r }
  return rank
}

function getNextRank(games) {
  for (const r of RANKS) { if (games < r.min) return r }
  return null
}

function calcSkills(wins, gamesPlayed, totalCaptures, gems) {
  if (gamesPlayed === 0) return [0, 0, 0, 0, 0, 0]
  const wr = wins / gamesPlayed
  const cpg = totalCaptures / gamesPlayed
  // gf растёт логарифмически: ~0.15 при 1 игре, ~0.5 при 10, ~0.85 при 50, 1.0 при 100+
  const gf = Math.min(1, Math.log10(gamesPlayed + 1) / 2)
  const gemF = Math.min(1, gems / 1000)
  return [
    Math.min(20, Math.round(Math.min(12, cpg * 1.5) + gf * 8)),   // Агрессия: захваты за игру
    Math.min(20, Math.round(wr * 10 * gf + gf * 10)),             // Мастерство: % побед × опыт
    Math.min(20, Math.round(gf * 20)),                             // Опыт: только кол-во игр
    Math.min(20, Math.round(wr * 6 + gf * 14)),                   // Скорость: баланс
    Math.min(20, Math.round(wr * 8 * gf + cpg * 0.5 + gf * 8)),  // Стратегия
    Math.min(20, Math.round(gemF * 10 + wr * 5 * gf + gf * 5)),  // Удача: гемы + победы
  ]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU', { year:'numeric', month:'long', day:'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage({ navigate, session, user, gems, trophies = 0, ownedThemes, ownedEmojis = [], selectedEmojis = [], onToggleEmoji, activeThemeId, userWins, gamesPlayed, totalCaptures, onSignOut, onRename, onViewReplay }) {
  const radarRef = useRef(null)
  const donutRef = useRef(null)
  const radarChart = useRef(null)
  const donutChart = useRef(null)
  const inputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const wins = userWins || 0
  const played = gamesPlayed || 0
  const captures = totalCaptures || 0
  // Fix: wins can't exceed played (data inconsistency guard)
  const safeWins = Math.min(wins, Math.max(wins, played))
  const losses = Math.max(0, played - wins)
  const winPct = played > 0 ? Math.min(100, Math.round(wins / played * 100)) : 0

  const rank = getRank(played)
  const nextRank = getNextRank(played)
  const rankProgress = nextRank
    ? Math.round(((played - rank.min) / (nextRank.min - rank.min)) * 100)
    : 100

  const skills = calcSkills(wins, played, captures, gems)

  function startEdit() {
    setEditName(user?.name || '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function saveEdit() {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === user?.name) { setEditing(false); return }
    if (trimmed.length < 2) { setSaveMsg({ text: 'Минимум 2 символа', err: true }); return }
    if (trimmed.length > 24) { setSaveMsg({ text: 'Максимум 24 символа', err: true }); return }
    setSaving(true)
    const { error } = await sb.from('profiles').update({ username: trimmed }).eq('id', session.user.id)
    setSaving(false)
    if (error) {
      setSaveMsg({ text: 'Ошибка сохранения', err: true })
    } else {
      onRename?.(trimmed)
      setEditing(false)
      setSaveMsg({ text: '✓ Никнейм обновлён', err: false })
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  useEffect(() => {
    if (!radarRef.current) return
    radarChart.current?.destroy()
    radarChart.current = new Chart(radarRef.current, {
      type: 'radar',
      data: {
        labels: ['Агрессия', 'Мастерство', 'Опыт', 'Скорость', 'Стратегия', 'Удача'],
        datasets: [{
          data: skills,
          borderColor: '#6b4423',
          backgroundColor: 'rgba(107,68,35,0.13)',
          pointBackgroundColor: '#c9a227',
          pointBorderColor: '#6b4423',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600 },
        layout: { padding: { top: 12, bottom: 12, left: 16, right: 16 } },
        scales: {
          r: {
            min: 0, max: 20,
            grid: { color: 'rgba(107,68,35,0.12)' },
            angleLines: { color: 'rgba(107,68,35,0.12)' },
            pointLabels: { font: { size: 11, family: 'Inter' }, color: '#6b5040', padding: 6 },
            ticks: { display: false, stepSize: 5 },
          },
        },
        plugins: { legend: { display: false } },
      },
    })
    return () => radarChart.current?.destroy()
  }, [wins, played, captures, gems])

  useEffect(() => {
    if (!donutRef.current) return
    donutChart.current?.destroy()

    const isEmpty = played === 0
    const data = isEmpty ? [1, 1] : [Math.max(0, wins), Math.max(0, losses)]
    const colors = isEmpty ? ['#e8dcc8', '#d4c4b0'] : ['#4a7c4e', '#c0392b']
    const pct = winPct

    const centerPlugin = {
      id: 'center',
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart
        ctx.save()
        ctx.font = `bold 24px 'Playfair Display', serif`
        ctx.fillStyle = isEmpty ? '#c0b090' : '#2b1810'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${pct}%`, left + width / 2, top + height / 2 - 10)
        ctx.font = '11px Inter, sans-serif'
        ctx.fillStyle = '#a08060'
        ctx.fillText('побед', left + width / 2, top + height / 2 + 14)
        ctx.restore()
      },
    }

    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      plugins: [centerPlugin],
      data: {
        labels: ['Победы', 'Поражения'],
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600 },
        cutout: '74%',
        plugins: {
          legend: {
            display: true, position: 'bottom',
            labels: { font: { size: 11 }, color: '#6b5040', padding: 16, usePointStyle: true, pointStyleWidth: 10 },
          },
          tooltip: { enabled: !isEmpty },
        },
      },
    })
    return () => donutChart.current?.destroy()
  }, [wins, losses, played])

  const ownedThemeObjs = THEMES.filter(t => ownedThemes?.includes(t.id))

  return (
    <div className="profile-page">

      {/* ── Hero ── */}
      <div className="profile-hero">
        <div className="profile-avatar">{getInitials(user?.name)}</div>
        <div className="profile-info" style={{flex:1,minWidth:0}}>

          {/* Name + edit */}
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4}}>
            {editing ? (
              <>
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') saveEdit(); if (e.key==='Escape') setEditing(false) }}
                  maxLength={24}
                  style={{fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',fontWeight:700,border:'none',borderBottom:'2px solid var(--primary)',background:'transparent',outline:'none',color:'var(--text)',width:180,padding:'2px 0'}}
                />
                <button onClick={saveEdit} disabled={saving} style={{padding:'4px 14px',borderRadius:'var(--r)',border:'none',background:'var(--primary)',color:'#fff',fontWeight:600,fontSize:'.82rem',cursor:'pointer'}}>
                  {saving ? '…' : 'Сохранить'}
                </button>
                <button onClick={() => setEditing(false)} style={{padding:'4px 10px',borderRadius:'var(--r)',border:'1px solid var(--border2)',background:'none',color:'var(--text2)',fontSize:'.82rem',cursor:'pointer'}}>
                  Отмена
                </button>
              </>
            ) : (
              <>
                <div className="profile-name">{user?.name || 'Игрок'}</div>
                <button onClick={startEdit} title="Изменить никнейм" style={{background:'none',border:'1px solid var(--border2)',borderRadius:'var(--r)',padding:'3px 9px',cursor:'pointer',color:'var(--text3)',fontSize:'.72rem',display:'flex',alignItems:'center',gap:4,transition:'background .15s'}} onMouseOver={e=>e.currentTarget.style.background='var(--surface2)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Изменить
                </button>
              </>
            )}
          </div>

          {saveMsg && <div style={{fontSize:'.75rem',fontWeight:600,color:saveMsg.err?'var(--red)':'var(--green)',marginBottom:4}}>{saveMsg.text}</div>}

          <div style={{fontSize:'.82rem',color:'var(--text3)',marginBottom:2}}>{session?.user?.email || ''}</div>
          {session?.user?.created_at && (
            <div style={{fontSize:'.75rem',color:'var(--text3)',marginBottom:10}}>Участник с {formatDate(session.user.created_at)}</div>
          )}

          {/* Rank badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:`${rank.color}18`,border:`1.5px solid ${rank.color}40`,borderRadius:99,padding:'5px 14px',fontSize:'.85rem',fontWeight:700,color:rank.color,marginBottom:6}}>
            <span>{rank.emoji}</span> {rank.label}
          </div>

          {/* Trophies + gems row */}
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginTop:4}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(201,162,39,0.12)',border:'1.5px solid rgba(201,162,39,0.35)',borderRadius:99,padding:'6px 16px',fontSize:'1rem',fontWeight:700,color:'#8a6a00'}}>
              🏆 {trophies} кубков
            </div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(41,182,246,0.1)',border:'1.5px solid rgba(41,182,246,0.3)',borderRadius:99,padding:'6px 16px',fontSize:'1rem',fontWeight:700,color:'#0277bd'}}>
              <GemIcon size={15}/> {gems ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="profile-charts">
        <div className="profile-chart-card">
          <div className="profile-chart-title">Навыки игрока</div>
          {played === 0 && (
            <div style={{textAlign:'center',fontSize:'.78rem',color:'var(--text3)',marginBottom:8}}>Сыграй партию — и здесь появятся твои навыки</div>
          )}
          <div className="profile-chart-wrap">
            <canvas ref={radarRef}/>
          </div>
        </div>
        <div className="profile-chart-card">
          <div className="profile-chart-title">Победы и поражения</div>
          {played === 0 && (
            <div style={{textAlign:'center',padding:'16px 0 8px',fontSize:'.8rem',color:'var(--text3)'}}>Статистика появится после первой игры</div>
          )}
          <div className="profile-chart-wrap">
            <canvas ref={donutRef}/>
          </div>
        </div>
      </div>

      {/* ── Themes ── */}
      <div className="profile-themes">
        <div className="profile-themes-title">Мои темы ({ownedThemeObjs.length}/{THEMES.length})</div>
        <div className="profile-themes-grid">
          {ownedThemeObjs.map(theme => (
            <div key={theme.id} className="profile-theme-chip" style={activeThemeId===theme.id?{borderColor:'var(--primary)',background:'rgba(107,68,35,0.07)'}:{}}>
              <div style={{display:'flex',gap:3,borderRadius:4,overflow:'hidden'}}>
                {theme.preview.map((c,i) => <div key={i} style={{width:14,height:14,background:c}}/>)}
              </div>
              <span>{theme.name}</span>
              {activeThemeId===theme.id && <span style={{fontSize:'.6rem',color:'var(--primary)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>✓</span>}
            </div>
          ))}
          {THEMES.filter(t => !ownedThemes?.includes(t.id)).slice(0,2).map(theme => (
            <div key={theme.id} className="profile-theme-chip" style={{opacity:0.45,cursor:'pointer'}} onClick={() => navigate('shop')}>
              <div style={{display:'flex',gap:3,borderRadius:4,overflow:'hidden',filter:'grayscale(1)'}}>
                {theme.preview.map((c,i) => <div key={i} style={{width:14,height:14,background:c}}/>)}
              </div>
              <span>{theme.name}</span>
              <span style={{fontSize:'.65rem',color:'var(--text3)'}}>🔒</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Emoji Panel Selection ── */}
      {ownedEmojis.length > 0 && (
        <div className="profile-themes" style={{marginTop:0}}>
          <div className="profile-themes-title">
            Эмодзи-панель
            <span style={{fontWeight:400,color:'var(--text3)',fontSize:'.8rem',marginLeft:8}}>
              {selectedEmojis.length}/5 выбрано
            </span>
          </div>
          <p style={{fontSize:'.78rem',color:'var(--text3)',marginBottom:12,marginTop:-4}}>
            Выбери 5 эмодзи для использования в игре
          </p>
          <div className="emoji-select-grid">
            {EMOJIS.filter(e => ownedEmojis.includes(e.id)).map(e => {
              const isSelected = selectedEmojis.includes(e.id)
              return (
                <button
                  key={e.id}
                  className={`emoji-select-chip${isSelected ? ' selected' : ''}`}
                  onClick={() => onToggleEmoji?.(e.id)}
                  title={e.name}
                >
                  <span className="emoji-select-char">{e.char}</span>
                  <span className="emoji-select-name">{e.name}</span>
                  {isSelected && <span className="emoji-select-check">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Match History ── */}
      {(() => {
        const matchHistory = JSON.parse(localStorage.getItem('match_history') || '[]').slice(0, 10)
        const modeLabel = (m) => m === 'ai' ? 'ИИ' : m === 'friend' ? 'Онлайн' : 'Местная'
        const shortDate = (iso) => {
          const d = new Date(iso)
          return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        }
        return (
          <div className="match-history">
            <div className="match-history-title">История матчей</div>
            {matchHistory.length === 0 ? (
              <div style={{textAlign:'center',color:'var(--text3)',fontSize:'.85rem',padding:'16px 0'}}>Нет матчей</div>
            ) : (
              matchHistory.map(h => (
                <div key={h.id} className="match-row">
                  <span style={{flex:1,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.opponent}</span>
                  <span className={h.won ? 'match-result-win' : 'match-result-loss'}>
                    {h.won ? 'Победа' : 'Поражение'}
                  </span>
                  {h.gemsEarned > 0 && (
                    <span style={{color:'#0277bd',fontWeight:700,fontSize:'.8rem'}}>+{h.gemsEarned} 💎</span>
                  )}
                  {h.trophiesEarned > 0 && (
                    <span style={{color:'#8a6a00',fontWeight:700,fontSize:'.8rem'}}>+{h.trophiesEarned} 🏆</span>
                  )}
                  {h.trophiesEarned < 0 && (
                    <span style={{color:'var(--red)',fontWeight:700,fontSize:'.8rem'}}>{h.trophiesEarned} 🏆</span>
                  )}
                  <span style={{color:'var(--text3)',fontSize:'.75rem',flexShrink:0}}>{shortDate(h.date)}</span>
                  {h.history?.length > 0 && (
                    <button className="match-replay-btn" onClick={() => onViewReplay?.(h)}>Разбор</button>
                  )}
                </div>
              ))
            )}
          </div>
        )
      })()}

      {/* ── Actions ── */}
      <div className="profile-actions">
        <button className="btn-ghost" onClick={() => navigate('shop')}>Магазин</button>
        <button className="btn-primary" onClick={() => navigate('play')}>Играть</button>
        <button className="btn-ghost" onClick={onSignOut} style={{marginLeft:'auto',color:'var(--red)',borderColor:'rgba(192,57,43,0.3)'}}>
          Выйти из аккаунта
        </button>
      </div>

    </div>
  )
}
