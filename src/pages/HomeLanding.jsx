function DecorativeBoard() {
  const setup = [
    [0,1,'b'],[0,3,'b'],[0,5,'b'],[0,7,'b'],
    [1,0,'b'],[1,2,'b'],[1,6,'b'],
    [2,3,'b'],[2,7,'b'],
    [5,0,'w'],[5,4,'w'],[5,6,'w'],
    [6,1,'w'],[6,3,'w'],[6,5,'w'],[6,7,'w'],
    [7,0,'w'],[7,2,'w'],[7,4,'w',true],[7,6,'w'],
  ]
  return (
    <div className="hero-board">
      <div className="hero-board-wrap wood-grain">
        <div className="hero-board-inner">
          <div className="hero-board-grid">
            {Array.from({length:64}).map((_,i) => {
              const r=Math.floor(i/8), c=i%8
              const dark=(r+c)%2===1
              const piece=setup.find(p=>p[0]===r&&p[1]===c)
              return (
                <div key={i} className={`hero-sq ${dark?'wood-grain':'wood-grain-light'}`}>
                  {piece && (
                    <div className={`hero-piece ${piece[2]==='w'?'hero-piece-w':'hero-piece-b'}`}>
                      {piece[3] && (
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg viewBox="0 0 24 24" style={{width:'40%',height:'40%'}}>
                            <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" fill="#a07a48" stroke="#6b4423" strokeWidth="1"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="hero-glow1"/>
      <div className="hero-glow2"/>
    </div>
  )
}

export default function HomeLanding({ navigate }) {
  const features = [
    { title:'Умный ИИ', body:'Три уровня: от расслабленной партии до серьёзного вызова. Минимакс с α-β отсечением, считает ходы в фоне.' },
    { title:'Игра с другом', body:'Создайте комнату и поделитесь ссылкой — друг подключится в один клик. Или играйте вдвоём за одним устройством.' },
    { title:'Русские правила', body:'Бой обязателен, шашка бьёт и назад, дамка летает. Всё по канону русских шашек.' },
  ]
  const steps = [
    { n:'01', t:'Выберите режим', d:'Против ИИ, с другом по ссылке или hot-seat на одном устройстве.' },
    { n:'02', t:'Нажмите на шашку', d:'Подсветятся возможные ходы. Если есть бой — придётся бить.' },
    { n:'03', t:'Дойдите до края', d:'Простая шашка превращается в дамку и ходит по всей диагонали.' },
  ]
  return (
    <>
      <section className="hero">
        <div className="hero-bg cream-paper"/>
        <div className="hero-inner">
          <div>
            <div className="hero-badge"><span className="hero-badge-dot"/><span>Русские шашки</span></div>
            <h1 className="hero-title">Классика, в которую <em>приятно играть</em>.</h1>
            <p className="hero-desc">Тёплое дерево, тяжёлые шашки, благородные дамки. Сразись с умным ИИ трёх уровней или позови друга — без регистрации и в один клик.</p>
            <div className="hero-btns">
              <button className="btn-primary" style={{padding:'12px 28px',fontSize:'1rem'}} onClick={() => navigate('play')}>Играть сейчас →</button>
              <button className="btn-ghost" style={{padding:'12px 28px',fontSize:'1rem'}} onClick={() => navigate('rules')}>Правила игры</button>
            </div>
          </div>
          <DecorativeBoard/>
        </div>
      </section>

      <section className="section section-center">
        <h2 className="section-title">Сделано для удовольствия</h2>
        <p className="section-sub">Никаких всплывающих окон, никакой рекламы. Только вы, доска и партия.</p>
        <div className="grid-3">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon wood-grain"/>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="section">
          <h2 className="section-title" style={{marginBottom:32}}>Как играть</h2>
          <div className="grid-3">
            {steps.map(s => (
              <div key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3 className="step-title">{s.t}</h3>
                <p className="step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">Готовы к партии?</h2>
        <p className="cta-desc">Открывайте доску и делайте первый ход.</p>
        <button className="btn-primary" style={{padding:'14px 40px',fontSize:'1.1rem'}} onClick={() => navigate('play')}>
          Сесть за доску →
        </button>
      </section>
    </>
  )
}
