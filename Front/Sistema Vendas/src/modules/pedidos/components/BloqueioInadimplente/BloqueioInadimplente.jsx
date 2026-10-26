import { Alert, Form } from 'react-bootstrap'
import { formatarDia, formatarMoeda } from '../../../../utils/formatters'

/*
 * SPV-118 — cliente com conta vencida: o novo pedido fica bloqueado.
 * Quem tem acesso a "Contas a receber" pode liberar, explicando o motivo (fica gravado no pedido).
 * Quem não tem, vê o que está vencido e a orientação para receber antes.
 */
export default function BloqueioInadimplente({
  devendo,
  podeLiberar,
  liberacao,
  aoMudar,
  mostrarErro,
}) {
  if (!devendo) return null
  const motivoCurto = liberacao.motivo.trim().length < 5

  return (
    <Alert variant="danger" className="small mt-2 mb-0" data-testid="bloqueio-inadimplente">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <i className="bi bi-slash-circle-fill" aria-hidden="true"></i>
        <strong>Cliente com pagamento vencido: novo pedido bloqueado</strong>
        <span className="ms-auto fw-bold">{formatarMoeda(devendo.totalVencido)}</span>
      </div>
      <ul className="mb-2 mt-1 ps-3">
        {devendo.contas.map((c) => (
          <li key={c.id}>
            {c.idPedido ? `Pedido nº ${c.idPedido}` : c.descricao} — {formatarMoeda(c.valor)},
            venceu em {formatarDia(c.vencimento)}
          </li>
        ))}
      </ul>
      {podeLiberar ? (
        <>
          <Form.Check
            type="switch"
            id="liberar-inadimplente"
            label="Liberar este pedido mesmo assim (fica registrado quem liberou e o motivo)"
            checked={liberacao.ativo}
            onChange={(e) => aoMudar({ ...liberacao, ativo: e.target.checked })}
          />
          {liberacao.ativo && (
            <Form.Group controlId="motivo-liberacao" className="mt-2">
              <Form.Label className="small fw-semibold">Motivo da liberação</Form.Label>
              <Form.Control
                size="sm"
                maxLength={255}
                placeholder="Ex.: cliente antigo, combinou pagar na sexta"
                value={liberacao.motivo}
                isInvalid={mostrarErro && motivoCurto}
                onChange={(e) => aoMudar({ ...liberacao, motivo: e.target.value })}
              />
              <Form.Control.Feedback type="invalid">
                Explique o motivo (pelo menos 5 letras).
              </Form.Control.Feedback>
            </Form.Group>
          )}
        </>
      ) : (
        <div>
          Receba o valor em <strong>Contas a receber</strong> ou peça a liberação para alguém do
          financeiro.
        </div>
      )}
    </Alert>
  )
}
