import api from './api'

// SPV-96 — conferência de qualidade: aprovar ou devolver o pedido para retrabalho

export async function listarConferencias(idPedido) {
  const { data } = await api.get(`/pedidos/${idPedido}/conferencias`)
  return data.map((c) => ({
    id: c.id,
    resultado: c.resultado,
    motivo: c.motivo ?? '',
    conferente: c.conferente?.nome ?? '',
    data: c.data,
  }))
}

// resultado: 'aprovado' (vai para Aguardando cliente) | 'devolvido' (volta para Em produção)
export async function registrarConferencia(idPedido, { idUsuario, resultado, motivo }) {
  await api.post(`/pedidos/${idPedido}/conferencias`, {
    idUsuario,
    resultado,
    motivo: motivo?.trim() || null,
  })
}
