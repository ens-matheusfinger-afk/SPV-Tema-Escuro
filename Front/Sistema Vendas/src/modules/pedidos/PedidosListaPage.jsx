import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import FiltroPedidos from './components/FiltroPedidos/FiltroPedidos'
import PedidosTabela from './components/PedidosTabela/PedidosTabela'
import { usePedidos } from './usePedidos'
import { filtrarPedidos, ordenarPedidos } from './filtros'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { exportarPedidos } from './exportarPedidos'

// Todos os pedidos, de qualquer status (REQ005 / REQ009)
export default function PedidosListaPage() {
  const { dados: pedidos, carregando, erro, recarregar } = usePedidos()
  const [filtro, setFiltro] = useState({ busca: '', status: '', ordem: 'recentes' })

  const visiveis = pedidos ? ordenarPedidos(filtrarPedidos(pedidos, filtro), filtro.ordem) : []

  return (
    <>
      <PageHeader
        titulo="Todos os pedidos"
        subtitulo="Consulte qualquer pedido e abra para gerenciar"
      >
        <BotaoExportar
          quantidade={visiveis.length}
          aoExportar={() => exportarPedidos(visiveis, 'pedidos')}
        />
        <Link to="/pedidos/novo" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Novo pedido
        </Link>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <FiltroPedidos
            busca={filtro.busca}
            status={filtro.status}
            ordem={filtro.ordem}
            statusDisponiveis={[1, 2, 3, 4, 5, 6]}
            aoMudar={setFiltro}
          />
        </div>
        {carregando ? (
          <Carregando texto="Carregando pedidos..." />
        ) : (
          pedidos && (
            <>
              <PedidosTabela pedidos={visiveis} />
              <div className="px-3 py-2 small text-secondary border-top">
                {visiveis.length} de {pedidos.length} pedido(s)
              </div>
            </>
          )
        )}
      </div>
    </>
  )
}
