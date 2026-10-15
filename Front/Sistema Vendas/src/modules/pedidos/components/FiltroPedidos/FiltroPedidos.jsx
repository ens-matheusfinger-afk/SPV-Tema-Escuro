import { Form, InputGroup } from 'react-bootstrap'
import { STATUS_PEDIDO } from '../../../../utils/constants'

// Barra de busca + filtro de status (REQ009)
export default function FiltroPedidos({ busca, status, statusDisponiveis, aoMudar }) {
  return (
    <div className="row g-2">
      <div className="col-md-8">
        <InputGroup>
          <InputGroup.Text>
            <i className="bi bi-search" aria-hidden="true"></i>
          </InputGroup.Text>
          <Form.Control
            placeholder="Buscar por nº, cliente, CPF/CNPJ ou descrição"
            aria-label="Buscar pedidos"
            value={busca}
            onChange={(e) => aoMudar({ busca: e.target.value, status })}
          />
        </InputGroup>
      </div>
      <div className="col-md-4">
        <Form.Select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => aoMudar({ busca, status: e.target.value })}
        >
          <option value="">Todos os status</option>
          {statusDisponiveis.map((s) => (
            <option key={s} value={s}>
              {STATUS_PEDIDO[s].nome}
            </option>
          ))}
          <option value="atrasados">Somente atrasados</option>
        </Form.Select>
      </div>
    </div>
  )
}
