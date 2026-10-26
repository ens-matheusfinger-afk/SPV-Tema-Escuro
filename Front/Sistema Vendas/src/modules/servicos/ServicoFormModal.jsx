import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import { formatarDuracao } from '../../utils/formatters'
import {
  inteiroNaoNegativo,
  lerNumero,
  nomeEmUso,
  valorMonetarioValido,
} from '../../utils/validacoes'

// Duração máxima aceita: 10 dias de trabalho, em minutos (evita digitar horas no lugar de minutos)
const DURACAO_MAXIMA = 14400

/*
 * Cadastro e edição de serviço (SPV-63 — REQ006).
 * servico = null -> novo serviço. A duração estimada é em minutos e é opcional.
 */
export default function ServicoFormModal({ servico, servicosExistentes, aoSalvar, aoFechar }) {
  const novo = !servico
  const [form, setForm] = useState({
    nome: servico?.nome ?? '',
    descricao: servico?.descricao ?? '',
    valor: servico ? String(servico.valor) : '',
    duracaoEstimada: servico?.duracaoEstimada == null ? '' : String(servico.duracaoEstimada),
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const nomeRepetido = nomeEmUso(form.nome, servicosExistentes, servico?.id)
  const temDuracao = form.duracaoEstimada.trim() !== ''

  const erros = {
    nome: form.nome.trim().length < 2 || nomeRepetido,
    valor: !valorMonetarioValido(form.valor),
    duracaoEstimada: !inteiroNaoNegativo(form.duracaoEstimada, {
      obrigatorio: false,
      maximo: DURACAO_MAXIMA,
    }),
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
      await aoSalvar({
        nome: form.nome,
        descricao: form.descricao,
        valor: lerNumero(form.valor),
        duracaoEstimada: temDuracao ? lerNumero(form.duracaoEstimada) : null,
      })
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
            {novo ? 'Novo serviço' : `Editar serviço: ${servico.nome}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <Form.Group className="col-12" controlId="servico-nome">
              <Form.Label>Nome do serviço</Form.Label>
              <Form.Control
                value={form.nome}
                maxLength={150}
                isInvalid={mostrar('nome') || (form.nome && nomeRepetido)}
                onChange={alterar('nome')}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {nomeRepetido
                  ? 'Já existe um serviço com este nome.'
                  : 'Informe o nome (pelo menos 2 letras).'}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-sm-6" controlId="servico-valor">
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

            <Form.Group className="col-sm-6" controlId="servico-duracao">
              <Form.Label>
                Duração estimada <span className="text-secondary fw-normal">(opcional)</span>
              </Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.duracaoEstimada}
                  isInvalid={mostrar('duracaoEstimada')}
                  onChange={alterar('duracaoEstimada')}
                />
                <InputGroup.Text>min</InputGroup.Text>
                <Form.Control.Feedback type="invalid">
                  Use minutos inteiros, de 0 a {DURACAO_MAXIMA}.
                </Form.Control.Feedback>
              </InputGroup>
              <Form.Text>
                {temDuracao && !erros.duracaoEstimada
                  ? `= ${formatarDuracao(lerNumero(form.duracaoEstimada))}`
                  : 'Usado para planejar a produção.'}
              </Form.Text>
            </Form.Group>

            <Form.Group className="col-12" controlId="servico-descricao">
              <Form.Label>
                Descrição <span className="text-secondary fw-normal">(opcional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={255}
                value={form.descricao}
                onChange={alterar('descricao')}
              />
              <Form.Text>{form.descricao.length}/255</Form.Text>
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
            {salvando ? <Spinner size="sm" /> : novo ? 'Cadastrar serviço' : 'Salvar alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
