import { Link, useNavigate } from 'react-router-dom'
import StatusBadge from '../../../../components/StatusBadge/StatusBadge'
import EstadoVazio from '../../../../components/EstadoVazio/EstadoVazio'
import { formatarDia, formatarMoeda } from '../../../../utils/formatters'
import PrazoPedido from '../PrazoPedido/PrazoPedido'
import './PedidosTabela.css'

export default function PedidosTabela({ pedidos, mensagemVazia = 'Nenhum pedido encontrado.' }) {
  const navigate = useNavigate()

  if (pedidos.length === 0) {
    return (
      <EstadoVazio icone="bi-receipt" titulo={mensagemVazia}>
        Ajuste a busca ou o filtro de status.
      </EstadoVazio>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover spv-tabela">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th className="d-none d-md-table-cell">Descrição</th>
            <th>Entrega prevista</th>
            <th>Status</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => {
            return (
              <tr
                key={p.id}
                className="spv-linha-clicavel"
                onClick={() => navigate(`/pedidos/${p.id}`)}
              >
                <td className="fw-semibold">
                  <Link to={`/pedidos/${p.id}`} onClick={(e) => e.stopPropagation()}>
                    #{p.id}
                  </Link>
                </td>
                <td>
                  <div className="fw-semibold">{p.cliente?.nome ?? `Cliente ${p.idCliente}`}</div>
                  {p.vendedor && (
                    <div className="text-secondary small d-none d-sm-block">
                      Vendedor: {p.vendedor}
                    </div>
                  )}
                </td>
                <td className="d-none d-md-table-cell text-secondary">
                  <span className="d-inline-block text-truncate" style={{ maxWidth: 260 }}>
                    {p.descricao || '—'}
                  </span>
                </td>
                <td className="text-nowrap">
                  <div>{formatarDia(p.dataEntregaPrevista)}</div>
                  <PrazoPedido pedido={p} />
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="text-end fw-semibold text-nowrap">{formatarMoeda(p.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
