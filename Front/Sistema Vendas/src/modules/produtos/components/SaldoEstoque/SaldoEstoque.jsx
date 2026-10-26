import { situacaoEstoque } from '../../situacaoEstoque'

// Saldo do produto na tabela, com selo de alerta (regras em situacaoEstoque.js)
export default function SaldoEstoque({ produto }) {
  const situacao = situacaoEstoque(produto)

  if (situacao === 'encomenda') return <span className="text-secondary small">Não controla</span>
  if (situacao === 'sem-registro') {
    return (
      <span className="badge text-bg-warning" title="Edite o produto e salve para criar o estoque">
        Estoque não configurado
      </span>
    )
  }

  const { atual, minimo } = produto.estoque
  return (
    <div className="text-nowrap">
      <span className="fw-semibold">{atual} un.</span>
      {situacao === 'zerado' && <span className="badge text-bg-danger ms-2">Sem estoque</span>}
      {situacao === 'baixo' && (
        <span className="badge text-bg-warning ms-2" title={`Mínimo: ${minimo} un.`}>
          Abaixo do mínimo
        </span>
      )}
      <div className="small text-secondary">mín. {minimo}</div>
    </div>
  )
}
