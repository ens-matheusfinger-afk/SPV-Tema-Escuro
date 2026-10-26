import api from './api'

// Serviços (REQ006): itens de pedido sem estoque, com duração estimada em minutos

function montarServico(s) {
  return {
    id: s.id,
    nome: s.nome,
    descricao: s.descricao ?? '',
    valor: Number(s.valor),
    duracaoEstimada: s.duracaoEstimada ?? null,
  }
}

export async function listarServicos() {
  const { data } = await api.get('/servicos')
  return data.map(montarServico).sort((a, b) => a.nome.localeCompare(b.nome))
}

function corpo(valores) {
  return {
    nome: valores.nome.trim(),
    descricao: valores.descricao.trim() || null,
    valor: valores.valor,
    duracaoEstimada: valores.duracaoEstimada,
  }
}

export async function criarServico(valores) {
  const { data } = await api.post('/servicos', corpo(valores))
  return data.id
}

export async function atualizarServico(id, valores) {
  await api.put(`/servicos/${id}`, corpo(valores))
}

// O Back recusa (409) se o serviço já foi usado em algum pedido
export async function excluirServico(id) {
  await api.delete(`/servicos/${id}`)
}
