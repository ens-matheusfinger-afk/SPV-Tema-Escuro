import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../../services/api'
import { formatarDia, formatarMoeda } from '../../../utils/formatters'
import { lerNumero } from '../../../utils/validacoes'

/*
 * SPV-84 — fechamento do caixa: confere o dinheiro da gaveta com o que o sistema esperava.
 * Diferença (sobra ou falta) exige explicação. Depois de fechado, o dia não aceita mais lançamentos.
 */
export default function FecharCaixaModal({ data, resumo, aoFechar, aoConfirmar }) {
  const [contado, setContado] = useState('')
  const [observacao, setObservacao] = useState('')
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const n = lerNumero(contado)
  const contadoValido =
    Number.isFinite(n) && n >= 0 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6
  const diferenca = contadoValido ? Math.round((n - resumo.dinheiroEsperado) * 100) / 100 : 0
  const precisaExplicar = contadoValido && diferenca !== 0
  const erros = {
    contado: !contadoValido,
    observacao: precisaExplicar && observacao.trim().length < 3,
  }
  const valido = !Object.values(erros).some(Boolean)

  const linhas = [
    ['Dinheiro no início do dia', resumo.saldoInicial],
    ['+ Entradas em dinheiro', resumo.entradas.dinheiro],
    ['− Saídas em dinheiro', -resumo.saidas.dinheiro],
  ]

  const confirmar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      await aoConfirmar({ dinheiroContado: n, observacao })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" centered>
      <Form onSubmit={confirmar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">Fechar o caixa de {formatarDia(data)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table className="table table-sm mb-2">
            <tbody>
              {linhas.map(([rotulo, valor]) => (
                <tr key={rotulo}>
                  <td>{rotulo}</td>
                  <td className="text-end">{formatarMoeda(valor)}</td>
                </tr>
              ))}
              <tr className="fw-bold">
                <td>= Dinheiro que deve estar na gaveta</td>
                <td className="text-end" data-testid="dinheiro-esperado">
                  {formatarMoeda(resumo.dinheiroEsperado)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="small text-secondary mb-3">
            PIX {formatarMoeda(resumo.entradas.pix)} · Cartão{' '}
            {formatarMoeda(resumo.entradas.cartao)} entram na conta/maquininha, não na gaveta.
          </div>

          <Form.Group controlId="caixa-contado" className="mb-2">
            <Form.Label>Dinheiro contado na gaveta</Form.Label>
            <InputGroup hasValidation>
              <InputGroup.Text>R$</InputGroup.Text>
              <Form.Control
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={contado}
                isInvalid={tentou && erros.contado}
                onChange={(e) => setContado(e.target.value)}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                Informe o valor contado (pode ser 0).
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          {contadoValido && (
            <Alert
              variant={diferenca === 0 ? 'success' : 'warning'}
              className="py-2 small"
              data-testid="diferenca-caixa"
            >
              {diferenca === 0
                ? 'Confere: o dinheiro contado bate com o esperado.'
                : diferenca > 0
                  ? `Sobrando ${formatarMoeda(diferenca)} na gaveta.`
                  : `Faltando ${formatarMoeda(-diferenca)} na gaveta.`}
            </Alert>
          )}

          <Form.Group controlId="caixa-observacao">
            <Form.Label>
              Observação{' '}
              {precisaExplicar ? (
                '(obrigatória: explique a diferença)'
              ) : (
                <span className="text-secondary fw-normal">(opcional)</span>
              )}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              maxLength={255}
              value={observacao}
              isInvalid={tentou && erros.observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">Explique a diferença.</Form.Control.Feedback>
          </Form.Group>

          <div className="small text-secondary mt-3">
            <i className="bi bi-lock me-1" aria-hidden="true"></i>
            Depois de fechado, este dia não aceita mais lançamentos. Correções entram no caixa de
            hoje.
          </div>
          {erro && (
            <Alert variant="danger" className="small mt-3 mb-0">
              {erro}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" className="border" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : 'Fechar caixa'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
