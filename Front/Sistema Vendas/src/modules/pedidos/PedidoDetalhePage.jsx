import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Dropdown, Form, Spinner } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import StatusBadge from '../../components/StatusBadge/StatusBadge'
import ItensEditor from './components/ItensEditor/ItensEditor'
import LinhaDoTempo from './components/LinhaDoTempo/LinhaDoTempo'
import ImpressaoPedido from './components/ImpressaoPedido/ImpressaoPedido'
import DescontoPedido from './components/DescontoPedido/DescontoPedido'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import {
  adicionarItem,
  alterarQuantidadeItem,
  aplicarDesconto,
  alterarStatusPedido,
  buscarPedido,
  cancelarPedido,
  editarPedido,
  removerItem,
} from '../../services/pedidosService'
import { listarClientes } from '../../services/clientesService'
import { listarCatalogo } from '../../services/catalogoService'
import { mensagemDeErro } from '../../services/api'
import { ACOES_STATUS, STATUS_ABERTOS, STATUS_EDITAVEL, STATUS_PEDIDO } from '../../utils/constants'
import {
  diaParaInput,
  formatarDataHora,
  formatarDia,
  formatarDocumento,
  formatarTelefone,
  hojeISO,
} from '../../utils/formatters'
import PrazoPedido from './components/PrazoPedido/PrazoPedido'
import AnexosPedido from './components/AnexosPedido/AnexosPedido'
import ProducaoPedido from './components/ProducaoPedido/ProducaoPedido'
import HistoricoConferencias from './components/HistoricoConferencias/HistoricoConferencias'
import ConferirPedidoModal from '../conferencia/ConferirPedidoModal'
import { registrarConferencia } from '../../services/conferenciaService'
import { useAuth } from '../../hooks/useAuth'
import { dataMaximaEntrega, erroDataEntrega } from '../../utils/validacoes'

// Ações que mudam o pedido de forma importante e por isso pedem confirmação (REQ038)
const PEDE_CONFIRMACAO = (de, para) => para === 5 || (de === 3 && para === 2)

