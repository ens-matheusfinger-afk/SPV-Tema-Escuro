import { useState } from 'react'
import { Alert, Button, ButtonGroup, Form, Modal, Spinner, ToggleButton } from 'react-bootstrap'
import ConfiancaCliente from '../../components/ConfiancaCliente/ConfiancaCliente'
import { mensagemDeErro } from '../../services/api'
import { FATOR_CONFIANCA } from '../../services/clientesService'
import {
  formatarDocumento,
  formatarTelefone,
  mascaraDocumento,
  mascaraTelefone,
} from '../../utils/formatters'
import {
  cnpjValido,
  cpfValido,
  emailValido,
  somenteDigitos,
  telefoneValido,
} from '../../utils/validacoes'

const OBSERVACAO_MAXIMA = 500

/*
 * Cadastro e edição de cliente — pessoa física (CPF) ou jurídica (CNPJ).
 * SPV-119: observação e fator de confiança (1 a 5).
 * cliente = null -> novo cliente.
 */
export default function ClienteFormModal({ cliente, clientesExistentes, aoSalvar, aoFechar }) {
  const novo = !cliente
  const [form, setForm] = useState({
    tipo: cliente?.tipo ?? 'PF',
    nome: cliente?.nome ?? '',
    documento: cliente?.documento ? formatarDocumento(cliente.documento) : '',
    nomeFantasia: cliente?.nomeFantasia ?? '',
    telefone: cliente?.telefone ? formatarTelefone(cliente.telefone) : '',
    email: cliente?.email ?? '',
    fatorConfianca: cliente?.fatorConfianca ?? 3,
    observacao: cliente?.observacao ?? '',
    ativo: cliente?.ativo ?? true,
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const pj = form.tipo === 'PJ'
  const numeroDoc = somenteDigitos(form.documento)
  // Mesmo CPF/CNPJ em outro cliente (aviso na hora; o Back confere de novo ao salvar)
  const dono = clientesExistentes.find(
    (c) => c.id !== cliente?.id && c.tipo === form.tipo && c.documento === numeroDoc,
  )
  const semContato = !somenteDigitos(form.telefone) && !form.email.trim()

  const erros = {
    nome: form.nome.trim().length < 2,
    documento: !(pj ? cnpjValido(numeroDoc) : cpfValido(numeroDoc)) || Boolean(dono),
    telefone: !telefoneValido(form.telefone) || semContato,
    email: !emailValido(form.email) || semContato,
    observacao: form.observacao.length > OBSERVACAO_MAXIMA,
  }
  const valido = !Object.values(erros).some(Boolean)
  const mostrar = (campo) => tentou && erros[campo]

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const trocarTipo = (tipo) =>
    setForm({ ...form, tipo, documento: mascaraDocumento(tipo, form.documento) })

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (!valido) return
    setSalvando(true)
    setErro('')
    try {
      await aoSalvar(form)
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSalvando(false)
    }
  }

  const mensagemDocumento = dono
    ? `Este ${pj ? 'CNPJ' : 'CPF'} já é do cliente "${dono.nome}".`
    : numeroDoc.length === 0
      ? `Informe o ${pj ? 'CNPJ' : 'CPF'}.`
      : `${pj ? 'CNPJ' : 'CPF'} inválido. Confira os números digitados.`

  return (
    <Modal show onHide={salvando ? undefined : aoFechar} backdrop="static" size="lg">
      <Form onSubmit={salvar} noValidate>
        <Modal.Header closeButton={!salvando}>
          <Modal.Title className="h5">
            {novo ? 'Novo cliente' : `Editar cliente: ${cliente.nome}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-12">
              <ButtonGroup aria-label="Tipo de cliente">
                {[
                  ['PF', 'bi-person', 'Pessoa física (CPF)'],
                  ['PJ', 'bi-building', 'Pessoa jurídica (CNPJ)'],
                ].map(([tipo, icone, rotulo]) => (
                  <ToggleButton
                    key={tipo}
                    id={`cliente-tipo-${tipo}`}
                    type="radio"
                    name="cliente-tipo"
                    value={tipo}
                    variant={form.tipo === tipo ? 'primary' : 'outline-primary'}
                    checked={form.tipo === tipo}
                    onChange={() => trocarTipo(tipo)}
                  >
                    <i className={`bi ${icone} me-1`} aria-hidden="true"></i>
                    {rotulo}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </div>

            <Form.Group className="col-md-8" controlId="cliente-nome">
              <Form.Label>{pj ? 'Razão social' : 'Nome completo'}</Form.Label>
              <Form.Control
                value={form.nome}
                maxLength={150}
                isInvalid={mostrar('nome')}
                onChange={alterar('nome')}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">
                Informe o nome (pelo menos 2 letras).
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-md-4" controlId="cliente-documento">
              <Form.Label>{pj ? 'CNPJ' : 'CPF'}</Form.Label>
              <Form.Control
                inputMode="numeric"
                placeholder={pj ? '00.000.000/0000-00' : '000.000.000-00'}
                value={form.documento}
                isInvalid={mostrar('documento') || Boolean(dono)}
                onChange={(e) =>
                  setForm({ ...form, documento: mascaraDocumento(form.tipo, e.target.value) })
                }
              />
              <Form.Control.Feedback type="invalid">{mensagemDocumento}</Form.Control.Feedback>
            </Form.Group>

            {pj && (
              <Form.Group className="col-12" controlId="cliente-fantasia">
                <Form.Label>
                  Nome fantasia <span className="text-secondary fw-normal">(opcional)</span>
                </Form.Label>
                <Form.Control
                  value={form.nomeFantasia}
                  maxLength={150}
                  onChange={alterar('nomeFantasia')}
                />
              </Form.Group>
            )}

            <Form.Group className="col-md-5" controlId="cliente-telefone">
              <Form.Label>Telefone / WhatsApp</Form.Label>
              <Form.Control
                type="tel"
                inputMode="tel"
                placeholder="(41) 99999-0000"
                value={form.telefone}
                isInvalid={mostrar('telefone')}
                onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
              />
              <Form.Control.Feedback type="invalid">
                {semContato
                  ? 'Informe o telefone ou o e-mail.'
                  : 'Use DDD + número (10 ou 11 dígitos).'}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="col-md-7" controlId="cliente-email">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                maxLength={100}
                placeholder="nome@email.com"
                value={form.email}
                isInvalid={mostrar('email')}
                onChange={alterar('email')}
              />
              <Form.Control.Feedback type="invalid">
                {semContato ? 'Informe o telefone ou o e-mail.' : 'E-mail inválido.'}
              </Form.Control.Feedback>
            </Form.Group>

            <div className="col-12">
              <div className="form-label" id="cliente-confianca-rotulo">
                Fator de confiança
              </div>
              <div
                className="d-flex flex-wrap align-items-center gap-2"
                role="radiogroup"
                aria-labelledby="cliente-confianca-rotulo"
              >
                <ButtonGroup size="sm">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <ToggleButton
                      key={n}
                      id={`cliente-confianca-${n}`}
                      type="radio"
                      name="cliente-confianca"
                      value={n}
                      variant={
                        form.fatorConfianca === n
                          ? FATOR_CONFIANCA[n].cor
                          : `outline-${FATOR_CONFIANCA[n].cor}`
                      }
                      checked={form.fatorConfianca === n}
                      onChange={() => setForm({ ...form, fatorConfianca: n })}
                      title={FATOR_CONFIANCA[n].nome}
                    >
                      {n}
                    </ToggleButton>
                  ))}
                </ButtonGroup>
                <ConfiancaCliente fator={form.fatorConfianca} />
              </div>
              <Form.Text>
                1–2: o atendente vê um aviso ao abrir pedido para este cliente. Use a observação
                para explicar o motivo.
              </Form.Text>
            </div>

            <Form.Group className="col-12" controlId="cliente-observacao">
              <Form.Label>
                Observação <span className="text-secondary fw-normal">(opcional)</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Ex.: só paga na retirada, prefere contato pelo WhatsApp, falar com..."
                value={form.observacao}
                isInvalid={mostrar('observacao')}
                onChange={alterar('observacao')}
              />
              <Form.Text className={erros.observacao ? 'text-danger' : ''}>
                {form.observacao.length}/{OBSERVACAO_MAXIMA}
              </Form.Text>
            </Form.Group>

            {!novo && (
              <div className="col-12">
                <Form.Check
                  type="switch"
                  id="cliente-ativo"
                  label="Cliente ativo (aparece na escolha de cliente do novo pedido)"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
              </div>
            )}
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
            {salvando ? <Spinner size="sm" /> : novo ? 'Cadastrar cliente' : 'Salvar alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
