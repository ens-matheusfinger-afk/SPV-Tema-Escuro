import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import SeletorCliente from '../pedidos/components/SeletorCliente/SeletorCliente'
import { mensagemDeErro } from '../../services/api'
import { hojeISO } from '../../utils/formatters'
import { lerNumero, somarDias, valorMonetarioValido } from '../../utils/validacoes'

/*
 * SPV-85 — conta a receber AVULSA (sem pedido): serviço rápido, venda antiga, acerto...
 * As contas dos pedidos não passam por aqui: o banco cria e atualiza sozinho.
 */
export default function ContaReceberFormModal({ conta, clientes, aoSalvar, aoFechar }) {
  const nova = !conta
  const [form, setForm] = useState({
    idCliente: conta?.idCliente ? String(conta.idCliente) : '',
    descricao: conta?.descricao ?? '',
    valor: conta ? conta.valor.toFixed(2) : '',
    vencimento: conta?.vencimento ?? '',
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const limite = somarDias(hojeISO(), 3 * 365)
  const erros = {
    idCliente: !form.idCliente,
    descricao: form.descricao.trim().length < 2,
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
            {nova ? 'Nova conta a receber (avulsa)' : 'Editar conta a receber'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-secondary">
            Contas de pedidos são criadas sozinhas. Use esta opção para valores fora de pedido.
          </p>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="cliente">
                Cliente
              </label>
              <SeletorCliente
                clientes={clientes}
                valor={form.idCliente}
                invalido={mostrar('idCliente')}
                aoMudar={(id) => setForm({ ...form, idCliente: id })}
              />
            </div>
            <Form.Group className="col-12" controlId="receber-descricao">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                value={form.descricao}
                maxLength={255}
                placeholder="Ex.: Conserto de 5 uniformes"
                isInvalid={mostrar('descricao')}
                onChange={alterar('descricao')}
              />
              <Form.Control.Feedback type="invalid">Informe a descrição.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-sm-6" controlId="receber-valor">
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
            <Form.Group className="col-sm-6" controlId="receber-vencimento">
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
