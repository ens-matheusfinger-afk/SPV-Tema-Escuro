import { STATUS_PEDIDO } from '../../../../utils/constants'
import './LinhaDoTempo.css'

const ETAPAS = [1, 2, 3, 4, 5]

// Etapas do pedido em sequência, destacando onde ele está (REQ040)
export default function LinhaDoTempo({ status }) {
  if (status === 6) {
    return (
      <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
        <i className="bi bi-x-circle" aria-hidden="true"></i>
        Pedido cancelado. O estoque dos produtos foi devolvido.
      </div>
    )
  }

  return (
    <ol className="spv-etapas" aria-label="Etapas do pedido">
      {ETAPAS.map((etapa) => {
        const estado = etapa < status ? 'feita' : etapa === status ? 'atual' : 'futura'
        return (
          <li
            key={etapa}
            className={`spv-etapa ${estado}`}
            aria-current={estado === 'atual' ? 'step' : undefined}
          >
            <span className="spv-etapa-bolinha">
              {estado === 'feita' ? <i className="bi bi-check-lg" aria-hidden="true"></i> : etapa}
            </span>
            <span className="spv-etapa-nome">{STATUS_PEDIDO[etapa].nome}</span>
          </li>
        )
      })}
    </ol>
  )
}
