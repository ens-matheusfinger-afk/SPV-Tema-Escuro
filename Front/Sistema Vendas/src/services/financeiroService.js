import api from './api'
import { hojeISO } from '../utils/formatters'
import { somarDias } from '../utils/validacoes'

/*
 * Financeiro — contas a pagar (SPV-86) e a receber (SPV-85).
 * Paga/recebida = tem data de pagamento/recebimento. Em aberto = sem.
 * As contas a receber de pedidos são criadas e atualizadas sozinhas pelo banco
 * (trigger trg_pedidos_conta_receber): valor = total do pedido - o que já foi recebido.
 */

export const FORMAS_PAGAMENTO = {
  dinheiro: { nome: 'Dinheiro', icone: 'bi-cash' },
  pix: { nome: 'PIX', icone: 'bi-qr-code' },
  cartao: { nome: 'Cartão', icone: 'bi-credit-card' },
  boleto: { nome: 'Boleto', icone: 'bi-upc' },
  transferencia: { nome: 'Transferência', icone: 'bi-bank' },
}

// Recebimento só nas formas que o caixa aceita (dinheiro, PIX, cartão)
export const FORMAS_RECEBIMENTO = ['dinheiro', 'pix', 'cartao']
export const FORMAS_DE_PAGAR = ['pix', 'boleto', 'transferencia', 'dinheiro', 'cartao']

export const CATEGORIAS_PAGAR = [
  'Aluguel',
  'Matéria-prima',
  'Fornecedores',
  'Energia e água',
  'Internet e telefone',
  'Salários',
  'Impostos',
  'Manutenção',
  'Outros',
]

// SPV-98: conta a pagar que vence em até 3 dias já entra no alerta
export const DIAS_ALERTA_VENCIMENTO = 3
// SPV-99/100: previsão da tela principal
export const DIAS_PREVISAO = 15

