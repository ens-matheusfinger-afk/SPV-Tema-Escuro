import { POWERBI_PROPORCAO, POWERBI_URL } from '../../../services/dashboardService'

/*
 * SPV-79 — Indicadores gerenciais no Power BI (REQ035).
 * Mostra o painel publicado pelo grupo ("Publicar na Web") dentro do sistema.
 * Largura máxima = tamanho original do painel (1024 px); em telas menores ele encolhe
 * mantendo a proporção.
 */
export default function PainelPowerBI() {
  return (
    <section className="spv-card">
      <div className="spv-card-header">
        <i className="bi bi-pie-chart text-secondary" aria-hidden="true"></i>
        <h2>BI SYS VENDAS: faturamento (Power BI)</h2>
        <a className="ms-auto small" href={POWERBI_URL} target="_blank" rel="noopener noreferrer">
          Abrir em nova aba
          <i className="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i>
        </a>
      </div>
      <div className="spv-card-body">
        <div className="spv-bi" style={{ aspectRatio: POWERBI_PROPORCAO }}>
          <iframe title="BI SYS VENDAS" src={POWERBI_URL} allowFullScreen loading="lazy"></iframe>
        </div>
        <p className="small text-secondary mt-2 mb-0">
          <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
          Painel do Power BI com a base de faturamento do grupo (quanto movimentou, quanto entrou e
          quanto saiu). Precisa de internet para carregar.
        </p>
      </div>
    </section>
  )
}
