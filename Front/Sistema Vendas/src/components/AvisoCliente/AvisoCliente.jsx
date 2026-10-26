import { Alert } from 'react-bootstrap'
import ConfiancaCliente from '../ConfiancaCliente/ConfiancaCliente'
import { CONFIANCA_DE_ATENCAO } from '../../services/clientesService'

/*
 * SPV-119 — aviso do cliente na hora de atender (novo pedido, pedidos do cliente).
 * Confiança baixa (1 ou 2): alerta amarelo. Só observação: alerta azul discreto.
 * Sem nada a avisar: não mostra nada.
 */
export default function AvisoCliente({ cliente, className = '' }) {
  if (!cliente) return null
  const atencao = cliente.fatorConfianca <= CONFIANCA_DE_ATENCAO
  if (!atencao && !cliente.observacao) return null

  return (
    <Alert
      variant={atencao ? 'warning' : 'info'}
      className={`small py-2 mb-0 ${className}`}
      data-testid="aviso-cliente"
    >
      <div className="d-flex flex-wrap align-items-center gap-2">
        <i
          className={`bi ${atencao ? 'bi-exclamation-triangle-fill' : 'bi-chat-left-text'}`}
          aria-hidden="true"
        ></i>
        <strong>{atencao ? 'Atenção com este cliente' : 'Observação do cliente'}</strong>
        <ConfiancaCliente fator={cliente.fatorConfianca} />
      </div>
      {cliente.observacao && <div className="mt-1">{cliente.observacao}</div>}
    </Alert>
  )
}