// Dias entre hoje e o vencimento (negativo = vencida há X dias)
export function diasAteVencimento(vencimento, hoje = hojeISO()) {
  if (!vencimento) return null
  const [a1, m1, d1] = hoje.split('-').map(Number)
  const [a2, m2, d2] = vencimento.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

/*
 * Situação para mostrar e filtrar:
 *   quitada | vencida | vence-hoje | vence-logo (até 3 dias) | a-vencer | sem-vencimento
 *   pedido-atrasado: conta de pedido ainda NÃO entregue com a data de entrega vencida
 *   (quem está atrasado é a empresa, não o cliente — não conta como inadimplência)
 */
export function situacaoConta(conta, hoje = hojeISO()) {
  if (conta.quitada) return 'quitada'
  const dias = diasAteVencimento(conta.vencimento, hoje)
  if (dias === null) return 'sem-vencimento'
  if (dias < 0) {
    const pedidoNaoEntregue = conta.pedido && conta.pedido.status < 5
    return pedidoNaoEntregue ? 'pedido-atrasado' : 'vencida'
  }
  if (dias === 0) return 'vence-hoje'
  if (dias <= DIAS_ALERTA_VENCIMENTO) return 'vence-logo'
  return 'a-vencer'
}

// Em aberto e vencendo entre hoje e daqui a N dias (inclusive)
export const venceAte = (conta, dias, hoje = hojeISO()) =>
  !conta.quitada &&
  Boolean(conta.vencimento) &&
  conta.vencimento >= hoje &&
  conta.vencimento <= somarDias(hoje, dias)

export const somaValores = (contas) => contas.reduce((s, c) => s + c.valor, 0)

/*
 * SPV-73 — multa e juros de conta a receber paga com atraso (mesma regra do Back, utils/encargos.js):
 * multa de 2% + juros de 1% ao mês proporcional aos dias. Só para conta vencida de verdade
 * (avulsa ou de pedido já entregue); pedido não entregue com entrega vencida não tem multa.
 */
export const MULTA_PERCENTUAL = 2
export const JUROS_MES_PERCENTUAL = 1

export function encargosConta(conta, dia = hojeISO()) {
  const valor = Math.round(conta.valor * 100)
  const dias = conta.vencimento ? diasAteVencimento(dia, conta.vencimento) : 0
  const doCliente = !conta.pedido || conta.pedido.status === 5
  if (conta.quitada || dias <= 0 || !doCliente) {
    return { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: conta.valor, fator: 1 }
  }
  const multa = Math.round((valor * MULTA_PERCENTUAL) / 100)
  const juros = Math.round((valor * JUROS_MES_PERCENTUAL * dias) / 3000)
  return {
    diasAtraso: dias,
    multa: multa / 100,
    juros: juros / 100,
    totalAtualizado: (valor + multa + juros) / 100,
    fator: 1 + MULTA_PERCENTUAL / 100 + (JUROS_MES_PERCENTUAL / 100) * (dias / 30),
  }
}

// Quanto de um pagamento abate o valor da conta (o resto é multa e juros)
export function principalDoPagamento(conta, encargos, valorPago) {
  const pago = Math.round(valorPago * 100)
  if (!encargos.diasAtraso) return pago / 100
  if (pago >= Math.round(encargos.totalAtualizado * 100)) return conta.valor
  return Math.min(Math.round(conta.valor * 100), Math.round(pago / encargos.fator)) / 100
}

// ---------- contas a pagar (SPV-86) ----------

function montarPagar(c) {
  return {
    id: c.id,
    descricao: c.descricao ?? '',
    categoria: c.tipo ?? '',
    fornecedor: c.fornecedor ?? '',
    valor: Number(c.valor),
    vencimento: c.dataVencimento ?? null,
    criadaEm: c.dataCriacao ?? null,
    pagamento: c.dataPagamento ?? null,
    forma: c.formaPagamento ?? null,
    quitada: Boolean(c.dataPagamento),
  }
}

export async function listarContasPagar() {
  const { data } = await api.get('/contas-pagar')
  return data.map(montarPagar)
}

const corpoPagar = (v) => ({
  descricao: v.descricao.trim(),
  tipo: v.categoria.trim(),
  fornecedor: v.fornecedor.trim(),
  valor: Number(v.valor),
  dataVencimento: v.vencimento,
})

export async function criarContaPagar(valores) {
  await api.post('/contas-pagar', corpoPagar(valores))
}

export async function atualizarContaPagar(id, valores) {
  await api.put(`/contas-pagar/${id}`, corpoPagar(valores))
}

// O pagamento também sai do caixa do dia (SPV-97)
export async function pagarConta(id, { data, forma, idUsuario }) {
  await api.post(`/contas-pagar/${id}/pagar`, {
    dataPagamento: data,
    formaPagamento: forma,
    idUsuario,
  })
}

export async function estornarPagamento(id) {
  await api.post(`/contas-pagar/${id}/estornar`)
}

export async function excluirContaPagar(id) {
  await api.delete(`/contas-pagar/${id}`)
}

// SPV-98: aviso no menu (vencidas + vencendo em até 3 dias)
export async function contarAlertasPagar() {
  const contas = await listarContasPagar()
  const hoje = hojeISO()
  return contas.filter((c) =>
    ['vencida', 'vence-hoje', 'vence-logo'].includes(situacaoConta(c, hoje)),
  ).length
}

// ---------- contas a receber (SPV-85) ----------

function montarReceber(c) {
  return {
    id: c.id,
    idPedido: c.idPedido ?? null,
    pedido: c.pedido
      ? { id: c.pedido.id, descricao: c.pedido.descricao ?? '', status: Number(c.pedido.status) }
      : null,
    idCliente: c.idCliente ?? null,
    cliente: c.cliente
      ? {
          id: c.cliente.id,
          nome: c.cliente.nome,
          telefone: c.cliente.telefone ?? '',
          fatorConfianca: Number(c.cliente.fatorConfianca ?? 3),
        }
      : null,
    descricao: c.descricao ?? (c.idPedido ? `Pedido nº ${c.idPedido}` : ''),
    valor: Number(c.total),
    vencimento: c.dataPrevisao ?? null,
    criadaEm: c.dataCriacao ?? null,
    recebimento: c.dataRecebimento ?? null,
    forma: c.formaPagamento ?? null,
    quitada: Boolean(c.dataRecebimento),
    // SPV-73: multa e juros pagos junto (conta recebida com atraso)
    multa: Number(c.valorMulta ?? 0),
    juros: Number(c.valorJuros ?? 0),
    diasAtraso: Number(c.diasAtraso ?? 0),
  }
}

export async function listarContasReceber() {
  const { data } = await api.get('/contas-receber')
  return data.map(montarReceber)
}

const corpoReceber = (v) => ({
  idCliente: Number(v.idCliente),
  descricao: v.descricao.trim(),
  total: Number(v.valor),
  dataPrevisao: v.vencimento,
})

export async function criarContaReceber(valores) {
  await api.post('/contas-receber', corpoReceber(valores))
}

export async function atualizarContaReceber(id, valores) {
  await api.put(`/contas-receber/${id}`, corpoReceber(valores))
}

// valor menor que o da conta = recebimento parcial (o restante continua em aberto).
// O valor recebido também entra no caixa do dia, na forma usada (SPV-97).
// SPV-73: conta vencida recebe com multa e juros; cobrarEncargos = false dispensa.
export async function receberConta(id, { data, forma, valor, idUsuario, cobrarEncargos = true }) {
  const { data: resposta } = await api.post(`/contas-receber/${id}/receber`, {
    dataRecebimento: data,
    formaPagamento: forma,
    valor,
    idUsuario,
    cobrarEncargos,
  })
  const enc = resposta.encargos ?? {}
  return {
    restante: Number(resposta.restante ?? 0),
    encargos: Number(enc.multa ?? 0) + Number(enc.juros ?? 0),
  }
}

export async function estornarRecebimento(id) {
  await api.post(`/contas-receber/${id}/estornar`)
}

export async function excluirContaReceber(id) {
  await api.delete(`/contas-receber/${id}`)
}
