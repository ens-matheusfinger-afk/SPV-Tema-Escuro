import { STATUS_ABERTOS } from '../../utils/constants'
import { diaParaInput, estaAtrasado, hojeISO, normalizarBusca } from '../../utils/formatters'

export function pedidoAtrasado(pedido) {
  return STATUS_ABERTOS.includes(pedido.status) && estaAtrasado(pedido.dataEntregaPrevista)
}

// A partir de quanto % do prazo já consumido o pedido entra em "atenção"
export const PERCENTUAL_ATENCAO = 75

const UM_DIA = 24 * 60 * 60 * 1000

// "AAAA-MM-DD" -> número de dias (para subtrair datas sem erro de fuso)
function diaComoNumero(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return Date.UTC(ano, mes - 1, dia) / UM_DIA
}

// Dia local da data de criação (ela tem hora, diferente da data de entrega)
function diaLocal(valor) {
  const d = new Date(valor)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const plural = (n, palavra) => `${n} ${palavra}${n === 1 ? '' : 's'}`

/*
 * SPV-115 — alerta proporcional ao prazo do pedido.
 * Compara quanto do prazo (da criação até a entrega prevista) já passou:
 *   atrasado -> a data de entrega já passou
 *   hoje     -> vence hoje
 *   atencao  -> vence amanhã ou já consumiu PERCENTUAL_ATENCAO% do prazo
 *   ok       -> dentro do prazo, com folga
 * Devolve null para pedidos sem data de entrega ou já fechados (finalizado/cancelado).
 */
export function situacaoPrazo(pedido, hoje = hojeISO()) {
  if (!pedido?.dataEntregaPrevista || !STATUS_ABERTOS.includes(pedido.status)) return null

  const entrega = diaComoNumero(diaParaInput(pedido.dataEntregaPrevista))
  const agora = diaComoNumero(hoje)
  const criacao = pedido.dataCriacao ? diaComoNumero(diaLocal(pedido.dataCriacao)) : agora

  const diasRestantes = entrega - agora
  const prazoTotal = entrega - criacao
  const consumido = prazoTotal > 0 ? ((agora - criacao) / prazoTotal) * 100 : 100
  const percentual = Math.round(Math.min(100, Math.max(0, consumido)))

  if (diasRestantes < 0) {
    const atraso = -diasRestantes
    return {
      nivel: 'atrasado',
      percentual: 100,
      diasRestantes,
      texto: `Atrasado há ${plural(atraso, 'dia')}`,
      titulo: `A entrega estava prevista para ${plural(atraso, 'dia')} atrás`,
    }
  }
  if (diasRestantes === 0) {
    return {
      nivel: 'hoje',
      percentual: 100,
      diasRestantes,
      texto: 'Vence hoje',
      titulo: 'A entrega está prevista para hoje',
    }
  }

  const atencao = diasRestantes === 1 || percentual >= PERCENTUAL_ATENCAO
  return {
    nivel: atencao ? 'atencao' : 'ok',
    percentual,
    diasRestantes,
    texto: diasRestantes === 1 ? 'Vence amanhã' : `Vence em ${plural(diasRestantes, 'dia')}`,
    titulo: `${percentual}% do prazo já passou`,
  }
}

// Pedido que vence hoje ou está em atenção (usado no contador "Vencendo")
export function pedidoVencendo(pedido) {
  const prazo = situacaoPrazo(pedido)
  return prazo?.nivel === 'hoje' || prazo?.nivel === 'atencao'
}

/*
 * busca: nº do pedido, nome do cliente, documento ou descrição
 * status: número do status, '' (todos), 'atrasados' ou 'vencendo'
 */
export function filtrarPedidos(pedidos, { busca = '', status = '' }) {
  const termo = normalizarBusca(busca)
  const termoNumerico = termo.replace(/\D/g, '')

  return pedidos.filter((p) => {
    if (status === 'atrasados' && !pedidoAtrasado(p)) return false
    if (status === 'vencendo' && !pedidoVencendo(p)) return false
    if (status && !['atrasados', 'vencendo'].includes(status) && p.status !== Number(status))
      return false
    if (!termo) return true

    return (
      String(p.id) === termo.replace(/^#|^n[ºo]?\s*/i, '') ||
      normalizarBusca(p.cliente?.nome).includes(termo) ||
      normalizarBusca(p.cliente?.nomeFantasia).includes(termo) ||
      normalizarBusca(p.descricao).includes(termo) ||
      (termoNumerico.length >= 3 && String(p.cliente?.documento || '').includes(termoNumerico))
    )
  })
}

/*
 * SPV-68 — ordenação das listas de pedidos.
 * "entrega": pela data prevista de entrega (a mais próxima/atrasada primeiro; sem data vai para o fim).
 */
const dataEntrega = (p) => (p.dataEntregaPrevista ? String(p.dataEntregaPrevista) : '9999')
export const ORDENS_PEDIDOS = {
  entrega: {
    rotulo: 'Ordem de entrega',
    comparar: (a, b) => dataEntrega(a).localeCompare(dataEntrega(b)) || a.id - b.id,
  },
  recentes: {
    rotulo: 'Mais recentes',
    comparar: (a, b) => String(b.dataCriacao).localeCompare(String(a.dataCriacao)) || b.id - a.id,
  },
  antigos: {
    rotulo: 'Mais antigos',
    comparar: (a, b) => String(a.dataCriacao).localeCompare(String(b.dataCriacao)) || a.id - b.id,
  },
  valor: { rotulo: 'Maior valor', comparar: (a, b) => b.total - a.total || a.id - b.id },
}

export function ordenarPedidos(pedidos, ordem) {
  const regra = ORDENS_PEDIDOS[ordem]
  return regra ? [...pedidos].sort(regra.comparar) : pedidos
}
