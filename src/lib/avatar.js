const COLORS = [
  '#e74c3c','#e67e22','#f39c12','#27ae60',
  '#16a085','#2980b9','#8e44ad','#c0392b',
  '#1abc9c','#e91e63','#ff5722','#00897b',
]

export function nameToColor(name = '') {
  if (!name) return COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function nameToInitial(name = '') {
  if (!name) return '?'
  const first = [...name][0] || '?'
  return first.toUpperCase !== undefined ? first.toUpperCase() : first
}
