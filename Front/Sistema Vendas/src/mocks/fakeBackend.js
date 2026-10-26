import { AxiosError } from 'axios'
import { obterBanco, persistir, proximoId } from './bancoMock'
import {
  cnpjValido,
  cpfValido,
  emailValido,
  somenteDigitos,
  telefoneValido,
  valorMonetarioValido,
} from '../utils/validacoes'

/*
 * Back falso para o modo de teste.
 * Responde às MESMAS rotas e com o MESMO formato de JSON do Back real (Express + Sequelize),
 * então os services e as telas não sabem se estão falando com o mock ou com o servidor.
 *
 * Se mudar uma rota no Back, mude aqui também (e vice-versa).
 */

const STATUS_CANCELADO = 6
const STATUS_FINALIZADO = 5
const ATRASO_MS = 150

class ErroHttp extends Error {
  constructor(status, corpo) {
    super(corpo.erro || 'Erro')
    this.status = status
    this.corpo = corpo
  }
}

const falhar = (status, erro, extra = {}) => {
  throw new ErroHttp(status, { erro, ...extra })
}

const copia = (obj) => JSON.parse(JSON.stringify(obj))
const semSenha = (usuario) => {
  const copiaUsuario = { ...usuario }
  delete copiaUsuario.senha
  return copiaUsuario
}

// ---------- helpers que imitam os "include" do Sequelize ----------

function usuarioComTelas(db, usuario) {
  return {
    ...semSenha(usuario),
    UsuarioTelas: db.usuarioTela.filter((t) => t.idUsuario === usuario.id),
  }
}

function clienteCompleto(db, cliente) {
  return {
    ...cliente,
    ClienteCPF: db.clientesCpf.find((c) => c.idCliente === cliente.id) ?? null,
    ClienteCNPJ: db.clientesCnpj.find((c) => c.idCliente === cliente.id) ?? null,
  }
}

// POST/PUT /clientes — mesmas regras do clientesControllers.js do Back
function salvarCliente(db, id, body) {
  const parcial = id !== null
  const tem = (campo) => !parcial || campo in body
  const atual = parcial ? db.clientes.find((c) => c.id === id) : null
  if (parcial && !atual) falhar(404, 'Cliente não encontrado.')
  const dados = {}
  if (tem('nome')) {
    const nome = String(body.nome ?? '').trim()
    if (nome.length < 2) falhar(400, 'Informe o nome do cliente (pelo menos 2 letras).')
    dados.nome = nome
  }
  if (tem('telefone')) {
    if (!telefoneValido(body.telefone)) {
      falhar(400, 'Telefone inválido: use DDD + número (10 ou 11 dígitos).')
    }
    dados.telefone = somenteDigitos(body.telefone) || null
  }
  if (tem('email')) {
    if (!emailValido(body.email)) falhar(400, 'E-mail inválido.')
    dados.email =
      String(body.email ?? '')
        .trim()
        .toLowerCase() || null
  }
  if (body.status !== undefined) dados.status = Boolean(body.status)
  if (tem('observacao')) dados.observacao = String(body.observacao ?? '').trim() || null
  if (body.fatorConfianca !== undefined) {
    const fator = Number(body.fatorConfianca)
    if (!Number.isInteger(fator) || fator < 1 || fator > 5) {
      falhar(400, 'O fator de confiança vai de 1 (baixa) a 5 (alta).')
    }
    dados.fatorConfianca = fator
  }
  const final = { ...atual, ...dados }
  if (!final.telefone && !final.email)
    falhar(400, 'Informe ao menos um contato: telefone ou e-mail.')

  let doc = null
  if (body.tipo !== undefined) {
    const numero = somenteDigitos(body.documento)
    if (body.tipo === 'PF' && !cpfValido(numero))
      falhar(400, 'CPF inválido. Confira os números digitados.')
    if (body.tipo === 'PJ' && !cnpjValido(numero))
      falhar(400, 'CNPJ inválido. Confira os números digitados.')
    if (!['PF', 'PJ'].includes(body.tipo)) falhar(400, 'Tipo de cliente inválido: use PF ou PJ.')
    const lista = body.tipo === 'PF' ? db.clientesCpf : db.clientesCnpj
    const campo = body.tipo === 'PF' ? 'cpf' : 'cnpj'
    const dono = lista.find((x) => x[campo] === numero && x.idCliente !== id)
    if (dono) {
      const nome = db.clientes.find((c) => c.id === dono.idCliente)?.nome
      falhar(
        409,
        `Este ${campo.toUpperCase()} já está cadastrado para o cliente "${nome}" (nº ${dono.idCliente}).`,
      )
    }
    doc = { tipo: body.tipo, numero, nomeFantasia: String(body.nomeFantasia ?? '').trim() || null }
  }

  let cliente = atual
  if (!cliente) {
    cliente = {
      id: proximoId('clientes'),
      status: true,
      fatorConfianca: 3,
      observacao: null,
      ...dados,
    }
    db.clientes.push(cliente)
  } else Object.assign(cliente, dados)

  if (doc) {
    db.clientesCpf = db.clientesCpf.filter((x) => x.idCliente !== cliente.id)
    db.clientesCnpj = db.clientesCnpj.filter((x) => x.idCliente !== cliente.id)
    if (doc.tipo === 'PF') {
      db.clientesCpf.push({ id: proximoId('clientesCpf'), idCliente: cliente.id, cpf: doc.numero })
    } else {
      db.clientesCnpj.push({
        id: proximoId('clientesCnpj'),
        idCliente: cliente.id,
        cnpj: doc.numero,
        nomeFantasia: doc.nomeFantasia,
      })
    }
  }
  return clienteCompleto(db, cliente)
}

// ---------- financeiro (SPV-85/86) — mesmas regras de contasPagar/ReceberControllers.js ----------

const hojeLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const diaValido = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t ?? ''))
const centavos = (v) => Math.round(Number(v) * 100)
const FORMAS_PAGAR = ['dinheiro', 'pix', 'cartao', 'boleto', 'transferencia']
const FORMAS_RECEBER = ['dinheiro', 'pix', 'cartao']

// Igual à trigger trg_pedidos_conta_receber: uma conta em aberto por pedido = total - já recebido
function sincronizarContasPedidos(db) {
  const contas = tabela(db, 'contasReceber')
  for (const p of db.pedidos) {
    const doPedido = contas.filter((c) => c.idPedido === p.id)
    if (!(p.status >= 1 && p.status <= 4) && doPedido.length === 0) continue
    const recebido = doPedido
      .filter((c) => c.dataRecebimento)
      .reduce((s, c) => s + centavos(c.total), 0)
    const restante = (centavos(p.total) - recebido) / 100
    const abertas = doPedido.filter((c) => !c.dataRecebimento).sort((a, b) => a.id - b.id)
    const manter = p.status !== STATUS_CANCELADO && restante > 0 ? abertas[0] : null
    db.contasReceber = tabela(db, 'contasReceber').filter(
      (c) => !abertas.includes(c) || c === manter,
    )
    if (p.status === STATUS_CANCELADO || restante <= 0) continue
    const dados = {
      total: restante.toFixed(2),
      dataPrevisao: p.dataEntregaPrevista ? String(p.dataEntregaPrevista).slice(0, 10) : null,
      idCliente: p.idCliente,
    }
    if (manter) Object.assign(manter, dados)
    else {
      db.contasReceber.push({
        id: proximo(db.contasReceber),
        idPedido: p.id,
        descricao: `Pedido nº ${p.id}`,
        dataRecebimento: null,
        formaPagamento: null,
        dataCriacao: hojeLocal(),
        ...dados,
      })
    }
  }
}

function contaReceberCompleta(db, c) {
  const p = c.idPedido ? db.pedidos.find((x) => x.id === c.idPedido) : null
  const cli = db.clientes.find((x) => x.id === c.idCliente)
  return {
    ...c,
    pedido: p
      ? {
          id: p.id,
          descricao: p.descricao,
          status: p.status,
          dataEntregaPrevista: p.dataEntregaPrevista,
        }
      : null,
    cliente: cli
      ? {
          id: cli.id,
          nome: cli.nome,
          telefone: cli.telefone,
          fatorConfianca: cli.fatorConfianca ?? 3,
        }
      : null,
  }
}

function lerContaPagar(body, parcial) {
  const tem = (campo) => !parcial || campo in body
  const dados = {}
  if (tem('descricao')) {
    if (String(body.descricao ?? '').trim().length < 2) falhar(400, 'Informe a descrição da conta.')
    dados.descricao = body.descricao.trim()
  }
  if (tem('tipo')) {
    if (!String(body.tipo ?? '').trim())
      falhar(400, 'Informe a categoria da conta (ex.: Aluguel, Matéria-prima).')
    dados.tipo = body.tipo.trim()
  }
  if (tem('fornecedor')) dados.fornecedor = String(body.fornecedor ?? '').trim() || null
  if (tem('valor')) {
    if (!valorMonetarioValido(body.valor))
      falhar(400, 'Informe um valor maior que zero, com até 2 casas decimais.')
    dados.valor = Number(body.valor).toFixed(2)
  }
  if (tem('dataVencimento')) {
    if (!diaValido(body.dataVencimento)) falhar(400, 'Informe a data de vencimento.')
    dados.dataVencimento = body.dataVencimento
  }
  return dados
}

function lerContaReceber(db, body, parcial) {
  const tem = (campo) => !parcial || campo in body
  const dados = {}
  if (tem('idCliente')) {
    if (!db.clientes.some((c) => c.id === Number(body.idCliente))) falhar(400, 'Escolha o cliente.')
    dados.idCliente = Number(body.idCliente)
  }
  if (tem('descricao')) {
    if (String(body.descricao ?? '').trim().length < 2) falhar(400, 'Informe a descrição da conta.')
    dados.descricao = body.descricao.trim()
  }
  if (tem('total')) {
    if (!valorMonetarioValido(body.total))
      falhar(400, 'Informe um valor maior que zero, com até 2 casas decimais.')
    dados.total = Number(body.total).toFixed(2)
  }
  if (tem('dataPrevisao')) {
    if (!diaValido(body.dataPrevisao)) falhar(400, 'Informe a data de vencimento.')
    dados.dataPrevisao = body.dataPrevisao
  }
  return dados
}

const contaOuFalha = (lista, id, nome) => {
  const conta = lista.find((c) => c.id === Number(id))
  if (!conta) falhar(404, `${nome} não encontrada.`)
  return conta
}

function dataDaBaixa(body, campo) {
  const data = body[campo] || hojeLocal()
  if (!diaValido(data)) falhar(400, 'Data inválida.')
  if (data > hojeLocal())
    falhar(
      400,
      `A data de ${campo === 'dataPagamento' ? 'pagamento' : 'recebimento'} não pode ser no futuro.`,
    )
  return data
}

// ---------- caixa (SPV-84/97) e inadimplência (SPV-118) — mesmas regras de utils/caixa.js e utils/inadimplencia.js ----------

const fmtDia = (dia) => dia.split('-').reverse().join('/')

function caixaAbertoOuFalha(db, dia) {
  if (tabela(db, 'fechamentosCaixa').some((f) => f.data === dia)) {
    falhar(
      409,
      `O caixa de ${fmtDia(dia)} já foi fechado. Lance a correção no caixa de hoje (lançamento manual).`,
    )
  }
}

