import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Collapse, Offcanvas } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { useAlertasEstoque } from '../../hooks/useAlertasEstoque'
import { useAlertasContasPagar } from '../../hooks/useAlertasContasPagar'
import { MENU } from '../../routes/rotas'
import { TELAS } from '../../utils/constants'
import Logo from '../../components/Logo/Logo'
import './Sidebar.css'

/*
 * Menu lateral (REQ031/REQ032).
 * Desktop (lg+): painel flutuante fixo, que pode ser recolhido para mostrar só os ícones.
 * Celular: vira uma gaveta (Offcanvas).
 * Os dados do usuário e o botão "Sair" ficam na barra superior (Topbar).
 */
export default function Sidebar({ aberto, aoFechar, recolhido, aoAlternarRecolhido, aoExpandir }) {
  const { podeAcessar } = useAuth()
  const { pathname } = useLocation()
  // SPV-108: número de produtos no estoque mínimo ao lado de "Estoque"
  const alertasEstoque = useAlertasEstoque(podeAcessar(TELAS.ESTOQUE), pathname)
  // SPV-98: contas a pagar vencidas ou vencendo em até 3 dias ao lado de "Contas a pagar"
  const alertasPagar = useAlertasContasPagar(podeAcessar(TELAS.CONTAS_PAGAR), pathname)
  const avisos = {
    '/estoque': {
      n: alertasEstoque,
      titulo: 'produto(s) no estoque mínimo ou abaixo',
      cor: 'warning',
    },
    '/financeiro/contas-pagar': {
      n: alertasPagar,
      titulo: 'conta(s) a pagar vencida(s) ou vencendo em até 3 dias',
      cor: 'danger',
    },
  }
  const selo = (aviso) =>
    aviso?.n > 0 && (
      <span
        className={`spv-nav-selo spv-nav-selo-${aviso.cor}`}
        title={`${aviso.n} ${aviso.titulo}`}
      >
        {aviso.n}
      </span>
    )

  // Só mostra o que o usuário pode acessar; grupo sem nenhum item liberado some
  const menu = MENU.map((item) =>
    item.itens ? { ...item, itens: item.itens.filter((sub) => podeAcessar(sub.tela)) } : item,
  ).filter((item) => (item.itens ? item.itens.length > 0 : podeAcessar(item.tela)))

  // Começa com o grupo da tela atual aberto
  const [gruposAbertos, setGruposAbertos] = useState(() =>
    menu.filter((g) => g.itens?.some((sub) => pathname.startsWith(sub.path))).map((g) => g.label),
  )

  const alternarGrupo = (label) => {
    // Menu recolhido: clicar no ícone do grupo abre o menu inteiro já com o grupo aberto
    if (recolhido) {
      aoExpandir()
      setGruposAbertos((atual) => (atual.includes(label) ? atual : [...atual, label]))
      return
    }
    setGruposAbertos((atual) =>
      atual.includes(label) ? atual.filter((l) => l !== label) : [...atual, label],
    )
  }

  const link = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      end
      title={recolhido ? item.label : undefined}
      className={({ isActive }) =>
        `spv-nav-link${isActive || item.ativoEm?.test(pathname) ? ' active' : ''}`
      }
      onClick={aoFechar}
    >
      <i className={`bi ${item.icone}`} aria-hidden="true"></i>
      <span className="spv-nav-texto">{item.label}</span>
      {selo(avisos[item.path])}
    </NavLink>
  )

  return (
    <Offcanvas show={aberto} onHide={aoFechar} responsive="lg" className="spv-sidebar">
      <Offcanvas.Body>
        <div className="spv-brand">
          <span className="spv-brand-logo">
            <Logo tamanho={30} />
          </span>
          <div className="spv-nav-texto">
            <div className="spv-brand-name">SYS VENDAS</div>
            <div className="spv-brand-sub">Pedidos · Produção · Caixa</div>
          </div>
          <button
            type="button"
            className="btn-close ms-auto d-lg-none"
            aria-label="Fechar menu"
            onClick={aoFechar}
          ></button>
        </div>

        <nav className="spv-nav" aria-label="Menu principal">
          <div className="spv-nav-titulo spv-nav-texto">Menu</div>
          {menu.map((item) => {
            if (!item.itens) return link(item)

            const grupoAberto = !recolhido && gruposAbertos.includes(item.label)
            const grupoAtivo = item.itens.some(
              (sub) => pathname === sub.path || sub.ativoEm?.test(pathname),
            )
            const idSub = `menu-${item.label}`
            return (
              <div key={item.label}>
                <button
                  type="button"
                  className={`spv-nav-group${grupoAtivo ? ' tem-ativo' : ''}`}
                  aria-expanded={grupoAberto}
                  aria-controls={idSub}
                  title={recolhido ? item.label : undefined}
                  onClick={() => alternarGrupo(item.label)}
                >
                  <i className={`bi ${item.icone}`} aria-hidden="true"></i>
                  <span className="spv-nav-texto">{item.label}</span>
                  {/* grupo fechado: mostra o aviso dos itens de dentro */}
                  {!grupoAberto &&
                    item.itens.map((sub) => <span key={sub.path}>{selo(avisos[sub.path])}</span>)}
                  <i className="bi bi-chevron-down spv-chevron" aria-hidden="true"></i>
                </button>
                <Collapse in={grupoAberto}>
                  <div id={idSub}>
                    <div className="spv-nav-sub">{item.itens.map(link)}</div>
                  </div>
                </Collapse>
              </div>
            )
          })}
        </nav>

        <div className="spv-sidebar-rodape d-none d-lg-block">
          <button
            type="button"
            className="spv-nav-link spv-recolher"
            onClick={aoAlternarRecolhido}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          >
            <i
              className={`bi ${recolhido ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`}
              aria-hidden="true"
            ></i>
            <span className="spv-nav-texto">Recolher menu</span>
          </button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
