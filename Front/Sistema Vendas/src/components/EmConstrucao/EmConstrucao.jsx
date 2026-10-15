const TITULOS_REQ = {
  REQ001: 'Cadastro de Usuários',
  REQ002: 'Controle de Perfis e Permissões',
  REQ004: 'Gerar Pedidos',
  REQ005: 'Alterar estado do pedido',
  REQ006: 'Cadastro de Serviços',
  REQ007: 'Cadastro de Produtos',
  REQ008: 'Impressão em papel/etiqueta do Pedido',
  REQ009: 'Consulta de Pedidos em Aberto',
  REQ010: 'Iniciar produção de pedido',
  REQ011: 'Fazer Conferência de pedido',
  REQ012: 'Listagem de Pedidos Aguardando Cliente',
  REQ013: 'Módulo de Fechamento de Caixa',
  REQ014: 'Controle de Contas a Pagar',
  REQ015: 'Controle de Contas a Receber',
  REQ016: 'Módulo de Pendências por Cliente',
  REQ017: 'Controle de Estoque de Produtos para Venda',
  REQ018: 'Painel de Indicadores Gerenciais',
  REQ019: 'Exportação de Relatórios',
  REQ020: 'Finalizar pedido',
  REQ035: 'Integração com Business Intelligence',
  REQ040: 'Gestão Visual (Lean)',
}

// Placeholder das telas que ainda não foram construídas.
export default function EmConstrucao({ requisitos = [], fase }) {
  return (
    <div className="spv-card spv-card-accent p-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-cone-striped fs-5 text-warning" aria-hidden="true"></i>
        <h2 className="h6 fw-bold mb-0">Tela em construção</h2>
        {fase && <span className="badge text-bg-light border ms-auto">Fase {fase} do roadmap</span>}
      </div>

      {requisitos.length > 0 ? (
        <>
          <p className="text-secondary small mb-2">Requisitos que esta tela vai atender:</p>
          <ul className="list-unstyled mb-0">
            {requisitos.map((id) => (
              <li key={id} className="small py-1">
                <span className="badge text-bg-primary me-2">{id}</span>
                {TITULOS_REQ[id] ?? ''}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-secondary small mb-0">
          Sem requisito próprio no Documento de Visão. É a base para o REQ004 (Gerar Pedidos).
        </p>
      )}
    </div>
  )
}
