import api from './api'

/*
 * Produtos (REQ007) + estoque de cada produto (REQ017).
 * No banco são duas tabelas: "produtos" e "estoque" (1 linha de estoque por produto que controla
 * estoque). Este service junta as duas para a tela e decide quando criar/remover o estoque.
 */

// Formato do Back -> formato da tela
function montarProduto(p, estoque) {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? '',
    valor: Number(p.valor),
    controlaEstoque: Boolean(p.controlaEstoque),
    estoque: estoque
      ? {
          id: estoque.id,
          atual: estoque.estoqueAtual,
          minimo: estoque.estoqueMinimo,
          maximo: estoque.estoqueMaximo,
        }
      : null,
  }
}

export async function listarProdutos() {
  const [produtos, estoque] = await Promise.all([api.get('/produtos'), api.get('/estoque')])
  const estoquePorProduto = new Map(estoque.data.map((e) => [e.idProduto, e]))
  return produtos.data
    .map((p) => montarProduto(p, estoquePorProduto.get(p.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

/*
 * Cria o produto e, se ele controla estoque, já cria o registro de estoque com o saldo inicial.
 * valores: { nome, descricao, valor, controlaEstoque, estoqueInicial, estoqueMinimo, estoqueMaximo }
 */
export async function criarProduto(valores) {
  const { data: produto } = await api.post('/produtos', {
    nome: valores.nome.trim(),
    descricao: valores.descricao.trim() || null,
    valor: valores.valor,
    controlaEstoque: valores.controlaEstoque,
  })

  if (valores.controlaEstoque) {
    await api.post('/estoque', {
      idProduto: produto.id,
      estoqueAtual: valores.estoqueInicial,
      estoqueMinimo: valores.estoqueMinimo,
      estoqueMaximo: valores.estoqueMaximo,
      idUsuario: valores.idUsuario, // o saldo inicial entra no histórico com quem cadastrou
    })
  }
  return produto.id
}

/*
 * Edita o produto e ajusta o estoque conforme o "controla estoque":
 *  - ligou agora    -> cria o estoque com o saldo inicial
 *  - continua ligado -> atualiza mínimo e máximo (o saldo só muda por entrada/saída)
 *  - desligou        -> remove o registro de estoque (o saldo é descartado)
 */
export async function atualizarProduto(produto, valores) {
  await api.put(`/produtos/${produto.id}`, {
    nome: valores.nome.trim(),
    descricao: valores.descricao.trim() || null,
    valor: valores.valor,
    controlaEstoque: valores.controlaEstoque,
  })

  const tinhaEstoque = Boolean(produto.estoque)

  if (valores.controlaEstoque && !tinhaEstoque) {
    await api.post('/estoque', {
      idProduto: produto.id,
      estoqueAtual: valores.estoqueInicial,
      estoqueMinimo: valores.estoqueMinimo,
      estoqueMaximo: valores.estoqueMaximo,
      idUsuario: valores.idUsuario,
    })
  } else if (valores.controlaEstoque && tinhaEstoque) {
    await api.put(`/estoque/${produto.estoque.id}`, {
      estoqueMinimo: valores.estoqueMinimo,
      estoqueMaximo: valores.estoqueMaximo,
    })
  } else if (!valores.controlaEstoque && tinhaEstoque) {
    await api.delete(`/estoque/${produto.estoque.id}`)
  }
}

// O Back recusa (409) se o produto já foi usado em algum pedido
export async function excluirProduto(id) {
  await api.delete(`/produtos/${id}`)
}
