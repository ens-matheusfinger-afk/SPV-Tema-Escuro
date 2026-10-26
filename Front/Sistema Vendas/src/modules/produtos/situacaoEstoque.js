/*
 * Saldo de estoque do produto com aviso visual (REQ017):
 *   ok           -> saldo acima do mínimo
 *   baixo        -> saldo no mínimo ou abaixo
 *   zerado       -> sem unidades
 *   sem-registro -> marcado para controlar estoque, mas sem registro de estoque no banco
 *   encomenda    -> produto que não controla estoque
 */
export function situacaoEstoque(produto) {
  if (!produto.controlaEstoque) return 'encomenda'
  if (!produto.estoque) return 'sem-registro'
  if (produto.estoque.atual <= 0) return 'zerado'
  if (produto.estoque.atual <= produto.estoque.minimo) return 'baixo'
  return 'ok'
}
