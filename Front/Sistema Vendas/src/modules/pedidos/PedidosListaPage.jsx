import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import FiltroPedidos from './components/FiltroPedidos/FiltroPedidos'
import PedidosTabela from './components/PedidosTabela/PedidosTabela'
import { usePedidos } from './usePedidos'
import { filtrarPedidos } from './filtros'

// Todos os pedidos, de qualquer status (REQ005 / REQ009)
export default function PedidosListaPage() {
  const { dados: pedidos, carregando, erro, recarregar } = usePedidos()
  const [filtro, setFiltro] = useState({ busca: '', status: '' })

  const visiveis = pedidos ? filtrarPedidos(pedidos, filtro) : []

  return (
    <>
      <PageHeader
        titulo="Todos os pedidos"
        subtitulo="Consulte qualquer pedido e abra para gerenciar"
      >
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
