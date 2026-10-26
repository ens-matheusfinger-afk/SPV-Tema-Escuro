import api, { mensagemDeErro } from './api'

function normalizarItem(i) {
  const quantidade = Number(i.quantidade)
  const valorUnitario = Number(i.valorUnitario)
  return {
    id: i.id,
    tipoItem: i.tipoItem,
    idProduto: i.idProduto,
    idServico: i.idServico,
    nome: i.produto?.nome ?? i.servico?.nome ?? '(item removido do cadastro)',
    quantidade,
    valorUnitario,
    subtotal: quantidade * valorUnitario,
  }
}

export function normalizarPedido(p) {
  return {
    id: p.id,
    descricao: p.descricao || '',
    idCliente: p.idCliente,
    idVendedor: p.idVendedor,
    vendedor: p.vendedor?.nome || '',
    dataCriacao: p.dataCriacao,
    dataEntregaPrevista: p.dataEntregaPrevista,
    dataEntregaRealizada: p.dataEntregaRealizada,
    status: Number(p.status),
    total: Number(p.total),
    // SPV-73: total = subtotal (itens) - desconto
    subtotal: Number(p.subtotal ?? 0) || Number(p.total),
    desconto: p.descontoTipo
      ? {
          tipo: p.descontoTipo,
          informado: Number(p.descontoInformado),
          valor: Number(p.valorDesconto),
          motivo: p.motivoDesconto ?? '',
          por: p.descontoPor?.nome ?? (p.idDescontoPor ? `usuário ${p.idDescontoPor}` : ''),
        }
      : null,
    anexo: p.anexo || '',
    // SPV-118: pedido aberto para cliente devendo, com liberação do financeiro
    liberacao: p.motivoLiberacao
      ? { motivo: p.motivoLiberacao, por: p.liberadoPor?.nome ?? `usuário ${p.idLiberadoPor}` }
      : null,
    itens: p.itens ? p.itens.map(normalizarItem) : undefined,
  }
}

// REQ009 — lista geral (filtro opcional por status no Back)
export async function listarPedidos(status) {
  const { data } = await api.get('/pedidos', { params: status ? { status } : undefined })
  return data.map(normalizarPedido)
}

export async function buscarPedido(id) {
  const { data } = await api.get(`/pedidos/${id}`)
  return normalizarPedido(data)
}

/*
 * REQ004 — gera o pedido em duas etapas, como o Back espera:
 *   1) POST /pedidos (cabeçalho)   2) POST /pedidos/:id/itens (um por item)
 * Se algum item falhar, o pedido é cancelado na hora para não ficar pela metade
 * (o cancelamento também devolve ao estoque o que já tinha sido baixado).
 */
export async function criarPedido({
  idCliente,
  idVendedor,
  descricao,
  dataEntregaPrevista,
  anexo,
  itens,
  liberacao, // SPV-118: { idUsuario, motivo } quando o cliente está devendo
}) {
  const { data: pedido } = await api.post('/pedidos', {
    idCliente,
    idVendedor,
    descricao: descricao?.trim() || null,
    dataEntregaPrevista: dataEntregaPrevista || null,
    anexo: anexo?.trim() || null,
    ...(liberacao ? { liberacao } : {}),
  })

  for (const item of itens) {
    try {
      await adicionarItem(pedido.id, item)
    } catch (erro) {
      await api.delete(`/pedidos/${pedido.id}`).catch(() => {})
      throw new Error(
        `Não foi possível adicionar "${item.nome}": ${mensagemDeErro(erro)} ` +
          `O pedido nº ${pedido.id} foi cancelado para não ficar incompleto.`,
        { cause: erro },
      )
    }
  }

  return pedido.id
}

export async function editarPedido(id, { descricao, dataEntregaPrevista, anexo }) {
  await api.put(`/pedidos/${id}`, {
    descricao: descricao?.trim() || null,
    dataEntregaPrevista: dataEntregaPrevista || null,
    anexo: anexo?.trim() || null,
  })
}

// REQ005 / REQ020
export async function alterarStatusPedido(id, status) {
  await api.put(`/pedidos/${id}/status`, { status })
}

// REQ038 — o Back não apaga: marca como cancelado e devolve o estoque
export async function cancelarPedido(id) {
  await api.delete(`/pedidos/${id}`)
}

export async function adicionarItem(idPedido, { tipoItem, idProduto, idServico, quantidade }) {
  await api.post(`/pedidos/${idPedido}/itens`, {
    tipoItem,
    idProduto: tipoItem === 'produto' ? idProduto : undefined,
    idServico: tipoItem === 'servico' ? idServico : undefined,
    quantidade: Number(quantidade),
  })
}

export async function alterarQuantidadeItem(idPedido, idItem, quantidade) {
  await api.put(`/pedidos/${idPedido}/itens/${idItem}`, { quantidade: Number(quantidade) })
}

export async function removerItem(idPedido, idItem) {
  await api.delete(`/pedidos/${idPedido}/itens/${idItem}`)
}

// SPV-73 — aplica, troca ou tira (tipo null) o desconto do pedido
export async function aplicarDesconto(id, { tipo, valor, motivo, idUsuario }) {
  const { data } = await api.put(`/pedidos/${id}/desconto`, { tipo, valor, motivo, idUsuario })
  return normalizarPedido(data)
}