function resumoDoDia(db, dia) {
  const lancamentos = tabela(db, 'caixa')
    .filter((l) => diaLocal(l.data) === dia)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
  const anterior = tabela(db, 'fechamentosCaixa')
    .filter((f) => f.data < dia)
    .sort((a, b) => b.data.localeCompare(a.data))[0]
  const somar = (l) => Math.round(l.reduce((s, x) => s + Number(x.valor), 0) * 100) / 100
  const entradas = lancamentos.filter((l) => l.tipo === 'entrada')
  const saidas = lancamentos.filter((l) => l.tipo === 'saida')
  const da = (l, f) => somar(l.filter((x) => x.formaPagamento === f))
  const saldoInicial = anterior ? Number(anterior.dinheiroContado) : 0
  const resumo = {
    saldoInicial,
    entradas: {
      dinheiro: da(entradas, 'dinheiro'),
      pix: da(entradas, 'pix'),
      cartao: da(entradas, 'cartao'),
      total: somar(entradas),
    },
    saidas: {
      dinheiro: da(saidas, 'dinheiro'),
      outras: somar(saidas.filter((x) => x.formaPagamento !== 'dinheiro')),
      total: somar(saidas),
    },
  }
  resumo.dinheiroEsperado =
    Math.round((saldoInicial + resumo.entradas.dinheiro - resumo.saidas.dinheiro) * 100) / 100
  resumo.saldoDoDia = Math.round((resumo.entradas.total - resumo.saidas.total) * 100) / 100
  return { lancamentos, resumo, ultimoFechamento: anterior?.data ?? null }
}

function dinheiroDisponivelOuFalha(db, dia, valor) {
  const { resumo } = resumoDoDia(db, dia)
  if (centavos(valor) > centavos(resumo.dinheiroEsperado)) {
    falhar(
      409,
      `Não há dinheiro suficiente no caixa (disponível: R$ ${Math.max(0, resumo.dinheiroEsperado).toFixed(2).replace('.', ',')}). Use outra forma de pagamento ou lance um suprimento (entrada em dinheiro) antes.`,
    )
  }
}

function registrarNoCaixa(db, dados) {
  const dia = dados.dia || hojeLocal()
  caixaAbertoOuFalha(db, dia)
  if (dados.tipo === 'saida' && dados.formaPagamento === 'dinheiro')
    dinheiroDisponivelOuFalha(db, dia, dados.valor)
  const data =
    dia === hojeLocal() ? new Date().toISOString() : new Date(`${dia}T12:00:00`).toISOString()
  tabela(db, 'caixa').push({
    id: proximo(db.caixa),
    data,
    tipo: dados.tipo,
    formaPagamento: dados.formaPagamento,
    valor: Number(dados.valor).toFixed(2),
    descricao: dados.descricao,
    idPedido: dados.idPedido ?? null,
    idContaReceber: dados.idContaReceber ?? null,
    idContaPagar: dados.idContaPagar ?? null,
    idUsuario: dados.idUsuario,
  })
}

function removerDoCaixa(db, campo, id) {
  const doCampo = tabela(db, 'caixa').filter((l) => l[campo] === id)
  doCampo.forEach((l) => caixaAbertoOuFalha(db, diaLocal(l.data)))
  db.caixa = db.caixa.filter((l) => !doCampo.includes(l))
}

const usuarioOuFalha = (db, id, mensagem) => {
  if (!db.usuarios.some((u) => u.id === Number(id))) falhar(400, mensagem)
}

function lancamentoCompleto(db, l) {
  const u = db.usuarios.find((x) => x.id === l.idUsuario)
  return { ...l, usuario: u ? { id: u.id, nome: u.nome } : null }
}

function fechamentoCompleto(db, f) {
  if (!f) return null
  const u = db.usuarios.find((x) => x.id === f.idUsuario)
  return { ...f, usuario: u ? { id: u.id, nome: u.nome } : null }
}

// Conta vencida avulsa ou de pedido já entregue (status 5)
function inadimplentesDe(db) {
  sincronizarContasPedidos(db)
  const hoje = hojeLocal()
  const mapa = new Map()
  for (const c of db.contasReceber) {
    if (c.dataRecebimento || !c.dataPrevisao || c.dataPrevisao >= hoje) continue
    const pedido = c.idPedido ? db.pedidos.find((p) => p.id === c.idPedido) : null
    if (c.idPedido && pedido?.status !== STATUS_FINALIZADO) continue
    const cli = db.clientes.find((x) => x.id === c.idCliente)
    if (!mapa.has(c.idCliente)) {
      mapa.set(c.idCliente, {
        idCliente: c.idCliente,
        nome: cli?.nome ?? '',
        telefone: cli?.telefone ?? '',
        totalVencido: 0,
        contas: [],
      })
    }
    const r = mapa.get(c.idCliente)
    r.totalVencido = Math.round((r.totalVencido + Number(c.total)) * 100) / 100
    r.contas.push({
      id: c.id,
      descricao: c.descricao,
      valor: Number(c.total),
      vencimento: c.dataPrevisao,
      idPedido: c.idPedido,
    })
  }
  return mapa
}

function vendedorDe(db, pedido) {
  const u = db.usuarios.find((x) => x.id === pedido.idVendedor)
  return u ? { id: u.id, nome: u.nome } : null
}

function itemCompleto(db, item) {
  const produto = item.idProduto ? db.produtos.find((p) => p.id === item.idProduto) : null
  const servico = item.idServico ? db.servicos.find((s) => s.id === item.idServico) : null
  return {
    ...item,
    produto: produto ? { id: produto.id, nome: produto.nome } : null,
    servico: servico ? { id: servico.id, nome: servico.nome } : null,
  }
}

// total = subtotal (itens) - desconto (SPV-73), igual ao Back/trigger
function aplicarTotais(pedido, subtotal) {
  const sub = Math.round(Number(subtotal) * 100)
  let desconto = 0
  if (pedido.descontoTipo === 'percentual')
    desconto = Math.round((sub * Number(pedido.descontoInformado)) / 100)
  else if (pedido.descontoTipo === 'valor')
    desconto = Math.min(Math.round(Number(pedido.descontoInformado) * 100), sub)
  pedido.subtotal = (sub / 100).toFixed(2)
  pedido.valorDesconto = (desconto / 100).toFixed(2)
  pedido.total = ((sub - desconto) / 100).toFixed(2)
}

function recalcularTotal(db, idPedido) {
  const subtotal = db.itensPedido
    .filter((i) => i.idPedido === idPedido)
    .reduce((soma, i) => soma + i.quantidade * Number(i.valorUnitario), 0)
  const pedido = db.pedidos.find((p) => p.id === idPedido)
  aplicarTotais(pedido, subtotal)
  return pedido
}

// SPV-73: multa 2% + juros 1% a.m. (conta avulsa ou de pedido entregue), igual ao utils/encargos.js
function encargosDe(db, conta, dia) {
  const valor = centavos(conta.total)
  const venc = conta.dataPrevisao ? String(conta.dataPrevisao).slice(0, 10) : null
  const [a1, m1, d1] = (venc ?? dia).split('-').map(Number)
  const [a2, m2, d2] = dia.split('-').map(Number)
  const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
  const pedido = conta.idPedido ? db.pedidos.find((x) => x.id === conta.idPedido) : null
  if (dias <= 0 || (pedido && pedido.status !== STATUS_FINALIZADO))
    return { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: valor / 100, fator: 1 }
  const multa = Math.round((valor * 2) / 100)
  const juros = Math.round((valor * dias) / 3000)
  return {
    diasAtraso: dias,
    multa: multa / 100,
    juros: juros / 100,
    totalAtualizado: (valor + multa + juros) / 100,
    fator: 1.02 + 0.01 * (dias / 30),
  }
}

// Bancos de teste salvos antes desta versão não têm as tabelas novas
function tabela(db, nome) {
  if (!Array.isArray(db[nome])) db[nome] = []
  return db[nome]
}

const proximo = (lista) => lista.reduce((maior, l) => Math.max(maior, l.id), 0) + 1

// "2026-10-21T13:00:00Z" -> "2026-10-21" no fuso do navegador
function diaLocal(iso) {
  const d = new Date(iso)
  const dois = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
}

function operadorDe(db, idUsuario) {
  const u = db.usuarios.find((x) => x.id === idUsuario)
  return u ? { id: u.id, nome: u.nome } : null
}

// Lê um arquivo do FormData como data URL (o modo de teste guarda o arquivo no navegador)
const lerComoDataUrl = (arquivo) =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(arquivo)
  })

const TIPOS_ANEXO = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]
// No navegador o espaço é pequeno: no modo de teste cada arquivo pode ter até 1 MB
const TAMANHO_MAXIMO_MOCK = 1024 * 1024

// Igual ao MovimentacoesEstoque.movimentar do Back: muda o saldo e grava o histórico juntos
function movimentar(
  db,
  estoque,
  delta,
  { tipo, motivo = null, idPedido = null, idUsuario = null },
) {
  if (!delta) return
  const lista = tabela(db, 'movimentacoesEstoque')
  const saldoAnterior = estoque.estoqueAtual
  estoque.estoqueAtual = saldoAnterior + delta
  lista.push({
    id: proximo(lista),
    idProduto: estoque.idProduto,
    tipo,
    quantidade: delta,
    saldoAnterior,
    saldoAtual: estoque.estoqueAtual,
    motivo,
    idPedido,
    idUsuario,
    data: new Date().toISOString(),
  })
}

function pedidoOuFalha(db, id) {
  const pedido = db.pedidos.find((p) => p.id === Number(id))
  if (!pedido) falhar(404, 'Pedido não encontrado.')
  return pedido
}

// ---------- rotas ----------

