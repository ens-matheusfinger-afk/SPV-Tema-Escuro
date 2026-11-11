import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { Dropdown } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { ROTAS } from '../../routes/rotas'
import { iniciais } from '../../utils/formatters'
import './Topbar.css'

// Data por extenso para o canto da barra, ex.: "terça, 3 de nov."
const formatoData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

/*
 * Barra superior (visual v2): trilha de navegação à esquerda,
 * data e menu do usuário (Meu usuário / Sair) à direita.
 */
export default function Topbar({ aoAbrirMenu }) {
  const { pathname } = useLocation()
  const { usuario, logout } = useAuth()
  const atual = ROTAS.find((rota) => matchPath({ path: rota.path, end: true }, pathname))

  return (
    <header className="spv-topbar">
      <button
        type="button"
        className="btn spv-topbar-icone d-lg-none"
        aria-label="Abrir menu"
        onClick={aoAbrirMenu}
      >
        <i className="bi bi-list"></i>
      </button>

      <nav className="spv-breadcrumb" aria-label="Você está em">
        {atual?.grupo && (
          <>
            <span className="spv-breadcrumb-grupo">{atual.grupo}</span>
            <i className="bi bi-chevron-right" aria-hidden="true"></i>
          </>
        )}
        <strong>{atual?.label ?? 'SYS VENDAS'}</strong>
      </nav>

      <div className="spv-topbar-direita">
        <span className="spv-topbar-data d-none d-md-inline-flex">
          <i className="bi bi-calendar3" aria-hidden="true"></i>
          {formatoData.format(new Date())}
        </span>

        <Dropdown align="end">
          <Dropdown.Toggle as="button" className="spv-usuario" aria-label="Menu do usuário">
            <span className="spv-avatar">{iniciais(usuario.nome)}</span>
            <span className="spv-usuario-dados d-none d-sm-block">
              <span className="spv-usuario-nome">{usuario.nome}</span>
              <span className="spv-usuario-perfil">{usuario.perfilNome}</span>
            </span>
            <i className="bi bi-chevron-down spv-usuario-seta" aria-hidden="true"></i>
          </Dropdown.Toggle>

          <Dropdown.Menu className="spv-usuario-menu">
            <div className="spv-usuario-menu-topo d-sm-none">
              <div className="fw-semibold">{usuario.nome}</div>
              <div className="small text-secondary">{usuario.perfilNome}</div>
            </div>
            <Dropdown.Item as={NavLink} to="/meu-usuario">
              <i className="bi bi-person-gear me-2" aria-hidden="true"></i>
              Meu usuário
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item as="button" className="text-danger" onClick={() => logout('', true)}>
              <i className="bi bi-box-arrow-right me-2" aria-hidden="true"></i>
              Sair do sistema
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  )
}
