import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import SeletorCliente from './components/SeletorCliente/SeletorCliente'
import FiltroPedidos from './components/FiltroPedidos/FiltroPedidos'
import PedidosTabela from './components/PedidosTabela/PedidosTabela'
import ResumoCliente from './components/ResumoCliente/ResumoCliente'
import AvisoCliente from '../../components/AvisoCliente/AvisoCliente'
import { usePedidos } from './usePedidos'
import { filtrarPedidos } from './filtros'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { exportarPedidos } from './exportarPedidos'
import { useCarregar } from '../../hooks/useCarregar'
import { listarClientes } from '../../services/clientesService'
import { formatarDocumento, formatarTelefone } from '../../utils/formatters'

/*
 * SPV-59 — receber, consultar e editar pedidos por cliente.
 * Escolhe um cliente e vê o histórico dele: resumo (em aberto, total comprado...),
 * a lista de pedidos (clique abre o pedido para editar) e o atalho para um novo pedido já com
 * esse cliente. O cliente escolhido fica na URL (?id=3), então dá para voltar e compartilhar o link.
 */
export default function PedidosPorClientePage() {
  const [params, setParams] = useSearchParams()
  const idCliente = params.get('id') ?? ''

  const pedidosCarga = usePedidos()
  const clientesCarga = useCarregar(listarClientes, [])
  const [filtro, setFiltro] = useState({ busca: '', status: '' })

  const carregando = pedidosCarga.carregando || clientesCarga.carregando
  const erro = pedidosCarga.erro || clientesCarga.erro
  const clientes = clientesCarga.dados ?? []
  const cliente = clientes.find((c) => c.id === Number(idCliente))
  const doCliente = (pedidosCarga.dados ?? []).filter((p) => p.idCliente === Number(idCliente))
  const visiveis = filtrarPedidos(doCliente, filtro)

  const escolherCliente = (id) => {
    setFiltro({ busca: '', status: '' })
    setParams(id ? { id } : {}, { replace: true })
  }

  return (
    <>
      <PageHeader
        titulo="Pedidos por cliente"
        subtitulo="Histórico, valores em aberto e novos pedidos de um cliente"
      >
        {cliente && (
          <BotaoExportar
            quantidade={visiveis.length}
            aoExportar={() => exportarPedidos(visiveis, `pedidos-cliente-${cliente.id}`)}
          />
        )}
        {cliente?.ativo && (
          <Link to={`/pedidos/novo?cliente=${cliente.id}`} className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
            Novo pedido para este cliente
          </Link>
        )}
      </PageHeader>

      {erro && (
        <AlertaErro
          mensagem={erro}
          aoTentarNovamente={() => {
            pedidosCarga.recarregar()
            clientesCarga.recarregar()
          }}
        />
      )}

      <section className="spv-card mb-3">
        <div className="spv-card-body">
          <div className="row g-3 align-items-start">
            <div className="col-lg-5">
              <label className="form-label" htmlFor="cliente">
                Cliente
              </label>
              {clientesCarga.carregando ? (
                <Carregando texto="Carregando clientes..." />
              ) : (
                <SeletorCliente
                  clientes={clientes}
                  valor={idCliente}
                  aoMudar={escolherCliente}
                  somenteAtivos={false}
                />
              )}
            </div>
            {cliente && (
              <div className="col-lg-7">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span className="fs-5 fw-bold">{cliente.nome}</span>
                  {cliente.tipo && (
                    <span className="badge rounded-pill text-bg-light border">
                      {cliente.tipo === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física'}
                    </span>
                  )}
                  {!cliente.ativo && (
                    <span className="badge rounded-pill text-bg-secondary">Inativo</span>
                  )}
                </div>
                <div className="small text-secondary">
                  {[
                    cliente.nomeFantasia,
                    cliente.documento &&
                      `${cliente.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${formatarDocumento(cliente.documento)}`,
                    formatarTelefone(cliente.telefone),
                    cliente.email,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                {!cliente.ativo && (
                  <div className="small text-secondary mt-1">
                    Cliente inativo: dá para consultar o histórico, mas não para abrir pedido novo.
                  </div>
                )}
                <AvisoCliente cliente={cliente} className="mt-2" />
              </div>
            )}
          </div>
        </div>
      </section>

      {!idCliente ? (
        <div className="spv-card">
          <EstadoVazio icone="bi-person-lines-fill" titulo="Escolha um cliente">
            Selecione o cliente acima para ver os pedidos dele.
          </EstadoVazio>
        </div>
      ) : carregando ? (
        <Carregando texto="Carregando pedidos..." />
      ) : !cliente ? (
        <div className="spv-card">
          <EstadoVazio icone="bi-person-x" titulo="Cliente não encontrado." />
        </div>
      ) : (
        <>
          <ResumoCliente pedidos={doCliente} />

          <div className="spv-card">
            <div className="spv-card-body border-bottom">
              <FiltroPedidos
                busca={filtro.busca}
                status={filtro.status}
                statusDisponiveis={[1, 2, 3, 4, 5, 6]}
                aoMudar={setFiltro}
              />
            </div>
            <PedidosTabela
              pedidos={visiveis}
              mensagemVazia={
                doCliente.length === 0
                  ? 'Este cliente ainda não tem pedidos.'
                  : 'Nenhum pedido com esse filtro.'
              }
            />
            <div className="px-3 py-2 small text-secondary border-top">
              {visiveis.length} de {doCliente.length} pedido(s) deste cliente · clique no pedido
              para abrir e editar
            </div>
          </div>
        </>
      )}
    </>
  )
}
