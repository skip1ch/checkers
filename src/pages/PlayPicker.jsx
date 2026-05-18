export default function PlayPicker({ navigate }) {
  return (
    <div className="play-page">
      <h1 className="play-title">Выберите режим игры</h1>
      <p className="play-sub">С чего начнём партию?</p>
      <div className="mode-cards">
        <div className="mode-card mode-card-accent">
          <div className="mode-card-icon wood-grain"/>
          <h3>Против ИИ</h3>
          <p>Три уровня сложности — от расслабленного до серьёзного.</p>
          <div className="level-btns">
            <button className="level-btn level-btn-ghost" onClick={() => navigate('game', { mode:'ai', level:'easy' })}>Лёгкий</button>
            <button className="level-btn level-btn-ghost" onClick={() => navigate('game', { mode:'ai', level:'medium' })}>Средний</button>
            <button className="level-btn level-btn-primary" onClick={() => navigate('game', { mode:'ai', level:'hard' })}>Сложный</button>
          </div>
        </div>

        <div className="mode-card">
          <div className="mode-card-icon wood-grain"/>
          <h3>Вдвоём за устройством</h3>
          <p>Классический «hot-seat»: передавайте ход друг другу.</p>
          <button className="btn-primary" onClick={() => navigate('game', { mode:'local' })}>Начать</button>
        </div>

        <div className="mode-card">
          <div className="mode-card-icon wood-grain"/>
          <h3>С другом по ссылке</h3>
          <p>Создайте комнату и поделитесь ссылкой, или войдите по коду друга.</p>
          <button className="btn-primary" onClick={() => navigate('friend-lobby')}>Создать / Войти в комнату</button>
        </div>
      </div>
    </div>
  )
}
