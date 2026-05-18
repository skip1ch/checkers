import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { THEMES } from '../lib/themes'

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

function calcSkills(wins, gamesPlayed, totalCaptures, gems) {
  const wr = gamesPlayed > 0 ? wins / gamesPlayed : 0
  const cpg = gamesPlayed > 0 ? totalCaptures / gamesPlayed : 0
  return [
    Math.min(20, Math.round(cpg * 1.8)),
    Math.round(wr * 20),
    Math.min(20, Math.round(Math.log10(gamesPlayed + 1) * 13)),
    Math.min(20, Math.round(10 + wr * 8)),
    Math.min(20, Math.round(wr * 13 + Math.min(7, gamesPlayed / 5))),
    Math.min(20, Math.max(6, Math.round(gems / 60 + 8))),
  ]
}

function formatMemberSince(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage({
  navigate,
  session,
  user,
  gems,
  ownedThemes,
  activeThemeId,
  userWins,
  gamesPlayed,
  totalCaptures,
  onSignOut,
}) {
  const radarRef = useRef(null)
  const donutRef = useRef(null)
  const radarChart = useRef(null)
  const donutChart = useRef(null)

  const wins = userWins || 0
  const played = gamesPlayed || 0
  const captures = totalCaptures || 0
  const winPct = played > 0 ? Math.round(wins / played * 100) : 0
  const losses = played - wins

  const memberSince = session?.user?.created_at
    ? formatMemberSince(session.user.created_at)
    : ''

  const skills = calcSkills(wins, played, captures, gems)

  useEffect(() => {
    if (!radarRef.current) return

    const ctx = radarRef.current.getContext('2d')
    radarChart.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Агрессия', 'Мастерство', 'Опыт', 'Скорость', 'Стратегия', 'Удача'],
        datasets: [{
          data: skills,
          borderColor: '#6b4423',
          backgroundColor: 'rgba(107,68,35,0.12)',
          pointBackgroundColor: '#c9a227',
          pointBorderColor: '#6b4423',
          pointRadius: 4,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 20,
            grid: { color: 'rgba(107,68,35,0.15)' },
            angleLines: { color: 'rgba(107,68,35,0.15)' },
            pointLabels: {
              font: { size: 11 },
              color: '#6b5040',
            },
            ticks: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    })

    return () => { radarChart.current?.destroy() }
  }, [wins, played, captures, gems])

  useEffect(() => {
    if (!donutRef.current) return

    const total = wins + losses
    const isZero = total === 0
    const data = isZero ? [1, 1] : [wins, losses]
    const colors = isZero ? ['#e8dcc8', '#d4c4b0'] : ['#4a7c4e', '#c0392b']

    const centerTextPlugin = {
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart
        const pct = total > 0 ? Math.round(wins / total * 100) : 0
        ctx.save()
        ctx.font = "bold 22px 'Playfair Display', serif"
        ctx.fillStyle = '#2b1810'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${pct}%`, left + width / 2, top + height / 2 - 8)
        ctx.font = "11px Inter, sans-serif"
        ctx.fillStyle = '#a08060'
        ctx.fillText('побед', left + width / 2, top + height / 2 + 14)
        ctx.restore()
      },
    }

    const ctx = donutRef.current.getContext('2d')
    donutChart.current = new Chart(ctx, {
      type: 'doughnut',
      plugins: [centerTextPlugin],
      data: {
        labels: ['Победы', 'Поражения'],
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              font: { size: 11 },
              color: '#6b5040',
              padding: 14,
            },
          },
        },
      },
    })

    return () => { donutChart.current?.destroy() }
  }, [wins, losses])

  const ownedThemeObjs = THEMES.filter(t => ownedThemes?.includes(t.id))

  return (
    <div className="profile-page">
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">
          {getInitials(user?.name)}
        </div>
        <div className="profile-info">
          <div className="profile-name">{user?.name || 'Игрок'}</div>
          <div className="profile-email">{session?.user?.email || ''}</div>
          {memberSince && (
            <div className="profile-since">Участник с {memberSince}</div>
          )}
          <div className="profile-gems-badge" style={{marginTop: 8}}>
            <GemIcon size={16}/>
            <span>{gems ?? 0} гемов</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-val">{played}</div>
          <div className="profile-stat-lbl">Игр сыграно</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{wins}</div>
          <div className="profile-stat-lbl">Побед</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{winPct}%</div>
          <div className="profile-stat-lbl">Процент побед</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-val">{captures}</div>
          <div className="profile-stat-lbl">Захватов</div>
        </div>
      </div>

      {/* Charts */}
      <div className="profile-charts">
        <div className="profile-chart-card">
          <div className="profile-chart-title">Навыки игрока</div>
          <div className="profile-chart-wrap">
            <canvas ref={radarRef}/>
          </div>
        </div>
        <div className="profile-chart-card">
          <div className="profile-chart-title">Победы и поражения</div>
          <div className="profile-chart-wrap">
            <canvas ref={donutRef}/>
          </div>
        </div>
      </div>

      {/* Owned themes */}
      <div className="profile-themes">
        <div className="profile-themes-title">Мои темы</div>
        <div className="profile-themes-grid">
          {ownedThemeObjs.map(theme => (
            <div
              key={theme.id}
              className="profile-theme-chip"
              style={activeThemeId === theme.id ? {borderColor: 'var(--primary)', background: 'rgba(107,68,35,0.06)'} : {}}
            >
              <div style={{display:'flex',gap:3}}>
                {theme.preview.map((color, i) => (
                  <div
                    key={i}
                    className="profile-theme-dot"
                    style={{background: color}}
                  />
                ))}
              </div>
              <span>{theme.name}</span>
              {activeThemeId === theme.id && (
                <span style={{fontSize:'.65rem',color:'var(--primary)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
                  активна
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="profile-actions">
        <button className="btn-ghost" onClick={() => navigate('shop')}>
          Магазин
        </button>
        <button className="btn-primary" onClick={() => navigate('play')}>
          Играть
        </button>
        <button
          className="btn-ghost"
          onClick={onSignOut}
          style={{marginLeft:'auto', color:'var(--red)', borderColor:'rgba(192,57,43,0.3)'}}
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
