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
  FORMAS_DE_PAGAR,
  FORMAS_PAGAMENTO,
  FORMAS_RECEBIMENTO,
} from '../../../services/financeiroService'
import { formatarMoeda } from '../../../utils/formatters'
import { lerNumero, valorMonetarioValido } from '../../../utils/validacoes'

const SUGESTOES = {
  entrada: ['Venda no balcão', 'Troco inicial (suprimento)', 'Ajuste de caixa'],
  saida: ['Sangria (retirada para o cofre/banco)', 'Compra de material', 'Ajuste de caixa'],
}

/*
 * SPV-84/97 — lançamento manual no caixa de hoje: venda no balcão, troco, sangria, despesa pequena...
 * (recebimentos e pagamentos de contas entram sozinhos pelas telas de contas)
 */
export default function LancamentoCaixaModal({ dinheiroDisponivel, aoSalvar, aoFechar }) {
  const [form, setForm] = useState({ tipo: 'entrada', forma: '', valor: '', descricao: '' })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const formas = form.tipo === 'entrada' ? FORMAS_RECEBIMENTO : FORMAS_DE_PAGAR
  const valor = lerNumero(form.valor)
  const semDinheiro =
    form.tipo === 'saida' &&
    form.forma === 'dinheiro' &&
    valorMonetarioValido(form.valor) &&
    Math.round(valor * 100) > Math.round(dinheiroDisponivel * 100)
  const erros = {
    forma: !form.forma,
    valor: !valorMonetarioValido(form.valor) || semDinheiro,
    descricao: form.descricao.trim().length < 2,
  }
  const valido = !Object.values(erros).some(Boolean)

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      await aoSalvar({ ...form, valor })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static">
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">Lançamento manual no caixa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ButtonGroup className="w-100 mb-3" aria-label="Tipo do lançamento">
            {[
              ['entrada', 'bi-arrow-down-circle', 'Entrada', 'success'],
              ['saida', 'bi-arrow-up-circle', 'Saída', 'danger'],
            ].map(([tipo, icone, rotulo, cor]) => (
              <ToggleButton
                key={tipo}
                id={`caixa-tipo-${tipo}`}
                type="radio"
                name="caixa-tipo"
                value={tipo}
                variant={form.tipo === tipo ? cor : `outline-${cor}`}
                checked={form.tipo === tipo}
                onChange={() => setForm({ ...form, tipo, forma: '' })}
              >
                <i className={`bi ${icone} me-1`} aria-hidden="true"></i>
                {rotulo}
              </ToggleButton>
            ))}
          </ButtonGroup>

          <div className="row g-3">
            <div className="col-12">
              <div className="form-label">Forma de pagamento</div>
              <ButtonGroup className="flex-wrap" aria-label="Forma de pagamento">
                {formas.map((f) => (
                  <ToggleButton
                    key={f}
                    id={`caixa-forma-${f}`}
                    type="radio"
                    name="caixa-forma"
                    value={f}
                    size="sm"
                    variant={
                      form.forma === f
                        ? 'primary'
                        : tentou && erros.forma
                          ? 'outline-danger'
                          : 'outline-primary'
                    }
                    checked={form.forma === f}
                    onChange={() => setForm({ ...form, forma: f })}
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
            <Form.Group className="col-sm-5" controlId="caixa-valor">
              <Form.Label>Valor</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>R$</InputGroup.Text>
                <Form.Control
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  isInvalid={(tentou && erros.valor) || semDinheiro}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
                <Form.Control.Feedback type="invalid">
                  {semDinheiro
                    ? `Só há ${formatarMoeda(Math.max(0, dinheiroDisponivel))} em dinheiro no caixa.`
                    : 'Informe um valor maior que zero.'}
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Form.Group className="col-sm-7" controlId="caixa-descricao">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                list="caixa-sugestoes"
                maxLength={255}
                value={form.descricao}
                isInvalid={tentou && erros.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
              <datalist id="caixa-sugestoes">
                {SUGESTOES[form.tipo].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <Form.Control.Feedback type="invalid">Descreva o lançamento.</Form.Control.Feedback>
            </Form.Group>
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
          <Button type="submit" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : 'Lançar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