const rotas = [
  // ===== autenticação =====
  [
    'post',
    '/login',
    (db, _p, body) => {
      const usuario = db.usuarios.find(
        (u) =>
          u.login ===
          String(body.login || '')
            .trim()
            .toLowerCase(),
      )
      if (!usuario || usuario.senha !== body.senha) falhar(401, 'Usuário ou senha inválidos.')
      if (Number(usuario.status) !== 1) falhar(403, 'Usuário inativo. Fale com o administrador.')
      return usuarioComTelas(db, usuario)
    },
  ],

  // SPV-111: saída (manual ou inatividade)
  [
    'post',
    '/login/sair',
    (db, _p, body) => {
      const sessao = JSON.parse(sessionStorage.getItem('spv:sessao') || 'null')
      registrarLogMock(db, {
        log: {
          modulo: 'acesso',
          acao: body.motivo === 'inatividade' ? 'sessao_expirada' : 'logout',
          descricao:
            body.motivo === 'inatividade' ? 'Sessão encerrada por inatividade' : 'Saiu do sistema',
          idUsuario: body.idUsuario ?? sessao?.id ?? null,
        },
      })
      return { mensagem: 'Saída registrada.' }
    },
  ],
  // SPV-111: consulta dos logs (mesmos filtros do Back)
  [
    'get',
    '/logs',
    (db, _p, _b, q) => {
      let lista = [...tabela(db, 'logs')]
      if (q.de || q.ate) {
        const de = q.de || q.ate
        const ate = q.ate || q.de
        if (de > ate) falhar(400, 'A data inicial não pode ser depois da final.')
        lista = lista.filter((l) => diaLocal(l.dataHora) >= de && diaLocal(l.dataHora) <= ate)
      }
      if (q.modulo) lista = lista.filter((l) => l.modulo === q.modulo)
      if (q.idUsuario) lista = lista.filter((l) => l.idUsuario === Number(q.idUsuario))
      if (q.entidade) lista = lista.filter((l) => l.entidade === q.entidade)
      if (q.idEntidade) lista = lista.filter((l) => l.idEntidade === Number(q.idEntidade))
      if (q.busca) {
        const t = String(q.busca).toLowerCase()
        lista = lista.filter((l) =>
          [l.descricao, l.usuarioNome, l.acao].some((x) =>
            String(x ?? '')
              .toLowerCase()
              .includes(t),
          ),
        )
      }
      lista.sort((a, b) => b.dataHora.localeCompare(a.dataHora) || b.id - a.id)
      const limite = Math.min(Math.max(Number(q.limite) || 500, 1), 1000)
      return { total: lista.length, limite, logs: lista.slice(0, limite) }
    },
  ],

  // ===== usuários =====
  ['get', '/usuarios', (db) => db.usuarios.map((u) => usuarioComTelas(db, u))],
  [
    'get',
    '/usuarios/:id',
    (db, p) => {
      const u = db.usuarios.find((x) => x.id === Number(p.id))
      return u ? usuarioComTelas(db, u) : null
    },
  ],
  [
    'post',
    '/usuarios',
    (db, _p, body) => {
      if (db.usuarios.some((u) => u.login === body.login)) falhar(500, 'Validation error')
      const usuario = {
        id: proximoId('usuarios'),
        login: body.login,
        senha: body.senha,
        nome: body.nome,
        status: body.status ?? 1,
      }
      db.usuarios.push(usuario)
      return [201, semSenha(usuario)]
    },
  ],
  [
    'put',
    '/usuarios/:id',
    (db, p, body) => {
      const usuario = db.usuarios.find((x) => x.id === Number(p.id))
      if (!usuario) falhar(500, "Cannot read properties of null (reading 'update')")
      if (body.login && db.usuarios.some((u) => u.login === body.login && u.id !== usuario.id)) {
        falhar(500, 'Validation error')
      }
      for (const campo of ['login', 'nome', 'status']) {
        if (body[campo] !== undefined) usuario[campo] = body[campo]
      }
      if (body.senha) usuario.senha = body.senha
      return semSenha(usuario)
    },
  ],
  [
    'put',
    '/usuarios/:id/senha',
    (db, p, body) => {
      const usuario = db.usuarios.find((x) => x.id === Number(p.id))
      if (!usuario) falhar(404, 'Usuário não encontrado.')
      if (usuario.senha !== body.senhaAtual) falhar(400, 'A senha atual está incorreta.')
      usuario.senha = body.novaSenha
      return { mensagem: 'Senha alterada com sucesso.' }
    },
  ],

  // ===== permissões por tela (usuarioTela) =====
  [
    'get',
    '/usuario-tela/usuario/:idUsuario',
    (db, p) => db.usuarioTela.filter((t) => t.idUsuario === Number(p.idUsuario)),
  ],
  [
    'post',
    '/usuario-tela',
    (db, _p, body) => {
      const registro = {
        id: proximoId('usuarioTela'),
        idUsuario: body.idUsuario,
        tela: body.tela,
        podeAcessar: Boolean(body.podeAcessar),
      }
      db.usuarioTela.push(registro)
      return [201, registro]
    },
  ],
  [
    'put',
    '/usuario-tela/:id',
    (db, p, body) => {
      const registro = db.usuarioTela.find((t) => t.id === Number(p.id))
      if (!registro) falhar(500, "Cannot read properties of null (reading 'update')")
      Object.assign(registro, {
        idUsuario: body.idUsuario,
        tela: body.tela,
        podeAcessar: Boolean(body.podeAcessar),
      })
      return registro
    },
  ],

  // ===== clientes / catálogo =====
  [
    'get',
    '/clientes',
    (db) =>
      [...db.clientes]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((c) => clienteCompleto(db, c)),
  ],
  [
    'get',
    '/clientes/inadimplentes',
    (db) => [...inadimplentesDe(db).values()].sort((a, b) => b.totalVencido - a.totalVencido),
  ],
  [
    'get',
    '/clientes/:id',
    (db, p) => {
      const cliente = db.clientes.find((c) => c.id === Number(p.id))
      if (!cliente) falhar(404, 'Cliente não encontrado.')
      return clienteCompleto(db, cliente)
    },
  ],
  ['post', '/clientes', (db, _p, body) => [201, salvarCliente(db, null, body)]],
  ['put', '/clientes/:id', (db, p, body) => salvarCliente(db, Number(p.id), body)],
  [
    'delete',
    '/clientes/:id',
    (db, p) => {
      const id = Number(p.id)
      if (!db.clientes.some((c) => c.id === id)) falhar(404, 'Cliente não encontrado.')
      const pedidos = db.pedidos.filter((x) => x.idCliente === id).length
      if (pedidos > 0) {
        falhar(
          409,
          `Este cliente tem ${pedidos} pedido(s) e não pode ser excluído. Use "Inativar" para que ele não apareça em pedidos novos.`,
        )
      }
      db.clientes = db.clientes.filter((c) => c.id !== id)
      db.clientesCpf = db.clientesCpf.filter((c) => c.idCliente !== id) // ON DELETE CASCADE
      db.clientesCnpj = db.clientesCnpj.filter((c) => c.idCliente !== id)
      return { mensagem: 'Cliente removido.' }
    },
  ],
  ['get', '/produtos', (db) => db.produtos],
  ['get', '/servicos', (db) => db.servicos],
  [
    'get',
    '/estoque',
    (db) =>
      db.estoque.map((e) => {
        const p = db.produtos.find((x) => x.id === e.idProduto)
        return { ...e, produto: p ? { id: p.id, nome: p.nome, valor: p.valor } : null }
      }),
  ],

  // ===== cadastro de produtos (REQ007) =====
  [
    'post',
    '/produtos',
    (db, _p, body) => {
      if (!body.nome || body.valor === undefined) falhar(400, 'Nome e valor são obrigatórios.')
      const produto = {
        id: proximoId('produtos'),
        nome: body.nome,
        descricao: body.descricao ?? null,
        valor: Number(body.valor).toFixed(2),
        controlaEstoque: Boolean(body.controlaEstoque),
      }
      db.produtos.push(produto)
      return [201, produto]
    },
  ],
  [
    'put',
    '/produtos/:id',
    (db, p, body) => {
      const produto = db.produtos.find((x) => x.id === Number(p.id))
      if (!produto) falhar(404, 'Produto não encontrado.')
      for (const campo of ['nome', 'descricao', 'controlaEstoque']) {
        if (body[campo] !== undefined) produto[campo] = body[campo]
      }
      if (body.valor !== undefined) produto.valor = Number(body.valor).toFixed(2)
      return produto
    },
  ],
  [
    'delete',
    '/produtos/:id',
    (db, p) => {
      const id = Number(p.id)
      const produto = db.produtos.find((x) => x.id === id)
      if (!produto) falhar(404, 'Produto não encontrado.')
      const usos = db.itensPedido.filter((i) => i.idProduto === id).length
      if (usos > 0) {
        falhar(
          409,
          `Este produto já foi usado em ${usos} item(ns) de pedido e não pode ser excluído. Você pode editar o nome ou o valor.`,
        )
      }
      db.produtos = db.produtos.filter((x) => x.id !== id)
      db.estoque = db.estoque.filter((e) => e.idProduto !== id) // ON DELETE CASCADE
      return { mensagem: 'Produto removido com sucesso.' }
    },
  ],

  // ===== pendências por cliente (SPV-58) — mesmo resultado da VIEW vw_pendencias_clientes =====
  [
    'get',
    '/pendencias',
    (db, _p, _b, query) => {
      const devedores = inadimplentesDe(db) // já sincroniza as contas dos pedidos
      const linhas = db.clientes
        .map((c) => {
          const abertas = db.contasReceber.filter((x) => x.idCliente === c.id && !x.dataRecebimento)
          const doCliente = db.pedidos.filter((p) => p.idCliente === c.id)
          const dev = devedores.get(c.id)
          return {
            idCliente: c.id,
            nome: c.nome,
            telefone: c.telefone,
            fatorConfianca: c.fatorConfianca ?? 3,
            clienteAtivo: Boolean(c.status),
            valorVencido: (dev?.totalVencido ?? 0).toFixed(2),
            contasVencidas: dev?.contas.length ?? 0,
            valorAReceber: (abertas.reduce((s, x) => s + centavos(x.total), 0) / 100).toFixed(2),
            pedidosProntos: doCliente.filter((p) => p.status === 4).length,
            idsPedidosProntos: doCliente
              .filter((p) => p.status === 4)
              .map((p) => p.id)
              .sort((a, b) => a - b),
            pedidosEmAndamento: doCliente.filter((p) => p.status >= 1 && p.status <= 3).length,
            inadimplente: Boolean(dev),
          }
        })
        .filter(
          (l) => Number(l.valorAReceber) > 0 || l.pedidosProntos > 0 || l.pedidosEmAndamento > 0,
        )
      const filtros = {
        devendo: (l) => l.inadimplente,
        receber: (l) => Number(l.valorAReceber) > 0,
        retirada: (l) => l.pedidosProntos > 0,
      }
      if (query.filtro && !filtros[query.filtro])
        falhar(400, 'Filtro inválido: use devendo, receber ou retirada.')
      return linhas
        .filter(query.filtro ? filtros[query.filtro] : () => true)
        .sort(
          (a, b) =>
            b.valorVencido - a.valorVencido ||
            b.valorAReceber - a.valorAReceber ||
            a.nome.localeCompare(b.nome),
        )
    },
  ],

  // ===== dashboard gerencial (SPV-101) — mesmas contas do dashboardControllers =====
  [
    'get',
    '/dashboard',
    (db, _p, _b, query) => {
      const mes = query.mes || hojeLocal().slice(0, 7)
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) falhar(400, 'Mês inválido (use AAAA-MM).')
      const dois = (n) => String(n).padStart(2, '0')
      const arred = (n) => Math.round(n * 100) / 100
      const somarMeses = (m, n) => {
        const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1)
        return `${d.getFullYear()}-${dois(d.getMonth() + 1)}`
      }
      const mesDe = (iso) => diaLocal(iso).slice(0, 7)
      const resumo = (lista) => {
        const validos = lista.filter((p) => p.status !== STATUS_CANCELADO)
        const faturamento = arred(validos.reduce((s, p) => s + Number(p.total), 0))
        return {
          faturamento,
          pedidos: validos.length,
          ticketMedio: validos.length ? arred(faturamento / validos.length) : 0,
          cancelados: lista.length - validos.length,
        }
      }
      const doMes = db.pedidos.filter((p) => mesDe(p.dataCriacao) === mes)
      const vendas = resumo(doMes)
      const anterior = resumo(
        db.pedidos.filter((p) => mesDe(p.dataCriacao) === somarMeses(mes, -1)),
      )
      const porMes = Array.from({ length: 6 }, (_, i) => {
        const m = somarMeses(mes, i - 5)
        const r = resumo(db.pedidos.filter((p) => mesDe(p.dataCriacao) === m))
        return {
          mes: m,
          faturamento: r.faturamento,
          pedidos: r.pedidos,
          ticketMedio: r.ticketMedio,
        }
      })
      const ultimoDia = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate()
      const porDia = Array.from({ length: ultimoDia }, (_, i) => ({
        dia: `${mes}-${dois(i + 1)}`,
        faturamento: 0,
        pedidos: 0,
      }))
      const porCliente = new Map()
      for (const p of doMes) {
        if (p.status === STATUS_CANCELADO) continue
        const linha = porDia[Number(diaLocal(p.dataCriacao).slice(8)) - 1]
        linha.faturamento = arred(linha.faturamento + Number(p.total))
        linha.pedidos += 1
        const c = porCliente.get(p.idCliente) ?? {
          id: p.idCliente,
          nome: db.clientes.find((x) => x.id === p.idCliente)?.nome ?? `Cliente ${p.idCliente}`,
          faturamento: 0,
          pedidos: 0,
        }
        c.faturamento = arred(c.faturamento + Number(p.total))
        c.pedidos += 1
        porCliente.set(p.idCliente, c)
      }
      const lanc = tabela(db, 'caixa').filter((l) => mesDe(l.data) === mes)
      const soma = (tipo) =>
        arred(lanc.filter((l) => l.tipo === tipo).reduce((s, l) => s + Number(l.valor), 0))
      const caixa = { entradas: soma('entrada'), saidas: soma('saida') }
      caixa.saldo = arred(caixa.entradas - caixa.saidas)
      const abertos = db.pedidos.filter((p) => p.status >= 1 && p.status <= 4)
      const agora = new Date()
      const operadores = new Map()
      let pecas = 0
      let minutos = 0
      for (const a of tabela(db, 'apontamentos').filter((x) => x.fim && mesDe(x.fim) === mes)) {
        const min = Math.max(0, (new Date(a.fim) - new Date(a.inicio)) / 60000)
        const qtd = Number(a.quantidadeProduzida ?? 0)
        pecas += qtd
        minutos += min
        const o = operadores.get(a.idUsuario) ?? {
          id: a.idUsuario,
          nome: operadorDe(db, a.idUsuario)?.nome ?? `Usuário ${a.idUsuario}`,
          pecas: 0,
          minutos: 0,
          apontamentos: 0,
        }
        o.pecas += qtd
        o.minutos += min
        o.apontamentos += 1
        operadores.set(a.idUsuario, o)
      }
      return {
        mes,
        periodo: { inicio: `${mes}-01`, fim: `${mes}-${dois(ultimoDia)}` },
        vendas: {
          ...vendas,
          faturamentoMesAnterior: anterior.faturamento,
          variacao:
            anterior.faturamento > 0
              ? arred(((vendas.faturamento - anterior.faturamento) / anterior.faturamento) * 100)
              : null,
        },
        caixa,
        porMes,
        porDia,
        topClientes: [...porCliente.values()]
          .sort((a, b) => b.faturamento - a.faturamento)
          .slice(0, 5),
        situacao: {
          porStatus: [1, 2, 3, 4].map((status) => ({
            status,
            quantidade: abertos.filter((p) => p.status === status).length,
          })),
          emAndamento: abertos.length,
          atrasados: abertos.filter(
            (p) => p.status < 4 && p.dataEntregaPrevista && new Date(p.dataEntregaPrevista) < agora,
          ).length,
        },
        producao: {
          apontamentos: [...operadores.values()].reduce((s, o) => s + o.apontamentos, 0),
          pecas,
          minutos: Math.round(minutos),
          porOperador: [...operadores.values()]
            .map((o) => ({ ...o, minutos: Math.round(o.minutos) }))
            .sort((a, b) => b.pecas - a.pecas),
        },
      }
    },
  ],

  // ===== caixa (SPV-84/97) =====
  [
    'get',
    '/caixa',
    (db, _p, _b, query) => {
      const dia = query.data || hojeLocal()
      const { lancamentos, resumo, ultimoFechamento } = resumoDoDia(db, dia)
      return {
        data: dia,
        hoje: hojeLocal(),
        lancamentos: lancamentos.map((l) => lancamentoCompleto(db, l)),
        resumo,
        fechamento: fechamentoCompleto(
          db,
          tabela(db, 'fechamentosCaixa').find((f) => f.data === dia),
        ),
        ultimoFechamento,
      }
    },
  ],
  [
    'get',
    '/caixa/periodo',
    (db, _p, _b, query) =>
      tabela(db, 'caixa')
        .filter((l) => diaLocal(l.data) >= query.de && diaLocal(l.data) <= query.ate)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => lancamentoCompleto(db, l)),
  ],
  // SPV-81 — fluxo de caixa do período (mesmo cálculo do caixaControllers.fluxo)
  [
    'get',
    '/caixa/fluxo',
    (db, _p, _b, query) => {
      const { de, ate } = query
      if (!diaValido(de) || !diaValido(ate)) falhar(400, 'Data inválida (use AAAA-MM-DD).')
      if (de > ate) falhar(400, 'A data inicial não pode ser depois da final.')
      const todos = [...tabela(db, 'caixa')].sort((a, b) => a.data.localeCompare(b.data))
      const sinal = (l) => (l.tipo === 'entrada' ? 1 : -1) * centavos(l.valor)
      const saldoAnterior = todos
        .filter((l) => diaLocal(l.data) < de)
        .reduce((s, l) => s + sinal(l), 0)
      const doPeriodo = todos.filter((l) => diaLocal(l.data) >= de && diaLocal(l.data) <= ate)
      const porDia = new Map()
      const porForma = { entrada: {}, saida: {} }
      const porOrigem = {}
      const porCategoria = {}
      let entradas = 0
      let saidas = 0
      const somar = (obj, chave, v) => {
        obj[chave] = (obj[chave] ?? 0) + v
      }
      for (const l of doPeriodo) {
        const c = centavos(l.valor)
        const dia = diaLocal(l.data)
        const linha = porDia.get(dia) ?? { dia, entradas: 0, saidas: 0, lancamentos: 0 }
        linha.lancamentos += 1
        somar(porForma[l.tipo], l.formaPagamento || 'sem forma', c)
        if (l.tipo === 'entrada') {
          entradas += c
          linha.entradas += c
          somar(
            porOrigem,
            l.idContaReceber ? 'Recebimento de contas a receber' : 'Lançamento manual (entrada)',
            c,
          )
        } else {
          saidas += c
          linha.saidas += c
          somar(
            porOrigem,
            l.idContaPagar ? 'Pagamento de contas a pagar' : 'Lançamento manual (saída)',
            c,
          )
          const conta = l.idContaPagar
            ? tabela(db, 'contasPagar').find((x) => x.id === l.idContaPagar)
            : null
          somar(porCategoria, conta?.tipo || 'Despesa do dia (caixa)', c)
        }
        porDia.set(dia, linha)
      }
      const reais = (n) => n / 100
      const lista = (obj) =>
        Object.entries(obj)
          .map(([nome, v]) => ({ nome, valor: reais(v) }))
          .sort((a, b) => b.valor - a.valor)
      let acumulado = saldoAnterior
      return {
        de,
        ate,
        saldoAnterior: reais(saldoAnterior),
        totais: {
          entradas: reais(entradas),
          saidas: reais(saidas),
          resultado: reais(entradas - saidas),
          saldoFinal: reais(saldoAnterior + entradas - saidas),
        },
        porDia: [...porDia.values()].map((d) => {
          acumulado += d.entradas - d.saidas
          return {
            dia: d.dia,
            lancamentos: d.lancamentos,
            entradas: reais(d.entradas),
            saidas: reais(d.saidas),
            saldoDia: reais(d.entradas - d.saidas),
            acumulado: reais(acumulado),
          }
        }),
        porForma: { entrada: lista(porForma.entrada), saida: lista(porForma.saida) },
        porOrigem: lista(porOrigem),
        porCategoria: lista(porCategoria),
        lancamentos: doPeriodo.map((l) => {
          const conta = l.idContaPagar
            ? tabela(db, 'contasPagar').find((x) => x.id === l.idContaPagar)
            : null
          return {
            ...lancamentoCompleto(db, l),
            contaPagar: conta ? { id: conta.id, tipo: conta.tipo } : null,
          }
        }),
      }
    },
  ],
  [
    'get',
    '/caixa/fechamentos',
    (db) =>
      [...tabela(db, 'fechamentosCaixa')]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((f) => fechamentoCompleto(db, f)),
  ],
  [
    'post',
    '/caixa',
    (db, _p, body) => {
      if (!['entrada', 'saida'].includes(body.tipo)) falhar(400, 'Escolha entrada ou saída.')
      const formas = body.tipo === 'entrada' ? FORMAS_RECEBER : FORMAS_PAGAR
      if (!formas.includes(body.formaPagamento)) falhar(400, 'Escolha a forma de pagamento.')
      if (!valorMonetarioValido(body.valor))
        falhar(400, 'Informe um valor maior que zero, com até 2 casas decimais.')
      if (String(body.descricao ?? '').trim().length < 2) {
        falhar(400, 'Descreva o lançamento (ex.: venda no balcão, troco, sangria).')
      }
      usuarioOuFalha(db, body.idUsuario, 'Usuário não encontrado.')
      registrarNoCaixa(db, {
        ...body,
        descricao: body.descricao.trim(),
        idUsuario: Number(body.idUsuario),
      })
      return [201, db.caixa.at(-1)]
    },
  ],
  [
    'delete',
    '/caixa/:id',
    (db, p) => {
      const l = contaOuFalha(tabela(db, 'caixa'), p.id, 'Lançamento')
      if (l.idContaReceber || l.idContaPagar) {
        falhar(
          409,
          'Este lançamento veio de uma conta. Para desfazer, use "Desfazer recebimento/pagamento" na conta.',
        )
      }
      const dia = diaLocal(l.data)
      caixaAbertoOuFalha(db, dia)
      const esperado = resumoDoDia(db, dia).resumo.dinheiroEsperado
      if (
        l.tipo === 'entrada' &&
        l.formaPagamento === 'dinheiro' &&
        centavos(esperado) - centavos(l.valor) < 0
      ) {
        falhar(
          409,
          'Este dinheiro já foi usado em saídas do dia: excluir a entrada deixaria o caixa negativo.',
        )
      }
      db.caixa = db.caixa.filter((x) => x !== l)
      return { mensagem: 'Lançamento removido.' }
    },
  ],
  [
    'post',
    '/caixa/fechar',
    (db, _p, body) => {
      const dia = body.data || hojeLocal()
      if (dia > hojeLocal()) falhar(400, 'Não dá para fechar um dia que ainda não chegou.')
      const contado = Number(body.dinheiroContado)
      if (
        body.dinheiroContado === '' ||
        body.dinheiroContado === undefined ||
        !Number.isFinite(contado) ||
        contado < 0
      ) {
        falhar(400, 'Informe quanto dinheiro foi contado na gaveta (pode ser 0).')
      }
      usuarioOuFalha(db, body.idUsuario, 'Usuário não encontrado.')
      caixaAbertoOuFalha(db, dia)
      const { resumo } = resumoDoDia(db, dia)
      const diferenca = (centavos(contado) - centavos(resumo.dinheiroEsperado)) / 100
      const observacao = String(body.observacao ?? '').trim()
      if (diferenca !== 0 && observacao.length < 3) {
        falhar(
          400,
          `O dinheiro contado tem diferença de R$ ${diferenca.toFixed(2).replace('.', ',')} em relação ao esperado. Explique na observação.`,
        )
      }
      const f = {
        id: proximo(tabela(db, 'fechamentosCaixa')),
        data: dia,
        saldoInicial: resumo.saldoInicial.toFixed(2),
        entradasDinheiro: resumo.entradas.dinheiro.toFixed(2),
        entradasPix: resumo.entradas.pix.toFixed(2),
        entradasCartao: resumo.entradas.cartao.toFixed(2),
        saidasDinheiro: resumo.saidas.dinheiro.toFixed(2),
        saidasOutras: resumo.saidas.outras.toFixed(2),
        dinheiroEsperado: resumo.dinheiroEsperado.toFixed(2),
        dinheiroContado: contado.toFixed(2),
        diferenca: diferenca.toFixed(2),
        observacao: observacao || null,
        idUsuario: Number(body.idUsuario),
        fechadoEm: new Date().toISOString(),
      }
      db.fechamentosCaixa.push(f)
      return [201, f]
    },
  ],

  // ===== contas a pagar (SPV-86) =====
  [
    'get',
    '/contas-pagar',
    (db) =>
      [...tabela(db, 'contasPagar')].sort(
        (a, b) =>
          String(a.dataVencimento ?? '9999').localeCompare(String(b.dataVencimento ?? '9999')) ||
          a.id - b.id,
      ),
  ],
  [
    'post',
    '/contas-pagar',
    (db, _p, body) => {
      const conta = {
        id: proximo(tabela(db, 'contasPagar')),
        item: 1,
        fornecedor: null,
        dataPagamento: null,
        formaPagamento: null,
        dataCriacao: hojeLocal(),
        ...lerContaPagar(body, false),
      }
      db.contasPagar.push(conta)
      return [201, conta]
    },
  ],
  [
    'put',
    '/contas-pagar/:id',
    (db, p, body) => {
      const conta = contaOuFalha(tabela(db, 'contasPagar'), p.id, 'Conta a pagar')
      if (conta.dataPagamento)
        falhar(409, 'Conta já paga não pode ser editada. Desfaça o pagamento antes.')
      return Object.assign(conta, lerContaPagar(body, true))
    },
  ],
  [
    'post',
    '/contas-pagar/:id/pagar',
    (db, p, body) => {
      const conta = contaOuFalha(tabela(db, 'contasPagar'), p.id, 'Conta a pagar')
      if (conta.dataPagamento) falhar(409, 'Esta conta já está paga.')
      const data = dataDaBaixa(body, 'dataPagamento')
      if (!FORMAS_PAGAR.includes(body.formaPagamento)) falhar(400, 'Informe como a conta foi paga.')
      usuarioOuFalha(db, body.idUsuario, 'Informe quem está pagando (idUsuario).')
      registrarNoCaixa(db, {
        dia: data,
        tipo: 'saida',
        formaPagamento: body.formaPagamento,
        valor: conta.valor,
        descricao: `Pagamento: ${conta.descricao}${conta.fornecedor ? ` (${conta.fornecedor})` : ''}`,
        idContaPagar: conta.id,
        idUsuario: Number(body.idUsuario),
      })
      return Object.assign(conta, { dataPagamento: data, formaPagamento: body.formaPagamento })
    },
  ],
  [
    'post',
    '/contas-pagar/:id/estornar',
    (db, p) => {
      const conta = contaOuFalha(tabela(db, 'contasPagar'), p.id, 'Conta a pagar')
      if (!conta.dataPagamento) falhar(409, 'Esta conta ainda não foi paga.')
      removerDoCaixa(db, 'idContaPagar', conta.id)
      return Object.assign(conta, { dataPagamento: null, formaPagamento: null })
    },
  ],
  [
    'delete',
    '/contas-pagar/:id',
    (db, p) => {
      const conta = contaOuFalha(tabela(db, 'contasPagar'), p.id, 'Conta a pagar')
      if (conta.dataPagamento)
        falhar(409, 'Conta já paga não pode ser excluída (é histórico financeiro).')
      db.contasPagar = db.contasPagar.filter((c) => c !== conta)
      return { mensagem: 'Conta a pagar excluída.' }
    },
  ],

  // ===== contas a receber (SPV-85) =====
  [
    'get',
    '/contas-receber',
    (db) => {
      sincronizarContasPedidos(db)
      return [...db.contasReceber]
        .sort(
          (a, b) =>
            String(a.dataPrevisao ?? '9999').localeCompare(String(b.dataPrevisao ?? '9999')) ||
            a.id - b.id,
        )
        .map((c) => contaReceberCompleta(db, c))
    },
  ],
  [
    'post',
    '/contas-receber',
    (db, _p, body) => {
      const conta = {
        id: proximo(tabela(db, 'contasReceber')),
        idPedido: null,
        dataRecebimento: null,
        formaPagamento: null,
        dataCriacao: hojeLocal(),
        ...lerContaReceber(db, body, false),
      }
      db.contasReceber.push(conta)
      return [201, conta]
    },
  ],
  [
    'put',
    '/contas-receber/:id',
    (db, p, body) => {
      const conta = contaOuFalha(tabela(db, 'contasReceber'), p.id, 'Conta a receber')
      if (conta.idPedido)
        falhar(
          409,
          'Esta conta vem do pedido: o valor e o vencimento mudam pelo próprio pedido (itens e data de entrega).',
        )
      if (conta.dataRecebimento)
        falhar(409, 'Conta já recebida não pode ser editada. Desfaça o recebimento antes.')
      return Object.assign(conta, lerContaReceber(db, body, true))
    },
  ],
  [
    'post',
    '/contas-receber/:id/receber',
    (db, p, body) => {
      sincronizarContasPedidos(db)
      const conta = contaOuFalha(db.contasReceber, p.id, 'Conta a receber')
      if (conta.dataRecebimento) falhar(409, 'Esta conta já foi recebida.')
      const data = dataDaBaixa(body, 'dataRecebimento')
      if (!FORMAS_RECEBER.includes(body.formaPagamento))
        falhar(400, 'Informe a forma de pagamento: dinheiro, PIX ou cartão.')
      // SPV-73: multa e juros na conta vencida (cobrarEncargos: false dispensa)
      const enc =
        body.cobrarEncargos === false
          ? { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: Number(conta.total), fator: 1 }
          : encargosDe(db, conta, data)
      const valor =
        body.valor === undefined || body.valor === '' ? enc.totalAtualizado : Number(body.valor)
      if (!valorMonetarioValido(valor))
        falhar(400, 'Informe um valor maior que zero, com até 2 casas decimais.')
      if (centavos(valor) > centavos(enc.totalAtualizado))
        falhar(400, 'O valor recebido não pode passar do valor da conta (com multa e juros).')
      let principal = valor
      if (enc.diasAtraso) {
        principal =
          centavos(valor) >= centavos(enc.totalAtualizado)
            ? Number(conta.total)
            : Math.min(centavos(conta.total), Math.round(centavos(valor) / enc.fator)) / 100
      }
      const extras = (centavos(valor) - centavos(principal)) / 100
      const somaEnc = centavos(enc.multa) + centavos(enc.juros)
      const multaPaga = somaEnc
        ? Math.round((centavos(extras) * centavos(enc.multa)) / somaEnc) / 100
        : 0
      const restante = (centavos(conta.total) - centavos(principal)) / 100
      usuarioOuFalha(db, body.idUsuario, 'Informe quem está recebendo (idUsuario).')
      const cli = db.clientes.find((c) => c.id === conta.idCliente)
      registrarNoCaixa(db, {
        dia: data,
        tipo: 'entrada',
        formaPagamento: body.formaPagamento,
        valor,
        descricao: `Recebimento: ${conta.idPedido ? `pedido nº ${conta.idPedido}` : conta.descricao}${cli ? ` (${cli.nome})` : ''}${restante > 0 ? ' — parcial' : ''}`,
        idPedido: conta.idPedido,
        idContaReceber: conta.id,
        idUsuario: Number(body.idUsuario),
      })
      Object.assign(conta, {
        total: principal.toFixed(2),
        valorMulta: multaPaga.toFixed(2),
        valorJuros: (extras - multaPaga).toFixed(2),
        diasAtraso: enc.diasAtraso,
        dataRecebimento: data,
        formaPagamento: body.formaPagamento,
      })
      if (restante > 0) {
        if (conta.idPedido) sincronizarContasPedidos(db)
        else {
          db.contasReceber.push({
            ...conta,
            id: proximo(db.contasReceber),
            total: restante.toFixed(2),
            dataRecebimento: null,
            formaPagamento: null,
            valorMulta: '0.00',
            valorJuros: '0.00',
            diasAtraso: 0,
          })
        }
      }
      return {
        ...conta,
        restante,
        encargos: { multa: multaPaga, juros: extras - multaPaga, valorPago: valor },
      }
    },
  ],
  [
    'post',
    '/contas-receber/:id/estornar',
    (db, p) => {
      const conta = contaOuFalha(tabela(db, 'contasReceber'), p.id, 'Conta a receber')
      if (!conta.dataRecebimento) falhar(409, 'Esta conta ainda não foi recebida.')
      removerDoCaixa(db, 'idContaReceber', conta.id)
      Object.assign(conta, {
        dataRecebimento: null,
        formaPagamento: null,
        valorMulta: '0.00',
        valorJuros: '0.00',
        diasAtraso: 0,
      })
      if (conta.idPedido) sincronizarContasPedidos(db)
      return { mensagem: 'Recebimento desfeito.' }
    },
  ],
  [
    'delete',
    '/contas-receber/:id',
    (db, p) => {
      const conta = contaOuFalha(tabela(db, 'contasReceber'), p.id, 'Conta a receber')
      if (conta.idPedido)
        falhar(
          409,
          'A conta de um pedido não pode ser excluída. Para não cobrar, cancele o pedido.',
        )
      if (conta.dataRecebimento)
        falhar(409, 'Conta já recebida não pode ser excluída (é histórico financeiro).')
      db.contasReceber = db.contasReceber.filter((c) => c !== conta)
      return { mensagem: 'Conta a receber excluída.' }
    },
  ],

  // ===== estoque (REQ017) =====
  [
    'post',
    '/estoque',
    (db, _p, body) => {
      const produto = db.produtos.find((x) => x.id === Number(body.idProduto))
      if (!produto) falhar(404, 'Produto não encontrado.')
      if (!produto.controlaEstoque) {
        falhar(
          400,
          'Este produto não está marcado como "controlaEstoque". Edite o produto antes de cadastrar o estoque dele.',
        )
      }
      if (db.estoque.some((e) => e.idProduto === produto.id)) {
        falhar(409, 'Este produto já possui um registro de estoque.')
      }
      const estoque = {
        id: proximoId('estoque'),
        idProduto: produto.id,
        estoqueAtual: 0,
        estoqueMinimo: body.estoqueMinimo ?? 0,
        estoqueMaximo: body.estoqueMaximo ?? null,
      }
      db.estoque.push(estoque)
      movimentar(db, estoque, Number(body.estoqueAtual) || 0, {
        tipo: 'entrada',
        motivo: 'Saldo inicial',
        idUsuario: body.idUsuario ?? null,
      })
      return [201, estoque]
    },
  ],
  [
    'put',
    '/estoque/:id',
    (db, p, body) => {
      const estoque = db.estoque.find((e) => e.id === Number(p.id))
      if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
      // como no Back: idProduto e estoqueAtual não mudam por aqui
      if (body.estoqueMinimo !== undefined) estoque.estoqueMinimo = body.estoqueMinimo
      if (body.estoqueMaximo !== undefined) estoque.estoqueMaximo = body.estoqueMaximo
      return estoque
    },
  ],
  [
    'delete',
    '/estoque/:id',
    (db, p) => {
      const id = Number(p.id)
      if (!db.estoque.some((e) => e.id === id)) falhar(404, 'Registro de estoque não encontrado.')
      db.estoque = db.estoque.filter((e) => e.id !== id)
      return { mensagem: 'Registro de estoque removido com sucesso.' }
    },
  ],

  [
    'post',
    '/estoque/:id/entrada',
    (db, p, body) => {
      const qtd = Number(body.quantidade)
      if (!Number.isInteger(qtd) || qtd <= 0 || qtd > 999999) {
        falhar(400, 'Informe uma quantidade de entrada inteira e maior que zero.')
      }
      const estoque = db.estoque.find((e) => e.id === Number(p.id))
      if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
      movimentar(db, estoque, qtd, {
        tipo: 'entrada',
        motivo: body.motivo?.trim() || 'Entrada de mercadoria',
        idUsuario: body.idUsuario ?? null,
      })
      return estoque
    },
  ],
  [
    'post',
    '/estoque/:id/saida',
    (db, p, body) => {
      const qtd = Number(body.quantidade)
      if (!Number.isInteger(qtd) || qtd <= 0 || qtd > 999999) {
        falhar(400, 'Informe uma quantidade de saída inteira e maior que zero.')
      }
      const estoque = db.estoque.find((e) => e.id === Number(p.id))
      if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
      if (estoque.estoqueAtual < qtd) {
        falhar(400, 'Saldo insuficiente.', { estoqueAtual: estoque.estoqueAtual })
      }
      movimentar(db, estoque, -qtd, {
        tipo: 'saida',
        motivo: body.motivo?.trim() || 'Saída manual',
        idUsuario: body.idUsuario ?? null,
      })
      return estoque
    },
  ],
  [
    'post',
    '/estoque/:id/ajuste',
    (db, p, body) => {
      const novo = Number(body.novoSaldo)
      const motivo = body.motivo?.trim()
      if (!Number.isInteger(novo) || novo < 0 || novo > 999999) {
        falhar(400, 'Informe o saldo contado (número inteiro, 0 ou mais).')
      }
      if (!motivo) falhar(400, 'Informe o motivo do ajuste (ex.: contagem do inventário).')
      const estoque = db.estoque.find((e) => e.id === Number(p.id))
      if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
      if (novo === estoque.estoqueAtual) {
        falhar(400, 'O saldo contado é igual ao saldo atual: não há o que ajustar.')
      }
      movimentar(db, estoque, novo - estoque.estoqueAtual, {
        tipo: 'ajuste',
        motivo,
        idUsuario: body.idUsuario ?? null,
      })
      return estoque
    },
  ],
  [
    'get',
    '/estoque/:id/movimentacoes',
    (db, p) => {
      const estoque = db.estoque.find((e) => e.id === Number(p.id))
      if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
      return tabela(db, 'movimentacoesEstoque')
        .filter((m) => m.idProduto === estoque.idProduto)
        .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
        .slice(0, 200)
        .map((m) => ({ ...m, usuario: operadorDe(db, m.idUsuario) }))
    },
  ],

  // ===== conferência de qualidade (SPV-96) =====
  [
    'get',
    '/pedidos/:id/conferencias',
    (db, p) =>
      tabela(db, 'conferencias')
        .filter((c) => c.idPedido === Number(p.id))
        .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
        .map((c) => ({ ...c, conferente: operadorDe(db, c.idUsuario) })),
  ],
  [
    'post',
    '/pedidos/:id/conferencias',
    (db, p, body) => {
      const idUsuario = Number(body.idUsuario)
      const motivo = body.motivo?.trim() || null
      if (!idUsuario) falhar(400, 'idUsuario (conferente) é obrigatório.')
      if (!['aprovado', 'devolvido'].includes(body.resultado)) {
        falhar(400, "resultado deve ser 'aprovado' ou 'devolvido'.")
      }
      if (body.resultado === 'devolvido' && !motivo) {
        falhar(400, 'Informe o motivo da devolução (o que precisa ser refeito).')
      }
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status !== 3) {
        falhar(400, 'Só dá para conferir pedidos que estão "Aguardando conferência".')
      }
      const lista = tabela(db, 'conferencias')
      const conferencia = {
        id: proximo(lista),
        idPedido: pedido.id,
        idUsuario,
        resultado: body.resultado,
        motivo,
        data: new Date().toISOString(),
      }
      lista.push(conferencia)
      pedido.status = body.resultado === 'aprovado' ? 4 : 2
      return [201, { conferencia, pedido }]
    },
  ],

  // ===== cadastro de serviços (REQ006) =====
  [
    'post',
    '/servicos',
    (db, _p, body) => {
      if (!body.nome || body.valor === undefined) falhar(400, 'Nome e valor são obrigatórios.')
      const servico = {
        id: proximoId('servicos'),
        nome: body.nome,
        descricao: body.descricao ?? null,
        valor: Number(body.valor).toFixed(2),
        duracaoEstimada: body.duracaoEstimada ?? null,
      }
      db.servicos.push(servico)
      return [201, servico]
    },
  ],
  [
    'put',
    '/servicos/:id',
    (db, p, body) => {
      const servico = db.servicos.find((x) => x.id === Number(p.id))
      if (!servico) falhar(404, 'Serviço não encontrado.')
      for (const campo of ['nome', 'descricao', 'duracaoEstimada']) {
        if (body[campo] !== undefined) servico[campo] = body[campo]
      }
      if (body.valor !== undefined) servico.valor = Number(body.valor).toFixed(2)
      return servico
    },
  ],
  [
    'delete',
    '/servicos/:id',
    (db, p) => {
      const id = Number(p.id)
      if (!db.servicos.some((x) => x.id === id)) falhar(404, 'Serviço não encontrado.')
      const usos = db.itensPedido.filter((i) => i.idServico === id).length
      if (usos > 0) {
        falhar(
          409,
          `Este serviço já foi usado em ${usos} item(ns) de pedido e não pode ser excluído. Você pode editar o nome ou o valor.`,
        )
      }
      db.servicos = db.servicos.filter((x) => x.id !== id)
      return { mensagem: 'Serviço removido com sucesso.' }
    },
  ],

  // ===== anexos dos pedidos (SPV-91) =====
  [
    'get',
    '/pedidos/:id/anexos',
    (db, p) =>
      tabela(db, 'anexosPedido')
        .filter((a) => a.idPedido === Number(p.id))
        .sort((a, b) => b.dataEnvio.localeCompare(a.dataEnvio))
        .map((a) => ({ ...a, usuario: operadorDe(db, a.idUsuario) })),
  ],
  [
    'post',
    '/pedidos/:id/anexos',
    async (db, p, body) => {
      const arquivos = body instanceof FormData ? body.getAll('arquivos') : []
      const idUsuario = Number(body instanceof FormData ? body.get('idUsuario') : 0)
      if (arquivos.length === 0) falhar(400, 'Escolha pelo menos um arquivo.')
      if (!idUsuario) falhar(400, 'idUsuario é obrigatório (quem está enviando).')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) {
        falhar(400, 'Não é possível anexar arquivos a um pedido cancelado.')
      }
      for (const f of arquivos) {
        if (!TIPOS_ANEXO.includes(f.type)) {
          falhar(
            400,
            `Tipo de arquivo não aceito: ${f.name}. Envie foto, PDF, Word, Excel ou texto.`,
          )
        }
        if (f.size > TAMANHO_MAXIMO_MOCK) {
          falhar(400, `No modo de teste cada arquivo pode ter no máximo 1 MB (${f.name}).`)
        }
      }
      const lista = tabela(db, 'anexosPedido')
      const criados = []
      for (const f of arquivos) {
        const anexo = {
          id: proximo(lista),
          idPedido: pedido.id,
          nomeOriginal: f.name,
          arquivo: `mock-${Date.now()}-${f.name}`,
          tipo: f.type,
          tamanho: f.size,
          dataEnvio: new Date().toISOString(),
          idUsuario,
          urlMock: await lerComoDataUrl(f),
        }
        lista.push(anexo)
        criados.push(anexo)
      }
      return [201, criados]
    },
  ],
  [
    'delete',
    '/anexos/:id',
    (db, p) => {
      const lista = tabela(db, 'anexosPedido')
      const anexo = lista.find((a) => a.id === Number(p.id))
      if (!anexo) falhar(404, 'Anexo não encontrado.')
      const pedido = db.pedidos.find((x) => x.id === anexo.idPedido)
      if (pedido?.status === STATUS_CANCELADO) {
        falhar(400, 'Pedido cancelado: os anexos ficam guardados como histórico.')
      }
      db.anexosPedido = lista.filter((a) => a.id !== anexo.id)
      return { mensagem: 'Anexo removido.' }
    },
  ],

  // ===== apontamentos de produção (SPV-93/94/95) =====
  [
    'get',
    '/pedidos/:id/apontamentos',
    (db, p) =>
      tabela(db, 'apontamentos')
        .filter((a) => a.idPedido === Number(p.id))
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map((a) => ({ ...a, operador: operadorDe(db, a.idUsuario) })),
  ],
  [
    'get',
    '/apontamentos',
    (db, _p, _b, query) =>
      tabela(db, 'apontamentos')
        .filter((a) => String(query.emAndamento) !== 'true' || !a.fim)
        .filter((a) => !query.idUsuario || a.idUsuario === Number(query.idUsuario))
        // SPV-103: período pela data (local) de início
        .filter((a) => !query.de || diaLocal(a.inicio) >= query.de)
        .filter((a) => !query.ate || diaLocal(a.inicio) <= query.ate)
        .sort((a, b) => b.inicio.localeCompare(a.inicio))
        .map((a) => {
          const pedido = db.pedidos.find((x) => x.id === a.idPedido)
          const cliente = pedido && db.clientes.find((c) => c.id === pedido.idCliente)
          return {
            ...a,
            operador: operadorDe(db, a.idUsuario),
            pedido: pedido && {
              id: pedido.id,
              descricao: pedido.descricao,
              status: pedido.status,
              dataEntregaPrevista: pedido.dataEntregaPrevista,
              idCliente: pedido.idCliente,
              cliente: cliente ? { id: cliente.id, nome: cliente.nome } : null,
            },
          }
        }),
  ],
  [
    'post',
    '/pedidos/:id/apontamentos',
    (db, p, body) => {
      const idUsuario = Number(body.idUsuario)
      if (!idUsuario) falhar(400, 'idUsuario (operador) é obrigatório.')
      const pedido = pedidoOuFalha(db, p.id)
      if (![1, 2].includes(pedido.status)) {
        falhar(400, 'Só dá para apontar produção em pedidos "Cadastrado" ou "Em produção".')
      }
      const operador = db.usuarios.find((u) => u.id === idUsuario)
      if (!operador || Number(operador.status) !== 1) {
        falhar(404, 'Operador não encontrado ou inativo.')
      }
      const lista = tabela(db, 'apontamentos')
      if (lista.some((a) => a.idPedido === pedido.id && a.idUsuario === idUsuario && !a.fim)) {
        falhar(409, 'Você já tem um apontamento em andamento neste pedido.')
      }
      if (pedido.status === 1) pedido.status = 2
      const apontamento = {
        id: proximo(lista),
        idPedido: pedido.id,
        idUsuario,
        inicio: new Date().toISOString(),
        fim: null,
        quantidadeProduzida: null,
        observacao: null,
      }
      lista.push(apontamento)
      return [201, apontamento]
    },
  ],
  [
    'put',
    '/apontamentos/:id/concluir',
    (db, p, body) => {
      const quantidade = Number(body.quantidadeProduzida)
      if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > 999999) {
        falhar(400, 'Informe a quantidade produzida (número inteiro, 0 ou mais).')
      }
      const apontamento = tabela(db, 'apontamentos').find((a) => a.id === Number(p.id))
      if (!apontamento) falhar(404, 'Apontamento não encontrado.')
      if (apontamento.fim) falhar(409, 'Este apontamento já foi concluído.')
      Object.assign(apontamento, {
        fim: new Date().toISOString(),
        quantidadeProduzida: quantidade,
        observacao: body.observacao?.trim() || null,
      })
      return apontamento
    },
  ],
  [
    'delete',
    '/apontamentos/:id',
    (db, p) => {
      const lista = tabela(db, 'apontamentos')
      const apontamento = lista.find((a) => a.id === Number(p.id))
      if (!apontamento) falhar(404, 'Apontamento não encontrado.')
      if (apontamento.fim) {
        falhar(400, 'Apontamento concluído não pode ser apagado (é histórico de produção).')
      }
      db.apontamentos = lista.filter((a) => a.id !== apontamento.id)
      return { mensagem: 'Apontamento cancelado.' }
    },
  ],

  // ===== pedidos =====
  [
    'post',
    '/pedidos',
    (db, _p, body) => {
      if (!body.idCliente || !body.idVendedor)
        falhar(400, 'idCliente e idVendedor são obrigatórios.')
      if (!db.usuarios.some((u) => u.id === Number(body.idVendedor))) {
        falhar(404, 'Vendedor (usuário) não encontrado.')
      }
      // SPV-118: cliente com conta vencida só com liberação de quem acessa "Contas a receber"
      const devendo = inadimplentesDe(db).get(Number(body.idCliente))
      let liberacao = {}
      if (devendo) {
        if (!body.liberacao) {
          falhar(
            409,
            `Cliente com ${devendo.contas.length} conta(s) vencida(s) (R$ ${devendo.totalVencido.toFixed(2).replace('.', ',')}). Novo pedido bloqueado até o pagamento ou liberação do financeiro.`,
            {
              codigo: 'CLIENTE_INADIMPLENTE',
              totalVencido: devendo.totalVencido,
              contas: devendo.contas,
            },
          )
        }
        const motivo = String(body.liberacao.motivo ?? '').trim()
        if (motivo.length < 5) falhar(400, 'Explique o motivo da liberação (pelo menos 5 letras).')
        const pode = db.usuarioTela.some(
          (t) =>
            t.idUsuario === Number(body.liberacao.idUsuario) &&
            t.tela === 'contas-receber' &&
            t.podeAcessar,
        )
        if (!pode)
          falhar(
            403,
            'Só quem tem acesso a "Contas a receber" pode liberar pedido para cliente devendo.',
          )
        liberacao = { idLiberadoPor: Number(body.liberacao.idUsuario), motivoLiberacao: motivo }
      }
      const pedido = {
        ...liberacao,
        dataCriacao: new Date().toISOString(),
        id: proximoId('pedidos'),
        descricao: body.descricao ?? null,
        idCliente: Number(body.idCliente),
        idVendedor: Number(body.idVendedor),
        dataEntregaPrevista: body.dataEntregaPrevista
          ? new Date(`${body.dataEntregaPrevista}T03:00:00.000Z`).toISOString()
          : null,
        anexo: body.anexo ?? null,
        status: 1,
        total: '0.00',
        dataEntregaRealizada: null,
      }
      db.pedidos.push(pedido)
      return [201, pedido]
    },
  ],
  [
    'get',
    '/pedidos',
    (db, _p, _b, query) =>
      db.pedidos
        .filter((p) => !query.status || p.status === Number(query.status))
        .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
        .map((p) => ({ ...p, vendedor: vendedorDe(db, p) })),
  ],
  [
    'get',
    '/pedidos/:id',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      const liberou = pedido.idLiberadoPor
        ? db.usuarios.find((u) => u.id === pedido.idLiberadoPor)
        : null
      return {
        ...pedido,
        vendedor: vendedorDe(db, pedido),
        liberadoPor: liberou ? { id: liberou.id, nome: liberou.nome } : null,
        descontoPor: pedido.idDescontoPor ? operadorDe(db, pedido.idDescontoPor) : null,
        itens: db.itensPedido
          .filter((i) => i.idPedido === pedido.id)
          .map((i) => itemCompleto(db, i)),
      }
    },
  ],
  [
    'put',
    '/pedidos/:id',
    (db, p, body) => {
      if (!body || Object.keys(body).length === 0)
        falhar(400, 'Envie ao menos um campo para atualizar.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível editar um pedido cancelado.')
      // status e total têm rotas/cálculo próprios, igual ao Back
      const campos = { ...body }
      for (const c of [
        'status',
        'total',
        'subtotal',
        'descontoTipo',
        'descontoInformado',
        'valorDesconto',
        'motivoDesconto',
        'idDescontoPor',
      ])
        delete campos[c]
      if (campos.dataEntregaPrevista) {
        campos.dataEntregaPrevista = new Date(
          `${campos.dataEntregaPrevista.slice(0, 10)}T03:00:00.000Z`,
        ).toISOString()
      }
      Object.assign(pedido, campos)
      return pedido
    },
  ],
  // SPV-73 — desconto no pedido (mesmas regras do pedidosControllers.aplicarDesconto)
  [
    'put',
    '/pedidos/:id/desconto',
    (db, p, body) => {
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status >= STATUS_FINALIZADO)
        falhar(409, 'Pedido finalizado ou cancelado não pode receber desconto.')
      usuarioOuFalha(db, body.idUsuario, 'Informe quem está dando o desconto (idUsuario).')
      const tipo = body.tipo || null
      const subtotal = Number(pedido.subtotal ?? pedido.total)
      const antes = { ...pedido }
      if (!tipo) {
        Object.assign(pedido, {
          descontoTipo: null,
          descontoInformado: '0.00',
          motivoDesconto: null,
          idDescontoPor: null,
        })
      } else {
        if (!['valor', 'percentual'].includes(tipo))
          falhar(400, "Tipo de desconto inválido: use 'valor' (R$) ou 'percentual' (%).")
        const valor = Number(body.valor)
        if (!valorMonetarioValido(valor))
          falhar(400, 'Informe um desconto maior que zero, com até 2 casas decimais.')
        if (tipo === 'percentual' && valor > 100) falhar(400, 'O desconto em % vai de 0,01 a 100.')
        if (tipo === 'valor' && valor > subtotal)
          falhar(400, 'O desconto não pode passar do valor dos itens.')
        const motivo = String(body.motivo ?? '').trim()
        if (motivo.length < 3) falhar(400, 'Informe o motivo do desconto.')
        Object.assign(pedido, {
          descontoTipo: tipo,
          descontoInformado: valor.toFixed(2),
          motivoDesconto: motivo,
          idDescontoPor: Number(body.idUsuario),
        })
      }
      aplicarTotais(pedido, subtotal)
      const recebido = tabela(db, 'contasReceber')
        .filter((c) => c.idPedido === pedido.id && c.dataRecebimento)
        .reduce((s, c) => s + centavos(c.total), 0)
      if (centavos(pedido.total) < recebido) {
        Object.assign(pedido, antes)
        falhar(
          409,
          'O cliente já pagou mais do que esse total: o desconto não pode ser tão grande.',
        )
      }
      sincronizarContasPedidos(db)
      return pedido
    },
  ],
  [
    'put',
    '/pedidos/:id/status',
    (db, p, body) => {
      if (![1, 2, 3, 4, 5, 6].includes(body.status))
        falhar(400, 'Status inválido. Use um valor de 1 a 6.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) {
        falhar(400, 'Não é possível alterar o status de um pedido cancelado.')
      }
      if (pedido.status === 3 && (body.status === 4 || body.status === 2)) {
        falhar(
          400,
          'Para aprovar ou devolver, registre a conferência (POST /pedidos/:id/conferencias).',
        )
      }
      if (body.status >= 3 && body.status !== STATUS_CANCELADO) {
        const abertos = tabela(db, 'apontamentos').filter(
          (a) => a.idPedido === pedido.id && !a.fim,
        ).length
        if (abertos > 0) {
          falhar(
            400,
            `Há ${abertos} apontamento(s) de produção em andamento neste pedido. Conclua antes de avançar.`,
          )
        }
      }
      pedido.status = body.status
      if (body.status === STATUS_FINALIZADO) pedido.dataEntregaRealizada = new Date().toISOString()
      return pedido
    },
  ],
  [
    'delete',
    '/pedidos/:id',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) falhar(400, 'Este pedido já está cancelado.')
      for (const item of db.itensPedido.filter(
        (i) => i.idPedido === pedido.id && i.tipoItem === 'produto',
      )) {
        const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
        if (estoque) {
          movimentar(db, estoque, item.quantidade, {
            tipo: 'devolucao',
            motivo: `Pedido nº ${pedido.id} cancelado`,
            idPedido: pedido.id,
          })
        }
      }
      for (const a of tabela(db, 'apontamentos').filter(
        (x) => x.idPedido === pedido.id && !x.fim,
      )) {
        Object.assign(a, {
          fim: new Date().toISOString(),
          quantidadeProduzida: 0,
          observacao: 'Encerrado: pedido cancelado',
        })
      }
      pedido.status = STATUS_CANCELADO
      return { mensagem: 'Pedido cancelado com sucesso.', pedido }
    },
  ],

  // ===== itens do pedido =====
  [
    'post',
    '/pedidos/:id/itens',
    (db, p, body) => {
      const { tipoItem, idProduto, idServico, quantidade } = body
      if (!['produto', 'servico'].includes(tipoItem))
        falhar(400, "tipoItem deve ser 'produto' ou 'servico'.")
      if (!quantidade || quantidade <= 0) falhar(400, 'Informe uma quantidade maior que zero.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO) {
        falhar(400, 'Não é possível adicionar itens a um pedido cancelado.')
      }

      let valorUnitario
      if (tipoItem === 'produto') {
        if (!idProduto) falhar(400, 'idProduto é obrigatório para tipoItem "produto".')
        const produto = db.produtos.find((x) => x.id === Number(idProduto))
        if (!produto) falhar(404, 'Produto não encontrado.')
        valorUnitario = produto.valor
        if (produto.controlaEstoque) {
          const estoque = db.estoque.find((e) => e.idProduto === produto.id)
          if (!estoque) {
            falhar(
              400,
              'Este produto controla estoque, mas não tem registro de estoque cadastrado.',
            )
          }
          if (estoque.estoqueAtual < quantidade) {
            falhar(400, 'Saldo insuficiente em estoque.', { estoqueAtual: estoque.estoqueAtual })
          }
          movimentar(db, estoque, -quantidade, {
            tipo: 'venda',
            motivo: `Item adicionado ao pedido nº ${pedido.id}`,
            idPedido: pedido.id,
          })
        }
      } else {
        if (!idServico) falhar(400, 'idServico é obrigatório para tipoItem "servico".')
        const servico = db.servicos.find((x) => x.id === Number(idServico))
        if (!servico) falhar(404, 'Serviço não encontrado.')
        valorUnitario = servico.valor
      }

      const item = {
        id: proximoId('itensPedido'),
        idPedido: pedido.id,
        tipoItem,
        idProduto: tipoItem === 'produto' ? Number(idProduto) : null,
        idServico: tipoItem === 'servico' ? Number(idServico) : null,
        quantidade,
        valorUnitario,
      }
      db.itensPedido.push(item)
      return [201, { item, pedido: recalcularTotal(db, pedido.id) }]
    },
  ],
  [
    'put',
    '/pedidos/:id/itens/:itemId',
    (db, p, body) => {
      const { quantidade } = body
      if (!quantidade || quantidade <= 0) falhar(400, 'Informe uma quantidade maior que zero.')
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível editar itens de um pedido cancelado.')
      const item = db.itensPedido.find((i) => i.id === Number(p.itemId) && i.idPedido === pedido.id)
      if (!item) falhar(404, 'Item não encontrado neste pedido.')

      const diferenca = quantidade - item.quantidade
      if (item.tipoItem === 'produto' && diferenca !== 0) {
        const produto = db.produtos.find((x) => x.id === item.idProduto)
        if (produto?.controlaEstoque) {
          const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
          if (!estoque) falhar(400, 'Registro de estoque não encontrado para este produto.')
          if (diferenca > 0 && estoque.estoqueAtual < diferenca) {
            falhar(400, 'Saldo insuficiente em estoque.', { estoqueAtual: estoque.estoqueAtual })
          }
          movimentar(db, estoque, -diferenca, {
            tipo: diferenca > 0 ? 'venda' : 'devolucao',
            motivo: `Quantidade alterada no pedido nº ${pedido.id}`,
            idPedido: pedido.id,
          })
        }
      }
      item.quantidade = quantidade
      return { item, pedido: recalcularTotal(db, pedido.id) }
    },
  ],
  [
    'delete',
    '/pedidos/:id/itens/:itemId',
    (db, p) => {
      const pedido = pedidoOuFalha(db, p.id)
      if (pedido.status === STATUS_CANCELADO)
        falhar(400, 'Não é possível remover itens de um pedido cancelado.')
      const indice = db.itensPedido.findIndex(
        (i) => i.id === Number(p.itemId) && i.idPedido === pedido.id,
      )
      if (indice < 0) falhar(404, 'Item não encontrado neste pedido.')
      const [item] = db.itensPedido.splice(indice, 1)
      if (item.tipoItem === 'produto') {
        const produto = db.produtos.find((x) => x.id === item.idProduto)
        const estoque = db.estoque.find((e) => e.idProduto === item.idProduto)
        if (produto?.controlaEstoque && estoque) {
          movimentar(db, estoque, item.quantidade, {
            tipo: 'devolucao',
            motivo: `Item removido do pedido nº ${pedido.id}`,
            idPedido: pedido.id,
          })
        }
      }
      return { mensagem: 'Item removido com sucesso.', pedido: recalcularTotal(db, pedido.id) }
    },
  ],
]

