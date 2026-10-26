import { Form, InputGroup } from 'react-bootstrap'
import { STATUS_PEDIDO } from '../../../../utils/constants'
import { ORDENS_PEDIDOS } from '../../filtros'

// Barra de busca + filtro de status (REQ009) + ordenação (SPV-68, opcional: só aparece se receber "ordem")
export default function FiltroPedidos({ busca, status, ordem, statusDisponiveis, aoMudar }) {
  const comOrdem = ordem !== undefined
  const mudar = (campo, valor) =>
    aoMudar({ busca, status, ...(comOrdem ? { ordem } : {}), [campo]: valor })
  return (
    <div className="row g-2">
      <div className={comOrdem ? 'col-md-6' : 'col-md-8'}>
        <InputGroup>
          <InputGroup.Text>
            <i className="bi bi-search" aria-hidden="true"></i>
          </InputGroup.Text>
          <Form.Control
            placeholder="Buscar por nº, cliente, CPF/CNPJ ou descrição"
            aria-label="Buscar pedidos"
            value={busca}
            onChange={(e) => mudar('busca', e.target.value)}
          />
        </InputGroup>
      </div>
      <div className={comOrdem ? 'col-6 col-md-3' : 'col-md-4'}>
        <Form.Select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => mudar('status', e.target.value)}
        >
          <option value="">Todos os status</option>
          {statusDisponiveis.map((s) => (
            <option key={s} value={s}>
              {STATUS_PEDIDO[s].nome}
            </option>
          ))}
          <option value="vencendo">Vencendo (hoje ou prazo no fim)</option>
          <option value="atrasados">Somente atrasados</option>
        </Form.Select>
      </div>
      {comOrdem && (
        <div className="col-6 col-md-3">
          <Form.Select
            aria-label="Ordenar pedidos"
            value={ordem}
            onChange={(e) => mudar('ordem', e.target.value)}
          >
            {Object.entries(ORDENS_PEDIDOS).map(([chave, o]) => (
              <option key={chave} value={chave}>
                {o.rotulo}
              </option>
            ))}
          </Form.Select>
        </div>
      )}
    </div>
  )
}
