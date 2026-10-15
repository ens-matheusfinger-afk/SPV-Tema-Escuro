import { Alert, Button } from 'react-bootstrap'

// Erro ao carregar dados, com botão para tentar de novo
export default function AlertaErro({ mensagem, aoTentarNovamente }) {
  return (
    <Alert variant="danger" className="d-flex flex-wrap align-items-center gap-2">
      <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
      <span className="me-auto">{mensagem}</span>
      {aoTentarNovamente && (
        <Button size="sm" variant="outline-danger" onClick={aoTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </Alert>
  )
}
