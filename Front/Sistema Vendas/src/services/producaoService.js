import api from './api'

/*
 * SPV-93/94/95 — apontamento de produção (M.E.S. — REQ010).
 * Um apontamento = um período de trabalho de um operador em um pedido.
 * fim = null -> em andamento.
 */

function montarApontamento(a) {
  return {
    id: a.id,
    idPedido: a.idPedido,
    idOperador: a.idUsuario,
    operador: a.operador?.nome ?? '',
    inicio: a.inicio,
    fim: a.fim,
    emAndamento: !a.fim,
    quantidade: a.quantidadeProduzida,
    observacao: a.observacao ?? '',
    pedido: a.pedido
      ? {
          id: a.pedido.id,
          descricao: a.pedido.descricao ?? '',
          status: Number(a.pedido.status),
          dataEntregaPrevista: a.pedido.dataEntregaPrevista,
          cliente: a.pedido.cliente?.nome ?? '',
        }
      : null,
  }
}

export async function listarApontamentosDoPedido(idPedido) {
  const { data } = await api.get(`/pedidos/${idPedido}/apontamentos`)
  return data.map(montarApontamento)
}

export async function listarApontamentosEmAndamento() {
  const { data } = await api.get('/apontamentos', { params: { emAndamento: true } })
  return data.map(montarApontamento)
}

// SPV-103 — apontamentos de um período (pela data de início), para exportar
export async function listarApontamentosPorPeriodo(de, ate) {
  const { data } = await api.get('/apontamentos', { params: { de, ate } })
  return data.map(montarApontamento)
}

// SPV-93 — se o pedido estiver "Cadastrado", o Back passa ele para "Em produção"
export async function iniciarApontamento(idPedido, idOperador) {
  await api.post(`/pedidos/${idPedido}/apontamentos`, { idUsuario: idOperador })
}

// SPV-94/95 — encerra com a quantidade produzida
export async function concluirApontamento(id, { quantidade, observacao }) {
  await api.put(`/apontamentos/${id}/concluir`, {
    quantidadeProduzida: quantidade,
    observacao: observacao?.trim() || null,
  })
}

// Desfaz um início feito por engano (só enquanto está em andamento)
export async function cancelarApontamento(id) {
  await api.delete(`/apontamentos/${id}`)
}

// Duração em minutos entre duas datas (fim vazio = até agora)
export function minutosEntre(inicio, fim = null, agora = Date.now()) {
  const fimMs = fim ? new Date(fim).getTime() : agora
  return Math.max(0, Math.round((fimMs - new Date(inicio).getTime()) / 60000))
}
