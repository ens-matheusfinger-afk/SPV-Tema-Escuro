import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { CATEGORIAS_PAGAR } from '../../services/financeiroService'
import { hojeISO } from '../../utils/formatters'
import { lerNumero, somarDias, valorMonetarioValido } from '../../utils/validacoes'

/*
 * SPV-86 — cadastro e edição de conta a pagar.
 * Categoria: escolhe da lista ou digita uma nova. Vencimento obrigatório (é ele que gera o alerta).
 */
export default function ContaPagarFormModal({ conta, aoSalvar, aoFechar }) {
  const nova = !conta
  const [form, setForm] = useState({
    descricao: conta?.descricao ?? '',
    categoria: conta?.categoria ?? '',
    fornecedor: conta?.fornecedor ?? '',
    valor: conta ? conta.valor.toFixed(2) : '',
    vencimento: conta?.vencimento ?? '',
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // vencimento muito distante costuma ser ano digitado errado
  const limite = somarDias(hojeISO(), 3 * 365)
  const erros = {
    descricao: form.descricao.trim().length < 2,
    categoria: !form.categoria.trim(),
    valor: !valorMonetarioValido(form.valor),
    vencimento: !form.vencimento || form.vencimento > limite,
  }
  const valido = !Object.values(erros).some(Boolean)
  const mostrar = (campo) => tentou && erros[campo]
  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      await aoSalvar({ ...form, valor: lerNumero(form.valor) })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static">
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">
            {nova ? 'Nova conta a pagar' : 'Editar conta a pagar'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <Form.Group className="col-12" controlId="pagar-descricao">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                value={form.descricao}
                maxLength={255}
                placeholder="Ex.: Aluguel de novembro, tecido malha 30 m"
                isInvalid={mostrar('descricao')}
                onChange={alterar('descricao')}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Informe a descrição.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-sm-6" controlId="pagar-categoria">
              <Form.Label>Categoria</Form.Label>
              <Form.Control
                list="categorias-pagar"
                value={form.categoria}
                maxLength={50}
                placeholder="Escolha ou digite"
                isInvalid={mostrar('categoria')}
                onChange={alterar('categoria')}
              />
              <datalist id="categorias-pagar">
                {CATEGORIAS_PAGAR.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <Form.Control.Feedback type="invalid">Informe a categoria.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-sm-6" controlId="pagar-fornecedor">
              <Form.Label>
                Fornecedor <span className="text-secondary fw-normal">(opcional)</span>
              </Form.Label>
              <Form.Control
                value={form.fornecedor}
                maxLength={150}
                onChange={alterar('fornecedor')}
              />
            </Form.Group>
            <Form.Group className="col-sm-6" controlId="pagar-valor">
              <Form.Label>Valor</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>R$</InputGroup.Text>
                <Form.Control
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  isInvalid={mostrar('valor')}
                  onChange={alterar('valor')}
                />
                <Form.Control.Feedback type="invalid">
                  Informe um valor maior que zero, com até 2 casas decimais.
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Form.Group className="col-sm-6" controlId="pagar-vencimento">
              <Form.Label>Vencimento</Form.Label>
              <Form.Control
                type="date"
                value={form.vencimento}
                max={limite}
                isInvalid={mostrar('vencimento')}
                onChange={alterar('vencimento')}
              />
              <Form.Control.Feedback type="invalid">
                {form.vencimento ? 'Data muito distante. Confira o ano.' : 'Informe o vencimento.'}
              </Form.Control.Feedback>
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
            {salvando ? <Spinner size="sm" /> : nova ? 'Cadastrar conta' : 'Salvar alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
