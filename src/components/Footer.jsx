export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-brand">Дубовая Доска · Русские шашки</span>
        <span>© {new Date().getFullYear()} · Сделано с любовью к классике</span>
      </div>
    </footer>
  )
}
