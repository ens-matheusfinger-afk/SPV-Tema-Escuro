import api from './api'

// Produtos e serviços que podem entrar num pedido, já com o saldo de estoque
export async function listarCatalogo() {
  const [produtos, servicos, estoque] = await Promise.all([
    api.get('/produtos'),
    api.get('/servicos'),
    api.get('/estoque'),
  ])

  const saldoPorProduto = new Map(estoque.data.map((e) => [e.idProduto, e.estoqueAtual]))

  return {
    produtos: produtos.data
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        valor: Number(p.valor),
        controlaEstoque: Boolean(p.controlaEstoque),
        // null = não controla estoque (confecção / sob encomenda)
        estoque: p.controlaEstoque ? (saldoPorProduto.get(p.id) ?? 0) : null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    servicos: servicos.data
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        valor: Number(s.valor),
        duracaoEstimada: s.duracaoEstimada,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  }
}
