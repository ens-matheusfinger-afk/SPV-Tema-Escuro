import { useCarregar } from '../../hooks/useCarregar'
import { listarPedidos } from '../../services/pedidosService'
import { listarClientes } from '../../services/clientesService'

// A lista do Back não traz o cliente junto, então busca os clientes e junta aqui
export function usePedidos() {
  return useCarregar(async () => {
    const [pedidos, clientes] = await Promise.all([listarPedidos(), listarClientes()])
    const porId = new Map(clientes.map((c) => [c.id, c]))
    return pedidos.map((p) => ({ ...p, cliente: porId.get(p.idCliente) ?? null }))
  }, [])
}