// Transforma "/pedidos/:id/itens" em uma expressão regular com grupos nomeados
const compiladas = rotas.map(([metodo, caminho, acao]) => ({
  metodo,
  regex: new RegExp(`^${caminho.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
  acao,
}))

// Adapter do axios: em vez de fazer HTTP, resolve a requisição aqui mesmo

// ===== SPV-111: registro de logs no modo de teste (versão resumida do utils/logs.js do Back) =====
const NOMES_STATUS = {
  1: 'Cadastrado',
  2: 'Em produção',
  3: 'Aguardando conferência',
  4: 'Aguardando cliente',
  5: 'Finalizado (entregue)',
  6: 'Cancelado',
}
const REGRAS_LOG = [
  [
    'post',
    /^\/pedidos$/,
    'pedidos',
    'pedido_criado',
    'pedido',
    (m, b, r) => [`Criou o pedido nº ${r.id}`, r.id],
  ],
  [
    'put',
    /^\/pedidos\/(\d+)\/status$/,
    (b) => ([2, 3].includes(b.status) ? 'producao' : 'pedidos'),
    'pedido_status',
    'pedido',
    (m, b) => [`Pedido nº ${m[1]}: status mudou para "${NOMES_STATUS[b.status]}"`],
  ],
  [
    'put',
    /^\/pedidos\/(\d+)\/desconto$/,
    'pedidos',
    'pedido_desconto',
    'pedido',
    (m, b, r) => [
      b.tipo
        ? `Deu desconto de ${b.tipo === 'percentual' ? `${b.valor}%` : `R$ ${b.valor}`} no pedido nº ${m[1]} (${b.motivo}). Novo total: R$ ${Number(r.total).toFixed(2).replace('.', ',')}`
        : `Tirou o desconto do pedido nº ${m[1]}`,
    ],
  ],
  [
    'delete',
    /^\/pedidos\/(\d+)$/,
    'pedidos',
    'pedido_cancelado',
    'pedido',
    (m) => [`Cancelou o pedido nº ${m[1]}`],
  ],
  [
    'post',
    /^\/pedidos\/(\d+)\/itens$/,
    'pedidos',
    'item_adicionado',
    'pedido',
    (m) => [`Adicionou item ao pedido nº ${m[1]}`],
  ],
  [
    'post',
    /^\/pedidos\/(\d+)\/apontamentos$/,
    'producao',
    'producao_iniciada',
    'pedido',
    (m) => [`Iniciou a produção do pedido nº ${m[1]}`],
  ],
  [
    'put',
    /^\/apontamentos\/(\d+)\/concluir$/,
    'producao',
    'producao_concluida',
    'apontamento',
    (m, b) => [`Concluiu o apontamento nº ${m[1]} (${b.quantidadeProduzida ?? 0} peça(s))`],
  ],
  [
    'post',
    /^\/pedidos\/(\d+)\/conferencias$/,
    'producao',
    'conferencia',
    'pedido',
    (m, b) => [`Conferência do pedido nº ${m[1]}: ${b.resultado}`],
  ],
  [
    'post',
    /^\/contas-pagar\/(\d+)\/pagar$/,
    'financeiro',
    'conta_paga',
    'conta_pagar',
    (m, b, r) => [`Pagou a conta nº ${m[1]} "${r.descricao}"`],
  ],
  [
    'post',
    /^\/contas-receber\/(\d+)\/receber$/,
    'financeiro',
    'conta_recebida',
    'conta_receber',
    (m, b, r) => [
      `Recebeu R$ ${Number(r.encargos?.valorPago ?? r.total)
        .toFixed(2)
        .replace('.', ',')} da conta nº ${m[1]}`,
    ],
  ],
  [
    'post',
    /^\/caixa$/,
    'financeiro',
    'caixa_lancamento',
    'caixa',
    (m, b) => [
      `Lançou ${b.tipo === 'saida' ? 'saída' : 'entrada'} de R$ ${Number(b.valor).toFixed(2).replace('.', ',')} no caixa (${b.descricao})`,
    ],
  ],
  [
    'post',
    /^\/caixa\/fechar$/,
    'financeiro',
    'caixa_fechado',
    'fechamento_caixa',
    (m, b) => [
      `Fechou o caixa de ${String(b.data ?? '')
        .split('-')
        .reverse()
        .join('/')}`,
    ],
  ],
  [
    'post',
    /^\/contas-(pagar|receber)$/,
    'financeiro',
    'conta_criada',
    'conta',
    (m, b, r) => [`Cadastrou conta a ${m[1]} "${b.descricao}"`, r.id],
  ],
]

function registrarLogMock(db, { metodo, caminho, corpo, resposta, idUsuario, log }) {
  let dados = log
  if (!dados) {
    const regra = REGRAS_LOG.find(([mt, rx]) => mt === metodo && rx.test(caminho))
    const m = regra ? caminho.match(regra[1]) : []
    const [descricao, idEntidade] = regra
      ? regra[5](m, corpo || {}, resposta || {})
      : [`${metodo.toUpperCase()} ${caminho}`]
    dados = regra
      ? {
          modulo: typeof regra[2] === 'function' ? regra[2](corpo || {}) : regra[2],
          acao: regra[3],
          entidade: regra[4],
          descricao,
          idEntidade: Number(idEntidade ?? m[1]),
        }
      : { modulo: 'sistema', acao: 'operacao', descricao }
  }
  const id = dados.idUsuario !== undefined ? dados.idUsuario : idUsuario
  const usuario = id ? db.usuarios.find((u) => u.id === Number(id)) : null
  const logs = tabela(db, 'logs')
  logs.push({
    id: proximo(logs),
    dataHora: new Date().toISOString(),
    idUsuario: usuario?.id ?? null,
    usuarioNome: usuario?.nome ?? null,
    entidade: null,
    idEntidade: null,
    ip: '127.0.0.1',
    detalhes: null,
    ...dados,
  })
}

export async function fakeBackend(config) {
  await new Promise((r) => setTimeout(r, ATRASO_MS))

  const metodo = (config.method || 'get').toLowerCase()
  const [caminho, queryString] = (config.url || '').split('?')
  const query = {
    ...Object.fromEntries(new URLSearchParams(queryString || '')),
    ...(config.params || {}),
  }
  Object.keys(query).forEach((k) => query[k] === undefined && delete query[k])
  const corpo =
    config.data instanceof FormData
      ? config.data
      : typeof config.data === 'string'
        ? JSON.parse(config.data || '{}')
        : config.data || {}

  const resposta = (status, data) => ({
    data: copia(data),
    status,
    statusText: String(status),
    headers: { 'content-type': 'application/json' },
    config,
    request: {},
  })

  const rota = compiladas.find((r) => r.metodo === metodo && r.regex.test(caminho))
  if (!rota) {
    const res = resposta(404, {
      erro: `Rota ${metodo.toUpperCase()} ${caminho} não existe no mock.`,
    })
    throw new AxiosError(`Request failed with status code 404`, 'ERR_BAD_REQUEST', config, {}, res)
  }

  try {
    const db = obterBanco()
    const params = caminho.match(rota.regex).groups || {}
    const resultado = await rota.acao(db, params, corpo, query)
    if (metodo !== 'get') {
      const idUsuario =
        config.headers?.get?.('X-Usuario-Id') ?? config.headers?.['X-Usuario-Id'] ?? null
      const dadosResp =
        Array.isArray(resultado) && typeof resultado[0] === 'number' ? resultado[1] : resultado
      if (caminho === '/login') {
        registrarLogMock(db, {
          log: {
            modulo: 'acesso',
            acao: 'login',
            descricao: `Entrou no sistema (${dadosResp.login})`,
            idUsuario: dadosResp.id,
          },
        })
      } else if (caminho === '/login/sair') {
        // registrado pela própria rota
      } else {
        registrarLogMock(db, { metodo, caminho, corpo, resposta: dadosResp, idUsuario })
      }
      persistir()
    }
    const [status, data] =
      Array.isArray(resultado) && typeof resultado[0] === 'number' ? resultado : [200, resultado]
    return resposta(status, data)
  } catch (erro) {
    if (!(erro instanceof ErroHttp)) throw erro
    if (caminho === '/login' && metodo === 'post') {
      const db = obterBanco()
      const u = db.usuarios.find(
        (x) =>
          x.login ===
          String(corpo.login || '')
            .trim()
            .toLowerCase(),
      )
      registrarLogMock(db, {
        log: {
          modulo: 'acesso',
          acao: erro.status === 403 ? 'login_bloqueado' : 'login_falhou',
          descricao: `Tentativa de login falhou para o usuário "${String(corpo.login || '').slice(0, 50)}" (${u ? (erro.status === 403 ? 'usuário inativo' : 'senha errada') : 'usuário não existe'})`,
          idUsuario: u?.id ?? null,
        },
      })
      persistir()
    }
    const res = resposta(erro.status, erro.corpo)
    const codigo = erro.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST'
    throw new AxiosError(`Request failed with status code ${erro.status}`, codigo, config, {}, res)
  }
}
