import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Collapse, Offcanvas } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { MENU } from '../../routes/rotas'
import { iniciais } from '../../utils/formatters'
import Logo from '../../components/Logo/Logo'
import './Sidebar.css'

// No desktop (lg+) fica fixo na lateral; no celular vira uma gaveta (REQ032)
export default function Sidebar({ aberto, aoFechar }) {
  const { usuario, podeAcessar, logout } = useAuth()
  const { pathname } = useLocation()

  // Só mostra o que o usuário pode acessar; grupo sem nenhum item liberado some
  const menu = MENU.map((item) =>
    item.itens ? { ...item, itens: item.itens.filter((sub) => podeAcessar(sub.tela)) } : item,
  ).filter((item) => (item.itens ? item.itens.length > 0 : podeAcessar(item.tela)))

  // Começa com o grupo da tela atual aberto
  const [gruposAbertos, setGruposAbertos] = useState(() =>
    menu.filter((g) => g.itens?.some((sub) => pathname.startsWith(sub.path))).map((g) => g.label),
  )

  const alternarGrupo = (label) =>
    setGruposAbertos((atual) =>
      atual.includes(label) ? atual.filter((l) => l !== label) : [...atual, label],
    )

  const link = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      end
      className={({ isActive }) =>
        `spv-nav-link${isActive || item.ativoEm?.test(pathname) ? ' active' : ''}`
      }
      onClick={aoFechar}
    >
      <i className={`bi ${item.icone}`} aria-hidden="true"></i>
      {item.label}
    </NavLink>
  )

  return (
    <Offcanvas show={aberto} onHide={aoFechar} responsive="lg" className="spv-sidebar">
      <Offcanvas.Body>
        <div className="spv-brand">
          <Logo />
          <div>
            <div className="spv-brand-name">SYS VENDAS</div>
            <div className="spv-brand-sub">Sistema de Pedidos</div>
          </div>
          <button
            type="button"
            className="btn-close ms-auto d-lg-none"
            aria-label="Fechar menu"
            onClick={aoFechar}
          ></button>
        </div>

        <nav className="spv-nav" aria-label="Menu principal">
          {menu.map((item) => {
            if (!item.itens) return link(item)

            const aberto = gruposAbertos.includes(item.label)
            const idSub = `menu-${item.label}`
            return (
              <div key={item.label}>
                <button
                  type="button"
                  className="spv-nav-group"
                  aria-expanded={aberto}
                  aria-controls={idSub}
                  onClick={() => alternarGrupo(item.label)}
                >
                  <i className={`bi ${item.icone}`} aria-hidden="true"></i>
                  {item.label}
                  <i className="bi bi-chevron-down spv-chevron" aria-hidden="true"></i>
                </button>
                <Collapse in={aberto}>
                  <div id={idSub}>
                    <div className="spv-nav-sub">{item.itens.map(link)}</div>
                  </div>
                </Collapse>
              </div>
            )
          })}
        </nav>

        <div className="spv-user">
          <NavLink
            to="/meu-usuario"
            className="spv-user-link"
            title="Meu usuário: dados e senha"
            onClick={aoFechar}
          >
            <div className="spv-avatar">{iniciais(usuario.nome)}</div>
            <div className="lh-sm" style={{ minWidth: 0 }}>
              <div className="fw-semibold small text-truncate">{usuario.nome}</div>
              <div className="text-secondary text-truncate" style={{ fontSize: '0.75rem' }}>
                {usuario.perfilNome}
              </div>
            </div>
          </NavLink>
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary ms-auto"
            title="Sair"
            aria-label="Sair do sistema"
            onClick={() => logout('', true)}
          >
            <i className="bi bi-box-arrow-right fs-5"></i>
          </button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
