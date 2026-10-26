import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import StatusBadge from '../../components/StatusBadge/StatusBadge'
import PrazoPedido from '../pedidos/components/PrazoPedido/PrazoPedido'
import ConcluirApontamentoModal from './ConcluirApontamentoModal'
import ExportarProducaoModal from './ExportarProducaoModal'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import { listarPedidos, alterarStatusPedido } from '../../services/pedidosService'
import { listarClientes } from '../../services/clientesService'
import { mensagemDeErro } from '../../services/api'
import { listarConferencias } from '../../services/conferenciaService'
import {
  cancelarApontamento,
  concluirApontamento,
  iniciarApontamento,
  listarApontamentosEmAndamento,
  minutosEntre,
} from '../../services/producaoService'
import { TELAS } from '../../utils/constants'
import { formatarDataHora, formatarDia, formatarDuracao } from '../../utils/formatters'
import './ProducaoPage.css'

const STATUS_NA_FILA = [1, 2] // Cadastrado e Em produção

// Relógio que atualiza a cada 30 s (tempo decorrido dos apontamentos em andamento)
function useAgora(intervaloMs = 30000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}

/*
 * M.E.S. — Produção (REQ010).
 * SPV-93: o operador inicia o apontamento num pedido da fila.
 * SPV-94/95: conclui informando a quantidade produzida (o tempo é calculado sozinho).
 */