// Consulta e gestão de um pedido: status, itens, dados, cancelamento e impressão
export default function PedidoDetalhePage() {
  const { id } = useParams()
  const notificar = useNotificacao()
  const { usuario } = useAuth()

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [pedido, clientes, catalogo] = await Promise.all([
      buscarPedido(id),
      listarClientes(),
      listarCatalogo(),
    ])
    return { pedido, cliente: clientes.find((c) => c.id === pedido.idCliente) ?? null, catalogo }
  }, [id])

  const [confirmacao, setConfirmacao] = useState(null) // { titulo, texto, botao, variante, acao }
  const [mudandoStatus, setMudandoStatus] = useState(false)
  const [erroAcao, setErroAcao] = useState('')
  const [conferindo, setConferindo] = useState(null) // SPV-96: 'aprovado' | 'devolvido'
  const [editando, setEditando] = useState(false)
  const [modoImpressao, setModoImpressao] = useState(null)

  // Abre a janela de impressão depois que a versão impressa foi desenhada
  useEffect(() => {
    if (!modoImpressao) return undefined
    const terminar = () => setModoImpressao(null)
    window.addEventListener('afterprint', terminar, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', terminar)
    }
  }, [modoImpressao])

  if (carregando) return <Carregando texto="Carregando pedido..." />
  if (erro) {
    return (
      <>
        <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />
        <Link to="/pedidos">Voltar para a lista de pedidos</Link>
      </>
    )
  }

  const { pedido, cliente, catalogo } = dados
  const editavel = pedido.status === STATUS_EDITAVEL
  const podeCancelar = STATUS_ABERTOS.includes(pedido.status)
  const itensTela = pedido.itens.map((i) => ({ ...i, chave: i.id }))

  const atualizar = () => recarregar(true)

  const mudarStatus = async (para) => {
    setErroAcao('')
    setMudandoStatus(true)
    try {
      await alterarStatusPedido(pedido.id, para)
      notificar(`Pedido nº ${pedido.id}: ${STATUS_PEDIDO[para].nome}.`)
      await atualizar()
    } catch (e) {
      setErroAcao(mensagemDeErro(e))
    } finally {
      setMudandoStatus(false)
    }
  }

  const clicarAcao = (acao) => {
    // SPV-96: aprovar ou devolver passa pela conferência (fica registrado com motivo)
    if (pedido.status === 3) {
      setConferindo(acao.para === 4 ? 'aprovado' : 'devolvido')
      return
    }
    if (!PEDE_CONFIRMACAO(pedido.status, acao.para)) {
      mudarStatus(acao.para)
      return
    }
    setConfirmacao({
      titulo: acao.rotulo,
      texto:
        acao.para === 5
          ? `Confirma a entrega do pedido nº ${pedido.id} ao cliente? Depois de finalizado ele não pode mais ser alterado.`
          : `O pedido nº ${pedido.id} volta para a produção para correção. Confirma?`,
      botao: acao.rotulo,
      variante: acao.para === 5 ? 'success' : 'primary',
      acao: async () => {
        await alterarStatusPedido(pedido.id, acao.para)
        notificar(`Pedido nº ${pedido.id}: ${STATUS_PEDIDO[acao.para].nome}.`)
        await atualizar()
      },
    })
  }

  const pedirCancelamento = () =>
    setConfirmacao({
      titulo: `Cancelar pedido nº ${pedido.id}`,
      texto:
        'O pedido ficará como cancelado (o histórico é mantido) e os produtos voltam para o estoque. Essa ação não pode ser desfeita.',
      botao: 'Cancelar pedido',
      variante: 'danger',
      acao: async () => {
        await cancelarPedido(pedido.id)
        notificar(`Pedido nº ${pedido.id} cancelado.`, 'warning')
        await atualizar()
      },
    })

  // Itens: aqui cada ação já grava no Back
  const saldoDisponivel = (idProduto) =>
    catalogo.produtos.find((p) => p.id === idProduto)?.estoque ?? null

  const aoAdicionar = async (item) => {
    await adicionarItem(pedido.id, item)
    await atualizar()
  }
  const aoAlterarQuantidade = async (item, quantidade) => {
    const saldo = saldoDisponivel(item.idProduto)
    if (item.tipoItem === 'produto' && saldo !== null && quantidade - item.quantidade > saldo) {
      throw new Error(
        `Estoque insuficiente para "${item.nome}": no máximo ${item.quantidade + saldo} unidade(s).`,
      )
    }
    await alterarQuantidadeItem(pedido.id, item.id, quantidade)
    await atualizar()
  }
  const aoRemover = async (item) => {
    if (pedido.itens.length === 1) {
      throw new Error(
        'O pedido precisa ter pelo menos um item. Para desistir do pedido, use "Cancelar pedido".',
      )
    }
    await removerItem(pedido.id, item.id)
    await atualizar()
  }

  return (
    <>
      <div className="spv-nao-imprimir">
        <PageHeader
          titulo={`Pedido nº ${pedido.id}`}
          subtitulo={`Criado em ${formatarDataHora(pedido.dataCriacao)}${pedido.vendedor ? ` por ${pedido.vendedor}` : ''}`}
        >
          <Link to="/pedidos" className="btn btn-light border">
            <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
            Voltar
          </Link>
          <Dropdown align="end">
            <Dropdown.Toggle variant="outline-primary">
              <i className="bi bi-printer me-1" aria-hidden="true"></i>
              Imprimir
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setModoImpressao('a4')}>
                <i className="bi bi-file-earmark-text me-2" aria-hidden="true"></i>
                Folha A4
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setModoImpressao('etiqueta')}>
                <i className="bi bi-tag me-2" aria-hidden="true"></i>
                Etiqueta (100 x 100 mm)
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </PageHeader>

        {/* SPV-118: pedido aberto com o cliente devendo, liberado pelo financeiro */}
        {pedido.liberacao && (
          <Alert variant="warning" className="small py-2" data-testid="liberacao-pedido">
            <i className="bi bi-unlock me-1" aria-hidden="true"></i>
            Pedido liberado com o cliente devendo, por <strong>{pedido.liberacao.por}</strong>:{' '}
            {pedido.liberacao.motivo}
          </Alert>
        )}

        {erroAcao && (
          <Alert variant="danger" dismissible onClose={() => setErroAcao('')}>
            {erroAcao}
          </Alert>
        )}

        {/* Status e próximos passos */}
        <section className="spv-card mb-3">
          <div className="spv-card-header">
            <h2>Situação</h2>
            <StatusBadge status={pedido.status} />
            <PrazoPedido pedido={pedido} barra={false} />
          </div>
          <div className="spv-card-body">
            <LinhaDoTempo status={pedido.status} />
            {(ACOES_STATUS[pedido.status].length > 0 || podeCancelar) && (
              <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
                {ACOES_STATUS[pedido.status].map((acao) => (
                  <Button
                    key={acao.para}
                    variant={acao.variante}
                    disabled={mudandoStatus}
                    onClick={() => clicarAcao(acao)}
                  >
                    <i className={`bi ${acao.icone} me-1`} aria-hidden="true"></i>
                    {acao.rotulo}
                  </Button>
                ))}
                {mudandoStatus && <Spinner size="sm" className="align-self-center" />}
                {podeCancelar && (
                  <Button
                    variant="outline-danger"
                    className="ms-sm-auto"
                    disabled={mudandoStatus}
                    onClick={pedirCancelamento}
                  >
                    <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
                    Cancelar pedido
                  </Button>
                )}
              </div>
            )}
            {pedido.status === 5 && (
              <p className="small text-secondary mt-3 mb-0">
                Entregue em {formatarDataHora(pedido.dataEntregaRealizada)}.
              </p>
            )}
          </div>
        </section>

        <div className="row g-3">
          <div className="col-lg-8">
            <section className="spv-card h-100">
              <div className="spv-card-header">
                <i className="bi bi-basket text-secondary" aria-hidden="true"></i>
                <h2>Itens</h2>
                {!editavel && pedido.status !== 6 && (
                  <span className="small text-secondary ms-auto">
                    <i className="bi bi-lock me-1" aria-hidden="true"></i>
                    Itens só podem ser alterados enquanto o pedido está "Cadastrado".
                  </span>
                )}
              </div>
              <ItensEditor
                itens={itensTela}
                catalogo={catalogo}
                somenteLeitura={!editavel}
                saldoDisponivel={saldoDisponivel}
                aoAdicionar={aoAdicionar}
                aoAlterarQuantidade={aoAlterarQuantidade}
                aoRemover={aoRemover}
                rotuloTotal={pedido.desconto ? 'Subtotal dos itens' : 'Total dos itens'}
              />
              {/* SPV-73: desconto do pedido (até ser finalizado) */}
              <DescontoPedido
                pedido={pedido}
                podeAlterar={STATUS_ABERTOS.includes(pedido.status) && pedido.subtotal > 0}
                aoSalvar={async (dados) => {
                  await aplicarDesconto(pedido.id, { ...dados, idUsuario: usuario.id })
                  notificar(dados.tipo ? 'Desconto aplicado.' : 'Desconto retirado.')
                  await atualizar()
                }}
              />
            </section>
          </div>

          <div className="col-lg-4 d-flex flex-column gap-3">
            <section className="spv-card">
              <div className="spv-card-header">
                <i className="bi bi-person-vcard text-secondary" aria-hidden="true"></i>
                <h2>Cliente</h2>
              </div>
              <div className="spv-card-body small">
                <div className="fw-semibold fs-6">
                  {cliente?.nome ?? `Cliente ${pedido.idCliente}`}
                </div>
                {cliente?.nomeFantasia && (
                  <div className="text-secondary">{cliente.nomeFantasia}</div>
                )}
                {cliente?.documento && (
                  <div>
                    {cliente.tipo === 'PJ' ? 'CNPJ' : 'CPF'} {formatarDocumento(cliente.documento)}
                  </div>
                )}
                {cliente?.telefone && <div>{formatarTelefone(cliente.telefone)}</div>}
                {cliente?.email && <div>{cliente.email}</div>}
                <Link
                  to={`/pedidos/cliente?id=${pedido.idCliente}`}
                  className="d-inline-block mt-2"
                >
                  <i className="bi bi-person-lines-fill me-1" aria-hidden="true"></i>
                  Ver todos os pedidos deste cliente
                </Link>
              </div>
            </section>

            <section className="spv-card">
              <div className="spv-card-header">
                <i className="bi bi-card-checklist text-secondary" aria-hidden="true"></i>
                <h2>Dados do pedido</h2>
                {editavel && !editando && (
                  <Button
                    size="sm"
                    variant="link"
                    className="ms-auto p-0"
                    onClick={() => setEditando(true)}
                  >
                    <i className="bi bi-pencil me-1" aria-hidden="true"></i>
                    Editar
                  </Button>
                )}
              </div>
              <div className="spv-card-body">
                {editando ? (
                  <EditarDados
                    pedido={pedido}
                    aoCancelar={() => setEditando(false)}
                    aoSalvar={async (valores) => {
                      await editarPedido(pedido.id, valores)
                      notificar('Dados do pedido atualizados.')
                      setEditando(false)
                      await atualizar()
                    }}
                  />
                ) : (
                  <dl className="mb-0 small">
                    <dt className="spv-dado-rotulo">Entrega prevista</dt>
                    <dd>
                      <div>{formatarDia(pedido.dataEntregaPrevista)}</div>
                      <PrazoPedido pedido={pedido} />
                    </dd>
                    <dt className="spv-dado-rotulo">Descrição / observações</dt>
                    <dd style={{ whiteSpace: 'pre-wrap' }}>{pedido.descricao || '—'}</dd>
                    <dt className="spv-dado-rotulo">Link externo</dt>
                    <dd className="mb-0">
                      {pedido.anexo ? (
                        <a href={pedido.anexo} target="_blank" rel="noreferrer">
                          <i className="bi bi-paperclip me-1" aria-hidden="true"></i>
                          Abrir arquivo
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </dl>
                )}
              </div>
            </section>

            <HistoricoConferencias idPedido={pedido.id} atualizarEm={pedido.status} />
            <AnexosPedido idPedido={pedido.id} somenteLeitura={pedido.status === 6} />
            <ProducaoPedido idPedido={pedido.id} atualizarEm={pedido.status} />
          </div>
        </div>
      </div>

      {modoImpressao && <ImpressaoPedido pedido={pedido} cliente={cliente} modo={modoImpressao} />}

      {conferindo && (
        <ConferirPedidoModal
          pedido={pedido}
          cliente={cliente?.nome}
          resultadoInicial={conferindo}
          aoFechar={() => setConferindo(null)}
          aoConfirmar={async ({ resultado, motivo }) => {
            await registrarConferencia(pedido.id, { idUsuario: usuario.id, resultado, motivo })
            notificar(
              resultado === 'aprovado'
                ? `Pedido nº ${pedido.id} aprovado na conferência.`
                : `Pedido nº ${pedido.id} devolvido para retrabalho.`,
              resultado === 'aprovado' ? 'success' : 'warning',
            )
            setConferindo(null)
            await atualizar()
          }}
        />
      )}

      <ConfirmModal
        aberto={Boolean(confirmacao)}
        titulo={confirmacao?.titulo}
        textoConfirmar={confirmacao?.botao}
        variante={confirmacao?.variante}
        aoConfirmar={confirmacao?.acao}
        aoFechar={() => setConfirmacao(null)}
      >
        <p className="mb-0">{confirmacao?.texto}</p>
      </ConfirmModal>
    </>
  )
}

