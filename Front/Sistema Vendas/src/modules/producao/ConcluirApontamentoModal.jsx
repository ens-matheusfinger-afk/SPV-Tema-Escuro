import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { minutosEntre } from '../../services/producaoService'
import { formatarDataHora, formatarDuracao } from '../../utils/formatters'
import { inteiroNaoNegativo, lerNumero } from '../../utils/validacoes'

/*
 * SPV-94/95 — conclusão do apontamento: quantidade produzida (obrigatória) e observação.
 * Se ninguém mais estiver produzindo o pedido, oferece enviar direto para a conferência.
 */
export default function ConcluirApontamentoModal({
  apontamento,
  outrosTrabalhando,
  agora,
  aoConcluir,
  aoFechar,
}) {
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviarParaConferencia, setEnviarParaConferencia] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const quantidadeValida = inteiroNaoNegativo(quantidade)
  const podeEnviar = outrosTrabalhando === 0

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!quantidadeValida) return
    setSalvando(true)
    setErro('')
    try {
      await aoConcluir({
        quantidade: lerNumero(quantidade),
        observacao,
        enviarParaConferencia: podeEnviar && enviarParaConferencia,
      })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" centered>
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">
            Concluir produção · pedido nº {apontamento.idPedido}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-4 small mb-3">
            <div>
              <div className="spv-dado-rotulo">Início</div>
              <div>{formatarDataHora(apontamento.inicio)}</div>
            </div>
            <div>
              <div className="spv-dado-rotulo">Tempo trabalhado</div>
              <div className="fw-bold">
                {formatarDuracao(minutosEntre(apontamento.inicio, null, agora))}
              </div>
            </div>
          </div>

          <Form.Group className="mb-3" controlId="apontamento-quantidade">
            <Form.Label>Quantidade produzida</Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={quantidade}
                isInvalid={tentou && !quantidadeValida}
                onChange={(e) => setQuantidade(e.target.value)}
                autoFocus
              />
              <InputGroup.Text>un.</InputGroup.Text>
              <Form.Control.Feedback type="invalid">
                Informe quantas unidades você produziu (número inteiro, 0 ou mais).
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="apontamento-observacao">
            <Form.Label>
              Observação <span className="text-secondary fw-normal">(opcional)</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={255}
              placeholder="Ex.: faltou linha azul, 2 peças com defeito..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </Form.Group>

          {podeEnviar ? (
            <Form.Check
              type="checkbox"
              id="apontamento-conferencia"
              label="O pedido está pronto: enviar para a conferência"
              checked={enviarParaConferencia}
              onChange={(e) => setEnviarParaConferencia(e.target.checked)}
            />
          ) : (
            <div className="small text-secondary">
              <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
              {outrosTrabalhando} outro(s) operador(es) ainda produzindo este pedido — ele vai para
              a conferência quando todos concluírem.
            </div>
          )}

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
          <Button type="submit" variant="success" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : 'Concluir'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
