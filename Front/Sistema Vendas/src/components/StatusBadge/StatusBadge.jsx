import { STATUS_PEDIDO } from '../../utils/constants'
import './StatusBadge.css'

// Selo colorido do status do pedido (REQ040 — gestão visual)
export default function StatusBadge({ status }) {
  const info = STATUS_PEDIDO[status] ?? {
    nome: `Status ${status}`,
    cor: 'secondary',
    icone: 'bi-question',
  }
  return (
    <span className={`badge rounded-pill text-bg-${info.cor} spv-status`}>
      <i className={`bi ${info.icone} me-1`} aria-hidden="true"></i>
      {info.nome}
    </span>
  )
}