// Formulário de edição dos dados gerais (só enquanto o pedido está "Cadastrado")
function EditarDados({ pedido, aoSalvar, aoCancelar }) {
  const [valores, setValores] = useState({
    dataEntregaPrevista: diaParaInput(pedido.dataEntregaPrevista),
    descricao: pedido.descricao,
    anexo: pedido.anexo,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const hoje = hojeISO()
  const erroData = erroDataEntrega(valores.dataEntregaPrevista, hoje)
  const dataInvalida = Boolean(erroData)
  const anexoInvalido = Boolean(valores.anexo) && !/^https?:\/\/\S+$/i.test(valores.anexo.trim())

  const salvar = async (e) => {
    e.preventDefault()
    if (dataInvalida || anexoInvalido) return
    setSalvando(true)
    setErro('')
    try {
      await aoSalvar(valores)
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Form onSubmit={salvar} noValidate>
      <Form.Group className="mb-2" controlId="editar-data">
        <Form.Label>Entrega prevista</Form.Label>
        <Form.Control
          type="date"
          min={hoje}
          max={dataMaximaEntrega(hoje)}
          value={valores.dataEntregaPrevista}
          isInvalid={dataInvalida}
          onChange={(e) => setValores({ ...valores, dataEntregaPrevista: e.target.value })}
        />
        <Form.Control.Feedback type="invalid">{erroData}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-2" controlId="editar-descricao">
        <Form.Label>Descrição / observações</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          maxLength={255}
          value={valores.descricao}
          onChange={(e) => setValores({ ...valores, descricao: e.target.value })}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="editar-anexo">
        <Form.Label>Anexo (link)</Form.Label>
        <Form.Control
          type="url"
          value={valores.anexo}
          isInvalid={anexoInvalido}
          onChange={(e) => setValores({ ...valores, anexo: e.target.value })}
        />
        <Form.Control.Feedback type="invalid">
          Use um link completo, começando com https://
        </Form.Control.Feedback>
      </Form.Group>
      {erro && (
        <Alert variant="danger" className="small py-2">
          {erro}
        </Alert>
      )}
      <div className="d-flex gap-2">
        <Button type="submit" size="sm" disabled={salvando}>
          {salvando ? <Spinner size="sm" /> : 'Salvar'}
        </Button>
        <Button
          size="sm"
          variant="light"
          className="border"
          onClick={aoCancelar}
          disabled={salvando}
        >
          Cancelar
        </Button>
      </div>
    </Form>
  )
}
