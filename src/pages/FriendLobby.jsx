import { useState, useEffect, useRef } from 'react'
import { sb } from '../lib/supabase'

export default function FriendLobby({ navigate, user, screenParams }) {
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [inputCode, setInputCode] = useState(screenParams?.autoJoin || '')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const chRef = useRef(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    if (screenParams?.autoJoin) joinRoom(screenParams.autoJoin)
  }, [])

  useEffect(() => () => { chRef.current?.unsubscribe() }, [])

  function createRoom() {
    const c = Math.random().toString(36).slice(2,8).toUpperCase()
    setCode(c); setMode('hosting'); setStatus('Ожидание соперника…')
    const ch = sb.channel(`room-${c}`, {config:{broadcast:{self:false}}})
    chRef.current = ch
    ch.on('broadcast', {event:'guest-join'}, ({payload}) => {
      setStatus('Соперник подключился!')
      setTimeout(() => {
        ch.send({type:'broadcast', event:'start', payload:{hostName:userRef.current?.name||'Хозяин', hostAvatar:userRef.current?.avatar||null}})
        navigate('game', { mode:'friend', myColor:'w', roomCode:c, oppName:payload.name, oppAvatar:payload.avatar||null })
      }, 800)
    })
    ch.subscribe()
  }

  function joinRoom(c) {
    const roomCode = (c||inputCode).trim().toUpperCase()
    if (roomCode.length !== 6) return
    setMode('joining'); setStatus('Подключаемся…')
    const ch = sb.channel(`room-${roomCode}`, {config:{broadcast:{self:false}}})
    chRef.current = ch
    ch.on('broadcast', {event:'start'}, ({payload}) => {
      setTimeout(() => navigate('game', { mode:'friend', myColor:'b', roomCode, oppName:payload.hostName, oppAvatar:payload.hostAvatar||null }), 400)
    })
    ch.subscribe(s => {
      if (s==='SUBSCRIBED') {
        ch.send({type:'broadcast', event:'guest-join', payload:{name:userRef.current?.name||'Гость', avatar:userRef.current?.avatar||null}})
        setStatus('Ожидание подтверждения…')
      }
    })
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <button className="btn-border" onClick={() => navigate('play')}>‹ Назад</button>
        <h1 className="lobby-title">Игра с другом</h1>
      </div>

      <div className="lobby-body">
        {!mode && (
          <>
            <div className="lobby-section">
              <h3>Создать комнату</h3>
              <p>Сгенерируй код и поделись ссылкой с другом. Он подключится автоматически.</p>
              <button className="btn-primary btn-full" onClick={createRoom}>Создать комнату</button>
            </div>
            <div className="divider-or">— или —</div>
            <div className="lobby-section">
              <h3>Войти по коду</h3>
              <p>Введи 6-буквенный код, который дал тебе друг.</p>
              <div className="lobby-join-row">
                <input className="lobby-input" placeholder="XXXXXX" maxLength={6}
                  value={inputCode} onChange={e=>setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={e=>e.key==='Enter'&&joinRoom()}/>
                <button className="btn-primary" onClick={() => joinRoom()}>Войти →</button>
              </div>
            </div>
          </>
        )}

        {mode==='hosting' && (
          <div className="lobby-section">
            <h3>Комната создана</h3>
            <p>Отправь другу этот код или ссылку:</p>
            <div className="lobby-code">{code}</div>
            <button className="btn-ghost btn-full" style={{marginBottom:12}} onClick={copyCode}>
              {copied ? '✓ Скопировано!' : 'Скопировать код'}
            </button>
            <div className="lobby-status">
              <div className="think-dots"><div className="think-dot"/><div className="think-dot"/><div className="think-dot"/></div>
              {status}
            </div>
          </div>
        )}

        {mode==='joining' && (
          <div className="lobby-section">
            <div className="lobby-status">
              <div className="think-dots"><div className="think-dot"/><div className="think-dot"/><div className="think-dot"/></div>
              {status}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
