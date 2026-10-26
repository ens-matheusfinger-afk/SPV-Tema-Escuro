import api from './api'

/*
 * Estoque (REQ017): entradas, saídas, ajuste pelo inventário e histórico.
 * SPV-65 tela de estoque | SPV-108 alerta de estoque mínimo | SPV-109 ajuste manual.
 * A lista com produto + saldo vem do produtosService.listarProdutos (já junta as duas tabelas).
 */

export async function registrarEntrada(idEstoque, { quantidade, motivo, idUsuario }) {
  await api.post(`/estoque/${idEstoque}/entrada`, { quantidade, motivo, idUsuario })
}

export async function registrarSaida(idEstoque, { quantidade, motivo, idUsuario }) {
  await api.post(`/estoque/${idEstoque}/saida`, { quantidade, motivo, idUsuario })
}

// SPV-109 — informa o saldo contado; o Back grava a diferença como "ajuste"
export async function ajustarSaldo(idEstoque, { novoSaldo, motivo, idUsuario }) {
  await api.post(`/estoque/${idEstoque}/ajuste`, { novoSaldo, motivo, idUsuario })
}

export const TIPOS_MOVIMENTACAO = {
  entrada: { nome: 'Entrada', icone: 'bi-box-arrow-in-down', cor: 'success' },
  saida: { nome: 'Saída manual', icone: 'bi-box-arrow-up', cor: 'danger' },
  ajuste: { nome: 'Ajuste (inventário)', icone: 'bi-sliders', cor: 'warning' },
  venda: { nome: 'Venda (pedido)', icone: 'bi-cart-dash', cor: 'primary' },
  devolucao: { nome: 'Devolução (pedido)', icone: 'bi-arrow-counterclockwise', cor: 'info' },
}

export async function listarMovimentacoes(idEstoque) {
  const { data } = await api.get(`/estoque/${idEstoque}/movimentacoes`)
  return data.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    quantidade: m.quantidade,
    saldoAnterior: m.saldoAnterior,
    saldoAtual: m.saldoAtual,
    motivo: m.motivo ?? '',
    idPedido: m.idPedido,
    usuario: m.usuario?.nome ?? '',
    data: m.data,
  }))
}

// SPV-108 — quantos produtos estão no mínimo ou abaixo (usado no aviso do menu)
export async function contarAlertasEstoque() {
  const { data } = await api.get('/estoque')
  return data.filter((e) => e.estoqueAtual <= e.estoqueMinimo).length
}
