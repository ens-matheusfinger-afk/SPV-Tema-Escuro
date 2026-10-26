import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import ItensEditor from './components/ItensEditor/ItensEditor'
import SeletorCliente from './components/SeletorCliente/SeletorCliente'
import AvisoCliente from '../../components/AvisoCliente/AvisoCliente'
import BloqueioInadimplente from './components/BloqueioInadimplente/BloqueioInadimplente'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import { listarClientes, listarInadimplentes } from '../../services/clientesService'
import { listarCatalogo } from '../../services/catalogoService'
import { criarPedido } from '../../services/pedidosService'
import { ACCEPT, enviarAnexos, validarArquivos } from '../../services/anexosService'
import { mensagemDeErro } from '../../services/api'
import {
  formatarDocumento,
  formatarMoeda,
  formatarTamanho,
  formatarTelefone,
  hojeISO,
} from '../../utils/formatters'
import { dataMaximaEntrega, erroDataEntrega } from '../../utils/validacoes'
import { TELAS } from '../../utils/constants'
import './PedidoNovoPage.css'

const FORM_VAZIO = { idCliente: '', dataEntregaPrevista: '', descricao: '', anexo: '' }

// Tela 3 do protótipo — Cadastro de Pedido (REQ004)
export default function PedidoNovoPage() {
  const { usuario, podeAcessar } = useAuth()
  const notificar = useNotificacao()
  const navigate = useNavigate()
  // SPV-59: "Novo pedido para este cliente" chega aqui com ?cliente=ID
  const [params] = useSearchParams()

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [clientes, catalogo, devedores] = await Promise.all([
      listarClientes(),
      listarCatalogo(),
      listarInadimplentes().catch(() => new Map()), // se falhar, o Back ainda bloqueia ao gerar
    ])
    return { clientes, catalogo, devedores }
  }, [])

  const [form, setForm] = useState(() => ({
    ...FORM_VAZIO,
    idCliente: params.get('cliente') ?? '',
  }))
  const [itens, setItens] = useState([])
  const [arquivos, setArquivos] = useState([]) // SPV-91: enviados depois que o pedido é gerado
  const [erroArquivos, setErroArquivos] = useState('')
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  // SPV-118: liberação de pedido para cliente devendo (vale só para o cliente escolhido)
  const [liberacao, setLiberacao] = useState({ idCliente: null, ativo: false, motivo: '' })

  // SPV-107: avisa antes de fechar/recarregar a aba com um pedido começado e não salvo
  const comecado =
    itens.length > 0 ||
    arquivos.length > 0 ||
    Boolean(form.descricao || form.anexo || form.dataEntregaPrevista)
  useEffect(() => {
    if (!comecado || enviando) return undefined
    const avisar = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [comecado, enviando])

  if (carregando) return <Carregando texto="Carregando clientes e catálogo..." />
  if (erro) return <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />

  const { clientes, catalogo, devedores } = dados
  const cliente = clientes.find((c) => c.id === Number(form.idCliente))
  const devendo = cliente ? devedores.get(cliente.id) : null
  const podeLiberar = podeAcessar(TELAS.CONTAS_RECEBER)
  const liberacaoAtual =
    liberacao.idCliente === cliente?.id
      ? liberacao
      : { idCliente: cliente?.id, ativo: false, motivo: '' }
  const liberado =
    Boolean(devendo) && liberacaoAtual.ativo && liberacaoAtual.motivo.trim().length >= 5
  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
  const hoje = hojeISO()

  // Validações (REQ038 — evitar erro antes de enviar)
  const erroData = erroDataEntrega(form.dataEntregaPrevista, hoje)
  const erros = {
    // cliente precisa existir e estar ativo (o ?cliente= da URL pode apontar para um inativo)
    idCliente: !cliente?.ativo,
    inadimplente: Boolean(devendo) && !liberado,
    itens: itens.length === 0,
    dataEntregaPrevista: Boolean(erroData),
    anexo: Boolean(form.anexo) && !/^https?:\/\/\S+$/i.test(form.anexo.trim()),
  }
  const valido = !Object.values(erros).some(Boolean)

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  // Quanto ainda dá para colocar no pedido, descontando o que já está na lista
  const saldoDisponivel = (idProduto) => {
    const produto = catalogo.produtos.find((p) => p.id === idProduto)
    if (!produto || produto.estoque === null) return null
    const naLista = itens
      .filter((i) => i.tipoItem === 'produto' && i.idProduto === idProduto)
      .reduce((s, i) => s + i.quantidade, 0)
    return produto.estoque - naLista
  }

  // Itens ficam só na tela até clicar em "Gerar pedido"
  const adicionarItem = async (novo) => {
    const chave = `${novo.tipoItem}-${novo.idProduto ?? novo.idServico}`
    const existente = itens.find((i) => i.chave === chave)
    if (existente) {
      // mesmo item de novo: soma na linha que já existe
      setItens(
        itens.map((i) =>
          i.chave === chave ? { ...i, quantidade: i.quantidade + novo.quantidade } : i,
        ),
      )
    } else {
      setItens([...itens, { ...novo, chave }])
    }
  }

  const alterarQuantidade = async (item, quantidade) => {
    if (item.tipoItem === 'produto') {
      const saldo = saldoDisponivel(item.idProduto)
      if (saldo !== null && quantidade - item.quantidade > saldo) {
        throw new Error(
          `Estoque insuficiente para "${item.nome}": no máximo ${item.quantidade + saldo} unidade(s).`,
        )
      }
    }
    setItens(itens.map((i) => (i.chave === item.chave ? { ...i, quantidade } : i)))
  }

  const removerItem = async (item) => setItens(itens.filter((i) => i.chave !== item.chave))

  const limpar = () => {
    setForm(FORM_VAZIO)
    setItens([])
    setArquivos([])
    setErroArquivos('')
    setTentouEnviar(false)
    setErroEnvio('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    setTentouEnviar(true)
    setErroEnvio('')
    if (!valido) return

    setEnviando(true)
    try {
      const id = await criarPedido({
        idCliente: Number(form.idCliente),
        idVendedor: usuario.id,
        descricao: form.descricao,
        dataEntregaPrevista: form.dataEntregaPrevista,
        anexo: form.anexo,
        itens,
        liberacao: liberado
          ? { idUsuario: usuario.id, motivo: liberacaoAtual.motivo.trim() }
          : undefined,
      })
      if (arquivos.length > 0) {
        try {
          await enviarAnexos(id, usuario.id, arquivos)
        } catch (errAnexo) {
          // o pedido já existe: avisa e segue (os arquivos podem ser anexados de novo no detalhe)
          notificar(
            `Pedido nº ${id} gerado, mas os anexos não foram enviados: ${mensagemDeErro(errAnexo)}`,
            'warning',
          )
          navigate(`/pedidos/${id}`)
          return
        }
      }
      notificar(`Pedido nº ${id} gerado com sucesso.`)
      navigate(`/pedidos/${id}`)
    } catch (err) {
      setEnviando(false)
      setErroEnvio(mensagemDeErro(err))
      // o estoque pode ter mudado: atualiza o catálogo sem perder o que foi digitado
      recarregar(true)
    }
  }

  const mostrar = (campo) => tentouEnviar && erros[campo]

  return (
    <Form
      onSubmit={enviar}
      noValidate
      onKeyDown={(e) => {
        // Enter em um campo não gera o pedido sem querer; só o botão "Gerar pedido" envia
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault()
      }}
    >
      <PageHeader
        titulo="Novo pedido"
        subtitulo="Escolha o cliente, adicione os itens e defina a entrega"
      />

      {erroEnvio && (
        <Alert variant="danger" dismissible onClose={() => setErroEnvio('')}>
          {erroEnvio}
        </Alert>
      )}

      <div className="row g-3">
        <div className="col-lg-8 d-flex flex-column gap-3">
          <section className="spv-card">
            <div className="spv-card-header">
              <i className="bi bi-person-vcard text-secondary" aria-hidden="true"></i>
              <h2>Cliente</h2>
            </div>
            <div className="spv-card-body">
              <SeletorCliente
                clientes={clientes}
                valor={form.idCliente}
                devedores={devedores}
                invalido={mostrar('idCliente')}
                aoMudar={(id) => setForm({ ...form, idCliente: id })}
              />
              {cliente && (
                <div className="small text-secondary mt-2 d-flex flex-wrap gap-3">
                  {cliente.documento && (
                    <span>
                      <i className="bi bi-card-text me-1" aria-hidden="true"></i>
                      {formatarDocumento(cliente.documento)}
                    </span>
                  )}
                  {cliente.telefone && (
                    <span>
                      <i className="bi bi-telephone me-1" aria-hidden="true"></i>
                      {formatarTelefone(cliente.telefone)}
                    </span>
                  )}
                  {cliente.email && (
                    <span>
                      <i className="bi bi-envelope me-1" aria-hidden="true"></i>
                      {cliente.email}
                    </span>
                  )}
                </div>
              )}
              {/* SPV-119: confiança baixa ou observação do cliente aparecem aqui */}
              <AvisoCliente cliente={cliente} className="mt-2" />
              <BloqueioInadimplente
                devendo={devendo}
                podeLiberar={podeLiberar}
                liberacao={liberacaoAtual}
                aoMudar={setLiberacao}
                mostrarErro={tentouEnviar}
              />
            </div>
          </section>

          <section className={`spv-card ${mostrar('itens') ? 'border-danger' : ''}`}>
            <div className="spv-card-header">
              <i className="bi bi-basket text-secondary" aria-hidden="true"></i>
              <h2>Itens</h2>
              {mostrar('itens') && (
                <span className="small text-danger ms-auto">Adicione pelo menos um item.</span>
              )}
            </div>
            <ItensEditor
              itens={itens}
              catalogo={catalogo}
              saldoDisponivel={saldoDisponivel}
              aoAdicionar={adicionarItem}
              aoAlterarQuantidade={alterarQuantidade}
              aoRemover={removerItem}
            />
          </section>

          <section className="spv-card">
            <div className="spv-card-header">
              <i className="bi bi-card-checklist text-secondary" aria-hidden="true"></i>
              <h2>Entrega e observações</h2>
            </div>
            <div className="spv-card-body row g-3">
              <Form.Group className="col-sm-5" controlId="dataEntregaPrevista">
                <Form.Label>Entrega prevista</Form.Label>
                <Form.Control
                  type="date"
                  min={hoje}
                  max={dataMaximaEntrega(hoje)}
                  value={form.dataEntregaPrevista}
                  isInvalid={mostrar('dataEntregaPrevista')}
                  onChange={alterar('dataEntregaPrevista')}
                />
                <Form.Control.Feedback type="invalid">{erroData}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="col-sm-7" controlId="anexo">
                <Form.Label>
                  Link externo <span className="text-secondary fw-normal">(opcional)</span>
                </Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={form.anexo}
                  isInvalid={mostrar('anexo')}
                  onChange={alterar('anexo')}
                />
                <Form.Control.Feedback type="invalid">
                  Use um link completo, começando com https://
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="col-12" controlId="descricao">
                <Form.Label>Descrição / observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  maxLength={255}
                  placeholder="Ex.: cores, tamanhos, detalhes da arte..."
                  value={form.descricao}
                  onChange={alterar('descricao')}
                />
                <Form.Text>{form.descricao.length}/255</Form.Text>
              </Form.Group>
              <Form.Group className="col-12" controlId="arquivos">
                <Form.Label>
                  Fotos e arquivos <span className="text-secondary fw-normal">(opcional)</span>
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept={ACCEPT}
                  isInvalid={Boolean(erroArquivos)}
                  onChange={(e) => {
                    const novos = [...arquivos, ...Array.from(e.target.files ?? [])]
                    e.target.value = ''
                    const problema = validarArquivos(novos)
                    setErroArquivos(problema)
                    if (!problema) setArquivos(novos)
                  }}
                />
                <Form.Control.Feedback type="invalid">{erroArquivos}</Form.Control.Feedback>
                <Form.Text>Arte, foto de referência, medidas... (até 10 MB cada)</Form.Text>
                {arquivos.length > 0 && (
                  <ul className="list-unstyled small mt-2 mb-0">
                    {arquivos.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="d-flex align-items-center gap-2">
                        <i className="bi bi-paperclip text-secondary" aria-hidden="true"></i>
                        <span className="text-truncate">{f.name}</span>
                        <span className="text-secondary text-nowrap">
                          {formatarTamanho(f.size)}
                        </span>
                        <Button
                          size="sm"
                          variant="link"
                          className="text-danger p-0 ms-auto"
                          aria-label={`Tirar ${f.name}`}
                          onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true"></i>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Form.Group>
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <aside className="spv-card spv-card-accent spv-resumo">
            <div className="spv-card-header">
              <h2>Resumo</h2>
            </div>
            <div className="spv-card-body">
              <div className="spv-dado-rotulo">Cliente</div>
              <p className={cliente ? 'fw-semibold' : 'text-secondary'}>
                {cliente?.nome ?? 'Não selecionado'}
              </p>
              <div className="spv-dado-rotulo">Itens</div>
              <p>
                {itens.reduce((s, i) => s + i.quantidade, 0)} unidade(s) em {itens.length} item(ns)
              </p>
              <div className="spv-dado-rotulo">Vendedor</div>
              <p>{usuario.nome}</p>
              <div className="spv-dado-rotulo">Total</div>
              <div className="spv-total mb-3">{formatarMoeda(total)}</div>

              {tentouEnviar && !valido && (
                <Alert variant="warning" className="small py-2">
                  {erros.inadimplente && !erros.itens && !erros.dataEntregaPrevista
                    ? 'Cliente com pagamento vencido: o pedido só sai com liberação do financeiro.'
                    : 'Confira os campos destacados em vermelho.'}
                </Alert>
              )}

              <Button type="submit" className="w-100 mb-2" disabled={enviando}>
                {enviando ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Gerando pedido...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2 me-1" aria-hidden="true"></i>
                    Gerar pedido
                  </>
                )}
              </Button>
              <Button variant="light" className="w-100 border" onClick={limpar} disabled={enviando}>
                Limpar
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </Form>
  )
}
