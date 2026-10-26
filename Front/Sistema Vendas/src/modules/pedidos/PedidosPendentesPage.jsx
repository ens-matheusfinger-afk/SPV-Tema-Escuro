import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import FiltroPedidos from './components/FiltroPedidos/FiltroPedidos'
import PedidosTabela from './components/PedidosTabela/PedidosTabela'
import { usePedidos } from './usePedidos'
import { filtrarPedidos, ordenarPedidos, pedidoAtrasado, pedidoVencendo } from './filtros'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { exportarPedidos } from './exportarPedidos'
import { STATUS_ABERTOS, STATUS_PEDIDO } from '../../utils/constants'
import './PedidosPendentesPage.css'

const CORES = {
  secondary: '#94a3b8',
  primary: 'var(--spv-sky)',
  warning: '#f5b400',
  info: 'var(--spv-mint)',
}

// REQ009 — pedidos em aberto, com contadores por etapa (REQ040 — gestão visual)
export default function PedidosPendentesPage() {
  const { dados: todos, carregando, erro, recarregar } = usePedidos()
  const [filtro, setFiltro] = useState({ busca: '', status: '', ordem: 'entrega' })

  const abertos = todos ? todos.filter((p) => STATUS_ABERTOS.includes(p.status)) : []
  const visiveis = ordenarPedidos(filtrarPedidos(abertos, filtro), filtro.ordem)
  const atrasados = abertos.filter(pedidoAtrasado).length
  const vencendo = abertos.filter(pedidoVencendo).length

  const alternarStatus = (status) =>
    setFiltro((f) => ({ ...f, status: f.status === String(status) ? '' : String(status) }))

  return (
    <>
      <PageHeader
        titulo="Pedidos pendentes"
        subtitulo="Pedidos em andamento, do cadastro até a retirada"
      >
        <BotaoExportar
          quantidade={visiveis.length}
          aoExportar={() => exportarPedidos(visiveis, 'pedidos-pendentes')}
        />
        <Link to="/pedidos/novo" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Novo pedido
        </Link>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {todos && (
        <div className="row g-2 g-md-3 mb-3">
          {STATUS_ABERTOS.map((s) => {
            const info = STATUS_PEDIDO[s]
            return (
              <div className="col-6 col-lg" key={s}>
                <button
                  type="button"
                  className={`spv-contador ${filtro.status === String(s) ? 'ativo' : ''}`}
                  style={{ '--cor': CORES[info.cor] }}
                  aria-pressed={filtro.status === String(s)}
                  onClick={() => alternarStatus(s)}
                >
                  <div className="spv-contador-numero">
                    {abertos.filter((p) => p.status === s).length}
                  </div>
                  <div className="spv-contador-rotulo">
                    <i className={`bi ${info.icone} me-1`} aria-hidden="true"></i>
                    {info.nome}
                  </div>
                </button>
              </div>
            )
          })}
          <div className="col-6 col-lg">
            <button
              type="button"
              className={`spv-contador ${filtro.status === 'vencendo' ? 'ativo' : ''}`}
              style={{ '--cor': '#e8590c' }}
              aria-pressed={filtro.status === 'vencendo'}
              onClick={() => alternarStatus('vencendo')}
              title="Vencem hoje, amanhã ou já usaram 75% do prazo"
            >
              <div
                className="spv-contador-numero"
                style={vencendo ? { color: '#c2410c' } : undefined}
              >
                {vencendo}
              </div>
              <div className="spv-contador-rotulo">
                <i className="bi bi-hourglass-split me-1" aria-hidden="true"></i>
                Vencendo
              </div>
            </button>
          </div>
          <div className="col-6 col-lg">
            <button
              type="button"
              className={`spv-contador ${filtro.status === 'atrasados' ? 'ativo' : ''}`}
              style={{ '--cor': 'var(--bs-danger)' }}
              aria-pressed={filtro.status === 'atrasados'}
              onClick={() => alternarStatus('atrasados')}
            >
              <div className={`spv-contador-numero ${atrasados ? 'text-danger' : ''}`}>
                {atrasados}
              </div>
              <div className="spv-contador-rotulo">
                <i className="bi bi-alarm me-1" aria-hidden="true"></i>
                Atrasados
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <FiltroPedidos
            busca={filtro.busca}
            status={filtro.status}
            ordem={filtro.ordem}
            statusDisponiveis={STATUS_ABERTOS}
            aoMudar={setFiltro}
          />
        </div>
        {carregando ? (
          <Carregando texto="Carregando pedidos..." />
        ) : (
          todos && (
            <>
              <PedidosTabela pedidos={visiveis} mensagemVazia="Nenhum pedido pendente." />
              <div className="px-3 py-2 small text-secondary border-top">
                {visiveis.length} de {abertos.length} pedido(s) em aberto
              </div>
            </>
          )
        )}
      </div>
    </>
  )
}
