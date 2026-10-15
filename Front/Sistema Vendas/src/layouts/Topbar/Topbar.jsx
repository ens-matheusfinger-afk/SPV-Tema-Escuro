import { matchPath, useLocation } from 'react-router-dom'
import { ROTAS } from '../../routes/rotas'
import './Topbar.css'

export default function Topbar({ aoAbrirMenu }) {
  const { pathname } = useLocation()
  const atual = ROTAS.find((rota) => matchPath({ path: rota.path, end: true }, pathname))

  return (
    <header className="spv-topbar">
      <button
        type="button"
        className="btn btn-light border d-lg-none"
        aria-label="Abrir menu"
        onClick={aoAbrirMenu}
      >
        <i className="bi bi-list"></i>
      </button>

      <div className="spv-breadcrumb">
        {atual?.grupo && <span>{atual.grupo} › </span>}
        <strong>{atual?.label ?? 'SYS VENDAS'}</strong>
      </div>
    </header>
  )
}
