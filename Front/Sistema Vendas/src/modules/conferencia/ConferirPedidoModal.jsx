import { useState } from 'react'
import { Alert, Button, ButtonGroup, Form, Modal, Spinner, ToggleButton } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { formatarMoeda } from '../../utils/formatters'

/*
 * SPV-96 — conferência de qualidade do pedido.
 * Aprovar -> "Aguardando cliente". Devolver -> volta para "Em produção" com o motivo (obrigatório),
 * que fica registrado para o operador saber o que refazer.
 * pedido: precisa ter id e, se possível, itens (para o conferente ver o que confere).
 * resultadoInicial: 'aprovado' | 'devolvido' (qual opção já vem marcada).
 */
export default function ConferirPedidoModal({
  pedido,
  cliente,
  resultadoInicial,
  aoConfirmar,
  aoFechar,
}) {
  const [resultado, setResultado] = useState(resultadoInicial ?? 'aprovado')
  const [motivo, setMotivo] = useState('')
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const devolvendo = resultado === 'devolvido'
  const motivoFalta = devolvendo && !motivo.trim()

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (motivoFalta) return
    setSalvando(true)
    setErro('')
    try {
      await aoConfirmar({ resultado, motivo })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" size="lg">
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">
            Conferência do pedido nº {pedido.id}
            {cliente && <span className="text-secondary fw-normal"> · {cliente}</span>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pedido.itens?.length > 0 && (
            <>
              <h3 className="h6 fw-bold">O que conferir</h3>
              <ul className="list-unstyled small border rounded p-2 mb-3">
                {pedido.itens.map((i) => (
                  <li key={i.id} className="d-flex justify-content-between gap-2 py-1">
                    <span>
                      <strong>{i.quantidade}x</strong> {i.nome}
                    </span>
                    <span className="text-secondary">{formatarMoeda(i.subtotal)}</span>
                  </li>
                ))}
              </ul>
              {pedido.descricao && (
                <p className="small mb-3">
                  <strong>Observações do pedido:</strong> {pedido.descricao}
                </p>
              )}
            </>
          )}

          <ButtonGroup
            className="w-100 mb-3"
            role="radiogroup"
            aria-label="Resultado da conferência"
          >
            <ToggleButton
              id="conferencia-aprovar"
              type="radio"
              name="resultado"
              value="aprovado"
              variant={resultado === 'aprovado' ? 'success' : 'outline-success'}
              checked={resultado === 'aprovado'}
              onChange={() => setResultado('aprovado')}
            >
              <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
              Aprovar
            </ToggleButton>
            <ToggleButton
              id="conferencia-devolver"
              type="radio"
              name="resultado"
              value="devolvido"
              variant={devolvendo ? 'danger' : 'outline-danger'}
              checked={devolvendo}
              onChange={() => setResultado('devolvido')}
            >
              <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>
              Devolver para retrabalho
            </ToggleButton>
          </ButtonGroup>

          <p className="small text-secondary">
            {devolvendo
              ? 'O pedido volta para "Em produção" e o motivo aparece no histórico para o operador.'
              : 'O pedido segue para "Aguardando cliente" (pronto para retirada).'}
          </p>

          <Form.Group controlId="conferencia-motivo">
            <Form.Label>
              {devolvendo ? 'O que precisa ser refeito?' : 'Observação'}{' '}
              {!devolvendo && <span className="text-secondary fw-normal">(opcional)</span>}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              maxLength={255}
              placeholder={
                devolvendo
                  ? 'Ex.: estampa torta na peça 3, faltou 1 boné'
                  : 'Ex.: conferido item a item, embalado'
              }
              value={motivo}
              isInvalid={tentou && motivoFalta}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">
              Para devolver, descreva o que precisa ser corrigido.
            </Form.Control.Feedback>
            <Form.Text>{motivo.length}/255</Form.Text>
          </Form.Group>

          {erro && (
            <Alert variant="danger" className="small mt-3 mb-0">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="border" onClick={aoFechar} disabled={salvando}>
            Voltar
          </Button>
          <Button type="submit" variant={devolvendo ? 'danger' : 'success'} disabled={salvando}>
            {salvando ? (
              <Spinner size="sm" />
            ) : devolvendo ? (
              'Devolver para retrabalho'
            ) : (
              'Aprovar pedido'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
