import { useState } from 'react'
import {
  Alert,
  Button,
  ButtonGroup,
  Form,
  InputGroup,
  Modal,
  Spinner,
  ToggleButton,
} from 'react-bootstrap'
import { mensagemDeErro } from '../../../services/api'
import {
  FORMAS_PAGAMENTO,
  JUROS_MES_PERCENTUAL,
  MULTA_PERCENTUAL,
  principalDoPagamento,
} from '../../../services/financeiroService'
import { formatarDia, formatarMoeda, hojeISO } from '../../../utils/formatters'
import { lerNumero, valorMonetarioValido } from '../../../utils/validacoes'

/*
 * Baixa de uma conta: registrar o pagamento (contas a pagar) ou o recebimento (contas a receber).
 * parcial = true: permite receber só uma parte (ex.: sinal de 50%); o restante continua em aberto.
 * encargosDe(data) (SPV-73): para conta a receber vencida, calcula multa e juros na data escolhida;
 * o valor sugerido vira o total atualizado e dá para dispensar a cobrança.
 */
export default function BaixaContaModal({
  conta,
  titulo,
  rotuloData,
  formas,
  parcial = false,
  textoConfirmar,
  avisoCaixa,
  encargosDe,
  aoConfirmar,
  aoFechar,
}) {
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const [forma, setForma] = useState('')
  const [valorDigitado, setValorDigitado] = useState(null) // null = usar o valor sugerido
  const [cobrar, setCobrar] = useState(true)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const calculados = encargosDe && data && data <= hoje ? encargosDe(data) : null
  const temEncargos = Boolean(calculados?.diasAtraso)
  const encargos =
    temEncargos && cobrar
      ? calculados
      : { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: conta.valor, fator: 1 }
  const maximo = encargos.totalAtualizado
  const valor = valorDigitado ?? maximo.toFixed(2)

  const n = lerNumero(valor)
  const erros = {
    data: !data || data > hoje,
    forma: !forma,
    valor:
      parcial && (!valorMonetarioValido(valor) || Math.round(n * 100) > Math.round(maximo * 100)),
  }
  const valido = !Object.values(erros).some(Boolean)
  const restante =
    parcial && !erros.valor
      ? Math.round((conta.valor - principalDoPagamento(conta, encargos, n)) * 100) / 100
      : 0

  const confirmar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      await aoConfirmar({
        data,
        forma,
        valor: parcial ? n : undefined,
        ...(encargosDe ? { cobrarEncargos: cobrar } : {}),
      })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" centered>
      <Form onSubmit={confirmar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">{titulo}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="spv-baixa-resumo mb-3">
            <div className="fw-semibold">{conta.descricao}</div>
            <div className="small text-secondary">
              {[
                conta.cliente?.nome,
                conta.fornecedor,
                conta.vencimento && `vence ${formatarDia(conta.vencimento)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="fs-4 fw-bold mt-1">{formatarMoeda(conta.valor)}</div>
            {temEncargos && (
              <div className="spv-encargos mt-2 pt-2 border-top small" data-testid="encargos">
                <div className="fw-semibold text-danger mb-1">
                  <i className="bi bi-alarm me-1" aria-hidden="true"></i>
                  Paga com {calculados.diasAtraso} dia(s) de atraso
                </div>
                <div className={cobrar ? '' : 'text-decoration-line-through text-secondary'}>
                  <div className="d-flex justify-content-between">
                    <span>Multa ({MULTA_PERCENTUAL}%)</span>
                    <span>+ {formatarMoeda(calculados.multa)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>
                      Juros ({JUROS_MES_PERCENTUAL}% ao mês × {calculados.diasAtraso} dia(s))
                    </span>
                    <span>+ {formatarMoeda(calculados.juros)}</span>
                  </div>
                </div>
                <div className="d-flex justify-content-between fw-bold mt-1">
                  <span>Total a receber</span>
                  <span>{formatarMoeda(encargos.totalAtualizado)}</span>
                </div>
                <Form.Check
                  type="switch"
                  id="baixa-cobrar-encargos"
                  className="mt-2"
                  label="Cobrar multa e juros"
                  checked={cobrar}
                  onChange={(e) => {
                    setCobrar(e.target.checked)
                    setValorDigitado(null)
                  }}
                />
              </div>
            )}
          </div>

          <div className="row g-3">
            {parcial && (
              <Form.Group className="col-sm-6" controlId="baixa-valor">
                <Form.Label>Valor recebido</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>R$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={valor}
                    isInvalid={tentou && erros.valor}
                    onChange={(e) => setValorDigitado(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    De R$ 0,01 até {formatarMoeda(maximo)}.
                  </Form.Control.Feedback>
                </InputGroup>
                <Form.Text>
                  {restante > 0
                    ? `Recebimento parcial: ${formatarMoeda(restante)} continuam em aberto.`
                    : encargos.diasAtraso
                      ? 'Valor total, com multa e juros.'
                      : 'Valor total da conta.'}
                </Form.Text>
              </Form.Group>
            )}
            <Form.Group className={parcial ? 'col-sm-6' : 'col-12'} controlId="baixa-data">
              <Form.Label>{rotuloData}</Form.Label>
              <Form.Control
                type="date"
                value={data}
                max={hoje}
                isInvalid={tentou && erros.data}
                onChange={(e) => {
                  setData(e.target.value)
                  setValorDigitado(null)
                }}
              />
              <Form.Control.Feedback type="invalid">
                Use hoje ou uma data passada.
              </Form.Control.Feedback>
            </Form.Group>
            <div className="col-12">
              <div className="form-label">Forma de pagamento</div>
              <ButtonGroup className="flex-wrap" aria-label="Forma de pagamento">
                {formas.map((f) => (
                  <ToggleButton
                    key={f}
                    id={`baixa-forma-${f}`}
                    type="radio"
                    name="baixa-forma"
                    value={f}
                    variant={
                      forma === f
                        ? 'primary'
                        : tentou && erros.forma
                          ? 'outline-danger'
                          : 'outline-primary'
                    }
                    checked={forma === f}
                    onChange={() => setForma(f)}
                  >
                    <i className={`bi ${FORMAS_PAGAMENTO[f].icone} me-1`} aria-hidden="true"></i>
                    {FORMAS_PAGAMENTO[f].nome}
                  </ToggleButton>
                ))}
              </ButtonGroup>
              {tentou && erros.forma && (
                <div className="small text-danger mt-1">Escolha a forma de pagamento.</div>
              )}
            </div>
          </div>

          {avisoCaixa && (
            <div className="small text-secondary mt-3">
              <i className="bi bi-safe me-1" aria-hidden="true"></i>
              {avisoCaixa}
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
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : textoConfirmar}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
