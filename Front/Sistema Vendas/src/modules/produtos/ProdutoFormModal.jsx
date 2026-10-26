import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap'
import { mensagemDeErro } from '../../services/api'
import {
  inteiroNaoNegativo,
  lerNumero,
  nomeEmUso,
  valorMonetarioValido,
} from '../../utils/validacoes'

/*
 * Cadastro e edição de produto (SPV-61 sem estoque / SPV-62 com estoque controlado — REQ007).
 * produto = null -> novo produto.
 * Com "controla estoque" ligado, pede saldo inicial (só na criação), mínimo e máximo (REQ017).
 */
export default function ProdutoFormModal({ produto, produtosExistentes, aoSalvar, aoFechar }) {
  const novo = !produto
  const tinhaEstoque = Boolean(produto?.estoque)

  const [form, setForm] = useState({
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    valor: produto ? String(produto.valor) : '',
    controlaEstoque: produto?.controlaEstoque ?? false,
    estoqueInicial: '0',
    estoqueMinimo: String(produto?.estoque?.minimo ?? 0),
    estoqueMaximo:
      produto?.estoque?.maximo === null || produto?.estoque?.maximo === undefined
        ? ''
        : String(produto.estoque.maximo),
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Saldo inicial só aparece quando o estoque vai ser criado agora
  const pedeSaldoInicial = form.controlaEstoque && !tinhaEstoque
  const vaiDescartarSaldo = !form.controlaEstoque && tinhaEstoque

  const minimo = lerNumero(form.estoqueMinimo)
  const maximo = lerNumero(form.estoqueMaximo)
  const nomeRepetido = nomeEmUso(form.nome, produtosExistentes, produto?.id)

  const erros = {
    nome: form.nome.trim().length < 2 || nomeRepetido,
    valor: !valorMonetarioValido(form.valor),
    estoqueInicial: pedeSaldoInicial && !inteiroNaoNegativo(form.estoqueInicial),
    estoqueMinimo: form.controlaEstoque && !inteiroNaoNegativo(form.estoqueMinimo),
    estoqueMaximo:
      form.controlaEstoque &&
      (!inteiroNaoNegativo(form.estoqueMaximo, { obrigatorio: false }) ||
        (form.estoqueMaximo.trim() !== '' && maximo < minimo)),
  }
  const valido = !Object.values(erros).some(Boolean)
  const mostrar = (campo) => tentou && erros[campo]

  const alterar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

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
        controlaEstoque: form.controlaEstoque,
        estoqueInicial: pedeSaldoInicial ? lerNumero(form.estoqueInicial) : undefined,
        estoqueMinimo: form.controlaEstoque ? minimo : undefined,
        estoqueMaximo: form.controlaEstoque && form.estoqueMaximo.trim() !== '' ? maximo : null,
      })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} size="lg" backdrop="static">
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">
            {novo ? 'Novo produto' : `Editar produto: ${produto.nome}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <Form.Group className="col-md-8" controlId="produto-nome">
              <Form.Label>Nome do produto</Form.Label>
              <Form.Control
                value={form.nome}
                maxLength={150}
                isInvalid={mostrar('nome') || (form.nome && nomeRepetido)}
                onChange={alterar('nome')}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                {nomeRepetido
                  ? 'Já existe um produto com este nome.'
                  : 'Informe o nome (pelo menos 2 letras).'}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-md-4" controlId="produto-valor">
              <Form.Label>Valor de venda</Form.Label>
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

            <Form.Group className="col-12" controlId="produto-descricao">
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

          <hr />

          <Form.Check
            type="switch"
            id="produto-controla-estoque"
            label={
              <>
                <strong>Controlar estoque deste produto</strong>
                <div className="small text-secondary">
                  {form.controlaEstoque
                    ? 'Produto de pronta entrega: o saldo baixa sozinho a cada pedido e o sistema não deixa vender sem saldo.'
                    : 'Produto sob encomenda / confecção: feito a cada pedido, sem saldo em estoque.'}
                </div>
              </>
            }
            checked={form.controlaEstoque}
            onChange={alterar('controlaEstoque')}
          />

          {vaiDescartarSaldo && (
            <Alert variant="warning" className="small mt-3 mb-0">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
              Ao salvar, o controle de estoque deste produto será removido e o saldo atual (
              <strong>{produto.estoque.atual} un.</strong>) será descartado.
            </Alert>
          )}

          {form.controlaEstoque && (
            <div className="row g-3 mt-1">
              {pedeSaldoInicial ? (
                <Form.Group className="col-md-4" controlId="produto-estoque-inicial">
                  <Form.Label>Saldo inicial</Form.Label>
                  <InputGroup hasValidation>
                    <Form.Control
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={form.estoqueInicial}
                      isInvalid={mostrar('estoqueInicial')}
                      onChange={alterar('estoqueInicial')}
                    />
                    <InputGroup.Text>un.</InputGroup.Text>
                    <Form.Control.Feedback type="invalid">
                      Use um número inteiro, 0 ou mais.
                    </Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text>Quantas unidades você tem hoje.</Form.Text>
                </Form.Group>
              ) : (
                <div className="col-md-4">
                  <div className="form-label">Saldo atual</div>
                  <div className="fs-5 fw-bold">{produto.estoque.atual} un.</div>
                  <div className="form-text">Atualizado automaticamente pelos pedidos.</div>
                </div>
              )}

              <Form.Group className="col-md-4" controlId="produto-estoque-minimo">
                <Form.Label>Estoque mínimo</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.estoqueMinimo}
                    isInvalid={mostrar('estoqueMinimo')}
                    onChange={alterar('estoqueMinimo')}
                  />
                  <InputGroup.Text>un.</InputGroup.Text>
                  <Form.Control.Feedback type="invalid">
                    Use um número inteiro, 0 ou mais.
                  </Form.Control.Feedback>
                </InputGroup>
                <Form.Text>Abaixo disso, o produto aparece em alerta.</Form.Text>
              </Form.Group>

              <Form.Group className="col-md-4" controlId="produto-estoque-maximo">
                <Form.Label>
                  Estoque máximo <span className="text-secondary fw-normal">(opcional)</span>
                </Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.estoqueMaximo}
                    isInvalid={mostrar('estoqueMaximo')}
                    onChange={alterar('estoqueMaximo')}
                  />
                  <InputGroup.Text>un.</InputGroup.Text>
                  <Form.Control.Feedback type="invalid">
                    Use um número inteiro, maior ou igual ao mínimo.
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
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
          <Button type="submit" disabled={salvando}>
            {salvando ? <Spinner size="sm" /> : novo ? 'Cadastrar produto' : 'Salvar alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
