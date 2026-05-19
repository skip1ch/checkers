export const THEMES = [
  {
    id: 'classic', name: 'Классическая', desc: 'Тёплые дубовые тона', price: 0,
    preview: ['#d4a574', '#6b4423'],
    vars: {
      '--board-dark': '#6b4423', '--board-light': '#d4a574', '--board-frame': '#5a3a1e',
      '--piece-w-top': '#fff7ea', '--piece-w-bot': '#d9c2a0',
      '--piece-b-top': '#3a2516', '--piece-b-bot': '#0e0805',
    }
  },
  {
    id: 'night', name: 'Ночная', desc: 'Элегантный тёмный стиль', price: 0,
    preview: ['#334155', '#1e293b'],
    vars: {
      '--board-dark': '#1e293b', '--board-light': '#334155', '--board-frame': '#0f172a',
      '--piece-w-top': '#e2e8f0', '--piece-w-bot': '#94a3b8',
      '--piece-b-top': '#7f1d1d', '--piece-b-bot': '#3b0808',
    }
  },
  {
    id: 'emerald', name: 'Изумруд', desc: 'Свежесть горного леса', price: 0,
    preview: ['#52836a', '#2d5040'],
    vars: {
      '--board-dark': '#2d5040', '--board-light': '#52836a', '--board-frame': '#1a3028',
      '--piece-w-top': '#f0fdf4', '--piece-w-bot': '#a7c8b5',
      '--piece-b-top': '#1a2e20', '--piece-b-bot': '#0a120d',
    }
  },
  {
    id: 'sunset', name: 'Закат', desc: 'Золотой вечерний час', price: 100,
    preview: ['#d4845a', '#a0462a'],
    vars: {
      '--board-dark': '#a0462a', '--board-light': '#d4845a', '--board-frame': '#7a321e',
      '--piece-w-top': '#fff7f0', '--piece-w-bot': '#f5c4a0',
      '--piece-b-top': '#2d1208', '--piece-b-bot': '#100500',
    }
  },
  {
    id: 'ocean', name: 'Океан', desc: 'Синева морских глубин', price: 150,
    preview: ['#4a90d9', '#1e4a8a'],
    vars: {
      '--board-dark': '#1e4a8a', '--board-light': '#4a90d9', '--board-frame': '#122d5a',
      '--piece-w-top': '#f0f8ff', '--piece-w-bot': '#a8d0f0',
      '--piece-b-top': '#0a1f3d', '--piece-b-bot': '#040c1a',
    }
  },
  {
    id: 'sakura', name: 'Сакура', desc: 'Японское весеннее цветение', price: 200,
    preview: ['#e8a4bc', '#c0607a'],
    vars: {
      '--board-dark': '#c0607a', '--board-light': '#e8a4bc', '--board-frame': '#8a3a52',
      '--piece-w-top': '#fff0f5', '--piece-w-bot': '#f5c8d8',
      '--piece-b-top': '#3d0f1e', '--piece-b-bot': '#1a060d',
    }
  },
  {
    id: 'obsidian', name: 'Обсидиан', desc: 'Тёмная роскошь и золото', price: 300,
    preview: ['#3d3d3d', '#1a1a1a'],
    vars: {
      '--board-dark': '#1a1a1a', '--board-light': '#3d3d3d', '--board-frame': '#0a0a0a',
      '--piece-w-top': '#d4af37', '--piece-w-bot': '#8b7215',
      '--piece-b-top': '#505050', '--piece-b-bot': '#1a1a1a',
    }
  },
  {
    id: 'ruby', name: 'Рубин', desc: 'Огонь страсти и мощи', price: 400,
    preview: ['#9b2335', '#5a0d18'],
    vars: {
      '--board-dark': '#5a0d18', '--board-light': '#9b2335', '--board-frame': '#380810',
      '--piece-w-top': '#fff0f2', '--piece-w-bot': '#f5b8c0',
      '--piece-b-top': '#1a1a1a', '--piece-b-bot': '#080808',
    }
  },
]

export const EMOJIS = [
  // Free defaults
  { id: 'shush',  char: '🤫', name: 'Тихо',       price: 0,   req: null },
  { id: 'wait',   char: '⏳', name: 'Жди',        price: 0,   req: null },
  { id: 'cry',    char: '😭', name: 'Плачу',      price: 0,   req: null },
  { id: 'lol',    char: '🤣', name: 'Смеюсь',     price: 0,   req: null },
  { id: 'shake',  char: '🤝', name: 'Рукопожатие',price: 0,   req: null },
  { id: 'clap',   char: '👏', name: 'Аплодисменты',price: 0,  req: null },
  { id: 'think',  char: '🤔', name: 'Думаю',       price: 0,   req: null },
  // Premium paid
  { id: 'devil',  char: '😈', name: 'Дьявол',     price: 100, req: null },
  { id: 'skull',  char: '💀', name: 'Череп',      price: 100, req: null },
  { id: 'cold',   char: '🥶', name: 'Холодно',    price: 150, req: null },
  { id: 'luck',   char: '🍀', name: 'Удача',      price: 150, req: null },
  { id: 'cool',   char: '😎', name: 'Круто',      price: 200, req: null },
  { id: 'clown',  char: '🤡', name: 'Клоун',      price: 200, req: null },
  { id: 'sigh',   char: '😮‍💨', name: 'Выдох',    price: 250, req: null },
  { id: 'salute', char: '🫡', name: 'Честь',      price: 250, req: null },
  { id: 'mind',   char: '🤯', name: 'Взрыв',      price: 300, req: null },
  { id: 'alien',  char: '👽', name: 'Пришелец',   price: 350, req: null },
  { id: 'crown',  char: '👑', name: 'Корона',     price: 400, req: null },
  { id: 'target', char: '🎯', name: 'В яблочко',  price: 400, req: null },
  { id: 'star',   char: '🌟', name: 'Звезда',     price: 500, req: null },
  // Achievement
  { id: 'bolt',   char: '⚡', name: 'Молния',     price: 0,   req: { wins: 5 } },
]

export const GEM_PACKAGES = [
  { id: 'g100', gems: 100, price: 490, label: 'Стартовый' },
  { id: 'g300', gems: 300, price: 1290, label: 'Популярный', badge: 'Выгодно' },
  { id: 'g750', gems: 750, price: 2990, label: 'Большой', badge: '+25% бонус' },
  { id: 'g2000', gems: 2000, price: 6990, label: 'Максимальный', badge: '+60% бонус' },
]

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  localStorage.setItem('theme', themeId)
}

export function getSavedTheme() {
  return localStorage.getItem('theme') || 'classic'
}
