/*
 * Gráfico de barras simples, só com CSS (sem biblioteca de gráficos).
 * barras: [{ chave, rotulo, valor, dica, destaque? }]
 */
export default function GraficoBarras({ barras, formatar = String, mostrarValores = true }) {
  const maximo = Math.max(0, ...barras.map((b) => b.valor))
  if (maximo === 0) {
    return <p className="text-secondary text-center my-5 small">Nenhum faturamento no período.</p>
  }
  return (
    <div className="spv-grafico" role="img" aria-label="Gráfico de faturamento">
      {barras.map((b) => (
        <div key={b.chave} className="spv-grafico-coluna" title={b.dica}>
          {mostrarValores && (
            <span className="spv-grafico-valor">{b.valor > 0 ? formatar(b.valor) : ''}</span>
          )}
          <span className="spv-grafico-area">
            <span
              className={`spv-grafico-barra ${b.destaque ? 'destaque' : ''}`}
              style={{ height: `${(b.valor / maximo) * 100}%` }}
            ></span>
          </span>
          <span className="spv-grafico-rotulo">{b.rotulo}</span>
        </div>
      ))}
    </div>
  )
}
