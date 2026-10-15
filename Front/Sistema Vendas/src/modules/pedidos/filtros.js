import { STATUS_ABERTOS } from '../../utils/constants'
import { estaAtrasado, normalizarBusca } from '../../utils/formatters'

export function pedidoAtrasado(pedido) {
  return STATUS_ABERTOS.includes(pedido.status) && estaAtrasado(pedido.dataEntregaPrevista)
}

/*
 * busca: nº do pedido, nome do cliente, documento ou descrição
 * status: número do status, '' (todos) ou 'atrasados'
 */
export function filtrarPedidos(pedidos, { busca = '', status = '' }) {
  const termo = normalizarBusca(busca)
  const termoNumerico = termo.replace(/\D/g, '')

  return pedidos.filter((p) => {
    if (status === 'atrasados' && !pedidoAtrasado(p)) return false
    if (status && status !== 'atrasados' && p.status !== Number(status)) return false
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
