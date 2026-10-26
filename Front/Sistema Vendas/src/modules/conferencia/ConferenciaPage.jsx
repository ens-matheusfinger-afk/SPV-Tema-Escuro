import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Spinner } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import PrazoPedido from '../pedidos/components/PrazoPedido/PrazoPedido'
import ConferirPedidoModal from './ConferirPedidoModal'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import { buscarPedido, listarPedidos } from '../../services/pedidosService'
import { listarClientes } from '../../services/clientesService'
import { listarConferencias, registrarConferencia } from '../../services/conferenciaService'
import { mensagemDeErro } from '../../services/api'
import { TELAS } from '../../utils/constants'
import { formatarDia } from '../../utils/formatters'

const STATUS_AGUARDANDO_CONFERENCIA = 3

/*
 * SPV-96 / SPV-78 — fila da conferência de qualidade.
 * Mostra os pedidos "Aguardando conferência" (entrega mais próxima primeiro). O conferente abre,
 * vê os itens e aprova ou devolve para retrabalho com o motivo. Pedidos que já voltaram uma vez
 * aparecem marcados, com o último motivo, para conferir com mais atenção.
 */
export default function ConferenciaPage() {
  const { usuario, podeAcessar } = useAuth()
  const notificar = useNotificacao()

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [pedidos, clientes] = await Promise.all([
      listarPedidos(STATUS_AGUARDANDO_CONFERENCIA),
      listarClientes(),
    ])
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]))
    const fila = pedidos
      .filter((p) => p.status === STATUS_AGUARDANDO_CONFERENCIA)
      .map((p) => ({ ...p, cliente: { nome: nomeCliente.get(p.idCliente) ?? '' } }))
      .sort((a, b) =>
        String(a.dataEntregaPrevista ?? '9999').localeCompare(
          String(b.dataEntregaPrevista ?? '9999'),
        ),
      )
    // histórico de conferências de cada um (para marcar os que já foram devolvidos)
    const historicos = await Promise.all(fila.map((p) => listarConferencias(p.id)))
    return fila.map((p, i) => {
      const devolucoes = historicos[i].filter((c) => c.resultado === 'devolvido')
      return { ...p, devolucoes: devolucoes.length, ultimoMotivo: devolucoes.at(-1)?.motivo ?? '' }
    })
  }, [])

  const [abrindo, setAbrindo] = useState(null)
  const [conferindo, setConferindo] = useState(null) // pedido completo (com itens)

  const abrir = async (pedido) => {
    setAbrindo(pedido.id)
    try {
      const completo = await buscarPedido(pedido.id)
      setConferindo({ ...completo, clienteNome: pedido.cliente.nome })
    } catch (e) {
      notificar(mensagemDeErro(e), 'danger')
    } finally {
      setAbrindo(null)
    }
  }

  return (
    <>
      <PageHeader
        titulo="Conferência"
        subtitulo="Confira cada pedido antes de liberar para o cliente"
      >
        <Button variant="light" className="border" onClick={() => recarregar()}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
          Atualizar
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <section className="spv-card">
        <div className="spv-card-header">
          <i className="bi bi-clipboard-check text-secondary" aria-hidden="true"></i>
          <h2>Aguardando conferência</h2>
          {dados && <span className="badge text-bg-light border">{dados.length}</span>}
        </div>
        {carregando ? (
          <Carregando texto="Carregando pedidos..." />
        ) : !dados?.length ? (
          <EstadoVazio icone="bi-check2-all" titulo="Nenhum pedido aguardando conferência." />
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Entrega</th>
                  <th className="d-none d-md-table-cell">Histórico</th>
                  <th className="text-end">Ação</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="fw-semibold">
                        {podeAcessar(TELAS.PEDIDOS) ? (
                          <Link to={`/pedidos/${p.id}`}>Nº {p.id}</Link>
                        ) : (
                          `Nº ${p.id}`
                        )}{' '}
                        · {p.cliente.nome}
                      </div>
                      {p.descricao && (
                        <div
                          className="small text-secondary text-truncate"
                          style={{ maxWidth: 320 }}
                        >
                          {p.descricao}
                        </div>
                      )}
                    </td>
                    <td className="text-nowrap">
                      <div>{formatarDia(p.dataEntregaPrevista)}</div>
                      <PrazoPedido pedido={p} />
                    </td>
                    <td className="d-none d-md-table-cell small">
                      {p.devolucoes > 0 ? (
                        <>
                          <span className="badge text-bg-danger bg-opacity-75">
                            Devolvido {p.devolucoes}x
                          </span>
                          <div className="text-danger mt-1">Último motivo: {p.ultimoMotivo}</div>
                        </>
                      ) : (
                        <span className="text-secondary">Primeira conferência</span>
                      )}
                    </td>
                    <td className="text-end">
                      <Button size="sm" disabled={abrindo === p.id} onClick={() => abrir(p)}>
                        {abrindo === p.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <i className="bi bi-search me-1" aria-hidden="true"></i>Conferir
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {conferindo && (
        <ConferirPedidoModal
          pedido={conferindo}
          cliente={conferindo.clienteNome}
          aoFechar={() => setConferindo(null)}
          aoConfirmar={async ({ resultado, motivo }) => {
            await registrarConferencia(conferindo.id, { idUsuario: usuario.id, resultado, motivo })
            notificar(
              resultado === 'aprovado'
                ? `Pedido nº ${conferindo.id} aprovado: aguardando o cliente.`
                : `Pedido nº ${conferindo.id} devolvido para retrabalho.`,
              resultado === 'aprovado' ? 'success' : 'warning',
            )
            setConferindo(null)
            await recarregar(true)
          }}
        />
      )}
    </>
  )
}
