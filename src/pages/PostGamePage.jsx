import { useState, useEffect, useRef, useMemo } from 'react'
import { GL } from '../lib/gl'
import { generateReview, calcScore } from '../lib/analysis'
import { THEMES as ALL_THEMES } from '../lib/themes'
import MiniBoard from '../components/MiniBoard'
import CaptureChart from '../components/CaptureChart'

export default function PostGamePage({ result, navigate, ownedThemes = [], activeThemeId, onApplyTheme }) {
  const { winner, history=[], mode='ai', level='medium', timer=0, gemsEarned=0, myColor='w' } = result||{}
  const isDraw = winner === 'DRAW'
  const won = isDraw ? false : (mode === 'local' ? winner === 'W' : (winner === 'W') === (myColor === 'w'))
  const iAm = mode !== 'friend' || myColor === 'w'
  const pCaps = history.filter(m=> iAm ? m.white : !m.white).reduce((s,m)=>s+m.caps.length,0)
  const aCaps = history.filter(m=> iAm ? !m.white : m.white).reduce((s,m)=>s+m.caps.length,0)
  const moves = history.length
  const total = pCaps+aCaps
  const eff = total>0 ? Math.round(pCaps/total*100) : 0
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const tips = generateReview(result)
  const score = calcScore(result)
  const scoreColor = score>=75?'var(--green)':score>=50?'var(--primary)':score>=30?'var(--gold)':'var(--red)'

  const [replayIdx, setReplayIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const listRef = useRef(null)
  const manualNavRef = useRef(false)

  const replayBoards = useMemo(() => {
    const boards = [GL.init()]
    history.forEach(m => boards.push(GL.apply(boards[boards.length-1], m)))
    return boards
  }, [])

  useEffect(() => { setPlaying(true) }, [])

  useEffect(() => {
    if (!playing) return
    if (replayIdx>=history.length-1) { setPlaying(false); return }
    const t = setTimeout(() => setReplayIdx(i=>i+1), 700)
    return () => clearTimeout(t)
  }, [playing, replayIdx])

  useEffect(() => {
    if (!manualNavRef.current) return
    manualNavRef.current = false
    const list = listRef.current
    if (!list) return
    const active = list.querySelector('.replay-row.active')
    if (!active) return
    const lr = list.getBoundingClientRect()
    const ar = active.getBoundingClientRect()
    const relTop = ar.top - lr.top + list.scrollTop
    const relBot = relTop + ar.height
    if (relTop < list.scrollTop + 4) list.scrollTop = relTop - 4
    else if (relBot > list.scrollTop + list.clientHeight - 4) list.scrollTop = relBot - list.clientHeight + 4
  }, [replayIdx])

  const curBoard = replayBoards[Math.min(replayIdx+1, replayBoards.length-1)]
  const curMove = history[replayIdx] || null
  const progress = history.length>0 ? Math.round((replayIdx+1)/history.length*100) : 0
  const sq = m => m?.to ? String.fromCharCode(97+m.to[1])+(8-m.to[0]) : '?'

  function playAgain() {
    if (mode==='local') navigate('game', { mode:'local' })
    else if (mode==='ai') navigate('game', { mode:'ai', level })
    else navigate('friend-lobby')
  }

  const pairs = []
  for (let i=0; i<history.length; i+=2) pairs.push([i, history[i], i+1<history.length ? i+1 : null, history[i+1]])

  return (
    <div className="post-page">
      <div className="post-hero">
        {won && <span className="post-icon">🏆</span>}
        {isDraw && <span className="post-icon">🤝</span>}
        <h1 className="post-title">{isDraw ? 'Ничья' : won ? 'Победа!' : 'Поражение'}</h1>
        <p className="post-sub">{moves} ходов · {fmt(timer)}</p>
        {gemsEarned > 0 && (
          <div className="gems-earned">
            <svg width="16" height="16" viewBox="0 0 20 20" style={{flexShrink:0}}>
              <path d="M5,3 L15,3 L18,8 L10,18 L2,8 Z" fill="#29b6f6"/>
              <path d="M5,3 L15,3 L10,8 Z" fill="rgba(255,255,255,0.55)"/>
              <path d="M2,8 L5,3 L10,8 Z" fill="rgba(255,255,255,0.2)"/>
              <path d="M18,8 L15,3 L10,8 Z" fill="rgba(0,0,0,0.15)"/>
              <path d="M5,3 L15,3 L18,8 L10,18 L2,8 Z" fill="none" stroke="#0277bd" strokeWidth="0.7"/>
            </svg>
            +{gemsEarned} гемов за победу!
          </div>
        )}
      </div>

      {ownedThemes.length > 0 && onApplyTheme && (
        <div className="post-theme-bar">
          <span className="post-theme-label">Тема</span>
          <div className="post-theme-pills">
            {ALL_THEMES.filter(t => ownedThemes.includes(t.id)).map(t => (
              <button
                key={t.id}
                className={`post-theme-pill${activeThemeId === t.id ? ' active' : ''}`}
                onClick={() => onApplyTheme(t.id)}
                title={t.name}
              >
                <span className="post-theme-swatch" style={{background:`linear-gradient(135deg,${t.preview[0]} 50%,${t.preview[1]} 50%)`}}/>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="post-score-card">
        <div className="score-label">
          <span>Оценка партии</span>
          <span className="score-value" style={{color:scoreColor}}>{score}/100</span>
        </div>
        <div className="score-track">
          <div className="score-fill" style={{width:`${score}%`,background:scoreColor}}/>
        </div>
      </div>

      {history.length>1 && (
        <div className="chart-card">
          <div className="chart-title">Ход партии</div>
          <div className="chart-subtitle">Накопленные взятия по ходам</div>
          <div className="chart-wrap">
            <CaptureChart history={history} iAm={iAm}/>
          </div>
          <div className="stats-row">
            {[['Ходов',moves],['Взято',pCaps],['Потеряно',aCaps],['Эффект.',`${eff}%`],['Время',fmt(timer)]].map(([l,v])=>(
              <div key={l} className="stat-item"><div className="stat-v">{v}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
        </div>
      )}

      {history.length>0 && (
        <div className="replay-card">
          <div className="replay-title">Повтор партии</div>
          <div className="replay-body">
            <MiniBoard boardState={curBoard} fromSq={curMove?.from} toSq={curMove?.to}/>
            <div className="replay-info">
              <div className="replay-desc">
                {curMove
                  ? <>Ход {replayIdx+1}/{history.length}:{' '}
                      <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:curMove.white?'#d9c2a0':'#1a0d06',border:'1px solid #bbb',verticalAlign:'middle',margin:'0 3px'}}/>
                      {' → '}<strong>{sq(curMove)}</strong>{curMove.caps.length>0?` (×${curMove.caps.length})`:''}
                    </>
                  : 'Начальная позиция'
                }
              </div>
              <div className="replay-progress">
                <div className="replay-progress-fill" style={{width:`${progress}%`}}/>
              </div>
              <div className="replay-controls">
                <button className="replay-btn" title="В начало" onClick={()=>{manualNavRef.current=true;setReplayIdx(0);setPlaying(false)}}>⏮</button>
                <button className="replay-btn" title="Назад" onClick={()=>{manualNavRef.current=true;setPlaying(false);setReplayIdx(i=>Math.max(0,i-1))}}>◀</button>
                <button className={`replay-btn${playing?' active':''}`} onClick={()=>setPlaying(v=>!v)}>{playing?'⏸':'▶'}</button>
                <button className="replay-btn" title="Вперёд" onClick={()=>{manualNavRef.current=true;setPlaying(false);setReplayIdx(i=>Math.min(history.length-1,i+1))}}>▶</button>
                <button className="replay-btn" title="В конец" onClick={()=>{manualNavRef.current=true;setReplayIdx(history.length-1);setPlaying(false)}}>⏭</button>
              </div>
              <div className="replay-list" ref={listRef}>
                {pairs.map(([wi,wm,bi,bm]) => (
                  <div key={wi} style={{display:'contents'}}>
                    <div className={`replay-row${wi===replayIdx?' active':''}`} onClick={()=>{manualNavRef.current=true;setReplayIdx(wi);setPlaying(false)}}>
                      <span className="rr-num">{Math.floor(wi/2)+1}.</span>
                      <span className="rr-dot rr-dot-w"/>
                      <span className="rr-mv">{sq(wm)}{wm.caps.length>0?` ×${wm.caps.length}`:''}</span>
                    </div>
                    {bm && (
                      <div className={`replay-row${bi===replayIdx?' active':''}`} onClick={()=>{manualNavRef.current=true;setReplayIdx(bi);setPlaying(false)}}>
                        <span className="rr-num"/>
                        <span className="rr-dot rr-dot-b"/>
                        <span className="rr-mv">{sq(bm)}{bm.caps.length>0?` ×${bm.caps.length}`:''}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tips.length>0 && (
        <div className="coach-card">
          <div className="cc-head">
            <span>Разбор партии</span>
            <span style={{marginLeft:'auto',fontSize:'.72rem',fontWeight:400,color:'var(--text3)'}}>на основе вашей игры</span>
          </div>
          {tips.map((t,i) => (
            <div key={i} className="cc-tip">
              <strong>{t.title}</strong>
              <p>{t.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="post-btns">
        <button className="btn-primary" onClick={playAgain}>Ещё раз</button>
        <button className="btn-ghost" onClick={() => navigate('home')}>На главную</button>
      </div>
    </div>
  )
}