export default function ProducaoPage() {
  const { usuario, podeAcessar } = useAuth()
  const notificar = useNotificacao()
  const agora = useAgora()

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [pedidos, clientes, abertos] = await Promise.all([
      listarPedidos(),
      listarClientes(),
      listarApontamentosEmAndamento(),
    ])
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]))
    const fila = pedidos
      .filter((p) => STATUS_NA_FILA.includes(p.status))
      .map((p) => ({ ...p, cliente: { nome: nomeCliente.get(p.idCliente) ?? '' } }))
      // entrega mais próxima primeiro; sem data vai para o fim
      .sort((a, b) =>
        String(a.dataEntregaPrevista ?? '9999').localeCompare(
          String(b.dataEntregaPrevista ?? '9999'),
        ),
      )
    // SPV-96: pedido devolvido pela conferência mostra o motivo para o operador
    const conferencias = await Promise.all(
      fila.map((p) => (p.status === 2 ? listarConferencias(p.id) : Promise.resolve([]))),
    )
    fila.forEach((p, i) => {
      const ultima = conferencias[i].at(-1)
      p.devolucao = ultima?.resultado === 'devolvido' ? ultima.motivo : ''
    })
    return { fila, abertos }
  }, [])

  const [iniciando, setIniciando] = useState(null)
  const [concluindo, setConcluindo] = useState(null)
  const [cancelando, setCancelando] = useState(null)
  const [exportando, setExportando] = useState(false)

  const meus = (dados?.abertos ?? []).filter((a) => a.idOperador === usuario.id)
  const outros = (dados?.abertos ?? []).filter((a) => a.idOperador !== usuario.id)
  const emAndamentoPorPedido = (idPedido) =>
    (dados?.abertos ?? []).filter((a) => a.idPedido === idPedido)
  const podeVerPedido = podeAcessar(TELAS.PEDIDOS)

  const iniciar = async (pedido) => {
    setIniciando(pedido.id)
    try {
      await iniciarApontamento(pedido.id, usuario.id)
      notificar(`Produção do pedido nº ${pedido.id} iniciada.`)
      await recarregar(true)
    } catch (e) {
      notificar(mensagemDeErro(e), 'danger')
    } finally {
      setIniciando(null)
    }
  }

  const concluir = async ({ quantidade, observacao, enviarParaConferencia }) => {
    await concluirApontamento(concluindo.id, { quantidade, observacao })
    let texto = `Apontamento do pedido nº ${concluindo.idPedido} concluído (${quantidade} un.).`
    let tipo = 'success'
    if (enviarParaConferencia) {
      // o apontamento já foi salvo; se o envio falhar, só avisa (dá para enviar pelo pedido depois)
      try {
        await alterarStatusPedido(concluindo.idPedido, 3)
        texto += ' Pedido enviado para conferência.'
      } catch (e) {
        texto += ` Não foi possível enviar para conferência: ${mensagemDeErro(e)}`
        tipo = 'warning'
      }
    }
    notificar(texto, tipo)
    setConcluindo(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Produção"
        subtitulo="Inicie e conclua a produção dos pedidos — o tempo é contado sozinho"
      >
        {/* SPV-103: exportar o M.E.S. — só para quem também acessa Pedidos (gestão), não o operador */}
        {podeVerPedido && (
          <Button variant="outline-success" onClick={() => setExportando(true)}>
            <i className="bi bi-file-earmark-excel me-1" aria-hidden="true"></i>
            Exportar Excel
          </Button>
        )}
        <Button variant="light" className="border" onClick={() => recarregar()}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
          Atualizar
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {carregando ? (
        <Carregando texto="Carregando produção..." />
      ) : (
        dados && (
          <>
            {/* SPV-94: o que EU estou produzindo agora */}
            <section className="spv-card mb-3">
              <div className="spv-card-header">
                <i className="bi bi-person-gear text-secondary" aria-hidden="true"></i>
                <h2>Meus apontamentos em andamento</h2>
                <span className="badge text-bg-light border">{meus.length}</span>
              </div>
              {meus.length === 0 ? (
                <div className="spv-card-body small text-secondary">
                  Você não está produzindo nenhum pedido agora. Escolha um na fila abaixo e clique
                  em <strong>Iniciar</strong>.
                </div>
              ) : (
                <div className="spv-card-body d-flex flex-column gap-2">
                  {meus.map((a) => (
                    <div key={a.id} className="spv-apontamento">
                      <div className="spv-apontamento-tempo" title="Tempo trabalhando">
                        <i className="bi bi-stopwatch" aria-hidden="true"></i>
                        {formatarDuracao(minutosEntre(a.inicio, null, agora))}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold">
                          Pedido nº {a.idPedido} · {a.pedido?.cliente}
                        </div>
                        <div className="small text-secondary text-truncate">
                          Início {formatarDataHora(a.inicio)}
                          {a.pedido?.descricao && ` · ${a.pedido.descricao}`}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="success" onClick={() => setConcluindo(a)}>
                          <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          title="Iniciei por engano"
                          onClick={() => setCancelando(a)}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true"></i>
                          <span className="d-none d-md-inline ms-1">Cancelar início</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {outros.length > 0 && (
              <section className="spv-card mb-3">
                <div className="spv-card-header">
                  <i className="bi bi-people text-secondary" aria-hidden="true"></i>
                  <h2>Outros operadores produzindo agora</h2>
                  <span className="badge text-bg-light border">{outros.length}</span>
                </div>
                <div className="spv-card-body small d-flex flex-column gap-1">
                  {outros.map((a) => (
                    <div key={a.id} className="d-flex flex-wrap gap-2">
                      <span className="fw-semibold">{a.operador}</span>
                      <span>
                        no pedido nº {a.idPedido} ({a.pedido?.cliente})
                      </span>
                      <span className="text-secondary">
                        há {formatarDuracao(minutosEntre(a.inicio, null, agora))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SPV-93: fila de pedidos para produzir */}
            <section className="spv-card">
              <div className="spv-card-header">
                <i className="bi bi-list-task text-secondary" aria-hidden="true"></i>
                <h2>Fila de produção</h2>
                <span className="badge text-bg-light border">{dados.fila.length}</span>
                <span className="small text-secondary ms-auto d-none d-md-inline">
                  Entrega mais próxima primeiro
                </span>
              </div>
              {dados.fila.length === 0 ? (
                <EstadoVazio icone="bi-check2-all" titulo="Nenhum pedido aguardando produção." />
              ) : (
                <div className="table-responsive">
                  <table className="table spv-tabela">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Entrega</th>
                        <th className="d-none d-md-table-cell">Status</th>
                        <th className="d-none d-lg-table-cell">Trabalhando</th>
                        <th className="text-end">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.fila.map((p) => {
                        const trabalhando = emAndamentoPorPedido(p.id)
                        const euJa = trabalhando.some((a) => a.idOperador === usuario.id)
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="fw-semibold">
                                {podeVerPedido ? (
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
                              {p.devolucao && (
                                <div className="small text-danger">
                                  <i
                                    className="bi bi-arrow-counterclockwise me-1"
                                    aria-hidden="true"
                                  ></i>
                                  Devolvido na conferência: {p.devolucao}
                                </div>
                              )}
                            </td>
                            <td className="text-nowrap">
                              <div>{formatarDia(p.dataEntregaPrevista)}</div>
                              <PrazoPedido pedido={p} />
                            </td>
                            <td className="d-none d-md-table-cell">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="d-none d-lg-table-cell small">
                              {trabalhando.length
                                ? trabalhando.map((a) => a.operador).join(', ')
                                : '—'}
                            </td>
                            <td className="text-end">
                              <Button
                                size="sm"
                                disabled={euJa || iniciando === p.id}
                                title={euJa ? 'Você já está produzindo este pedido' : undefined}
                                onClick={() => iniciar(p)}
                              >
                                <i className="bi bi-play-fill me-1" aria-hidden="true"></i>
                                {euJa ? 'Em andamento' : 'Iniciar'}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}

      {exportando && (
        <ExportarProducaoModal
          aoFechar={() => setExportando(false)}
          aoExportar={(qtd) => {
            setExportando(false)
            notificar(`Planilha gerada com ${qtd} apontamento(s).`)
          }}
        />
      )}

      {concluindo && (
        <ConcluirApontamentoModal
          apontamento={concluindo}
          outrosTrabalhando={
            emAndamentoPorPedido(concluindo.idPedido).filter((a) => a.id !== concluindo.id).length
          }
          agora={agora}
          aoConcluir={concluir}
          aoFechar={() => setConcluindo(null)}
        />
      )}

      <ConfirmModal
        aberto={Boolean(cancelando)}
        titulo="Cancelar início da produção"
        textoConfirmar="Cancelar início"
        aoFechar={() => setCancelando(null)}
        aoConfirmar={async () => {
          await cancelarApontamento(cancelando.id)
          notificar(`Início no pedido nº ${cancelando.idPedido} desfeito.`, 'info')
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Use quando clicou em <strong>Iniciar</strong> por engano no pedido nº{' '}
          {cancelando?.idPedido}. O apontamento é apagado e o tempo não é contado.
        </p>
      </ConfirmModal>
    </>
  )
}
