import { STATUS_ABERTOS } from '../../utils/constants'

const STATUS_FINALIZADO = 5

// Números de cada cliente a partir da lista de pedidos: Map(idCliente -> resumo)
export function resumirPedidosPorCliente(pedidos) {
  const porCliente = new Map()
  for (const p of pedidos ?? []) {
    if (!porCliente.has(p.idCliente)) {
      porCliente.set(p.idCliente, {
        pedidos: 0,
        abertos: 0,
        valorAberto: 0,
        comprado: 0,
        ultimo: null,
      })
    }
    const r = porCliente.get(p.idCliente)
    r.pedidos += 1
    if (STATUS_ABERTOS.includes(p.status)) {
      r.abertos += 1
      r.valorAberto += p.total
    }
    if (p.status === STATUS_FINALIZADO) r.comprado += p.total
    if (!r.ultimo || new Date(p.dataCriacao) > new Date(r.ultimo)) r.ultimo = p.dataCriacao
  }
  return porCliente
}

export const RESUMO_VAZIO = { pedidos: 0, abertos: 0, valorAberto: 0, comprado: 0, ultimo: null }
