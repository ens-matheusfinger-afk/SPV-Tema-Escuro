import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import PermissoesTelas from './PermissoesTelas'
import { TAMANHO_MINIMO_SENHA, TELAS } from '../../utils/constants'
import { mensagemDeErro } from '../../services/api'

const LOGIN_VALIDO = /^[a-z0-9._-]{3,50}$/

/*
 * Criação e edição de usuário (Tela 2 do protótipo — REQ001 / REQ002).
 * usuario = null -> novo usuário.
 * ehVoceMesmo -> impede o admin de se desativar ou tirar o próprio acesso a Usuários.
 */
export default function UsuarioFormModal({
  usuario,
  usuariosExistentes,
  ehVoceMesmo,
  aoSalvar,
  aoFechar,
}) {
  const novo = !usuario
  const [form, setForm] = useState({
    nome: usuario?.nome ?? '',
    login: usuario?.login ?? '',
    ativo: usuario?.ativo ?? true,
    telas: usuario?.telas ?? [],
    redefinirSenha: novo,
    senha: '',
    confirmarSenha: '',
  })
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const loginNormalizado = form.login.trim().toLowerCase()
  const loginEmUso = usuariosExistentes.some(
    (u) => u.login === loginNormalizado && u.id !== usuario?.id,
  )

  const erros = {
    nome: !form.nome.trim(),
    login: !LOGIN_VALIDO.test(loginNormalizado) || loginEmUso,
    senha: form.redefinirSenha && form.senha.length < TAMANHO_MINIMO_SENHA,
    confirmarSenha: form.redefinirSenha && form.confirmarSenha !== form.senha,
    telas: form.telas.length === 0,
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
        login: loginNormalizado,
        ativo: form.ativo,
        telas: form.telas,
        senha: form.redefinirSenha ? form.senha : undefined,
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
            {novo ? 'Novo usuário' : `Editar usuário: ${usuario.nome}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <Form.Group className="col-md-7" controlId="usuario-nome">
              <Form.Label>Nome completo</Form.Label>
              <Form.Control
                value={form.nome}
                maxLength={150}
                isInvalid={mostrar('nome')}
                onChange={alterar('nome')}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Informe o nome.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="col-md-5" controlId="usuario-login">
              <Form.Label>Login</Form.Label>
              <Form.Control
                value={form.login}
                maxLength={50}
                autoComplete="off"
                isInvalid={mostrar('login') || (form.login && loginEmUso)}
                onChange={alterar('login')}
              />
              <Form.Control.Feedback type="invalid">
                {loginEmUso
                  ? 'Este login já está em uso.'
                  : 'Use de 3 a 50 caracteres: letras minúsculas, números, ponto, hífen ou _.'}
              </Form.Control.Feedback>
            </Form.Group>

            {!novo && (
              <div className="col-12">
                <Form.Check
                  type="checkbox"
                  id="usuario-redefinir"
                  label="Definir uma nova senha para este usuário"
                  checked={form.redefinirSenha}
                  onChange={alterar('redefinirSenha')}
                />
              </div>
            )}

            {form.redefinirSenha && (
              <>
                <Form.Group className="col-md-6" controlId="usuario-senha">
                  <Form.Label>{novo ? 'Senha' : 'Nova senha'}</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={form.senha}
                    isInvalid={mostrar('senha')}
                    onChange={alterar('senha')}
                  />
                  <Form.Control.Feedback type="invalid">
                    A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="col-md-6" controlId="usuario-confirmar">
                  <Form.Label>Confirmar senha</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmarSenha}
                    isInvalid={mostrar('confirmarSenha')}
                    onChange={alterar('confirmarSenha')}
                  />
                  <Form.Control.Feedback type="invalid">
                    As senhas não conferem.
                  </Form.Control.Feedback>
                </Form.Group>
              </>
            )}

            <div className="col-12">
              <Form.Check
                type="switch"
                id="usuario-ativo"
                label={
                  form.ativo
                    ? 'Usuário ativo (pode entrar no sistema)'
                    : 'Usuário inativo (não consegue entrar)'
                }
                checked={form.ativo}
                disabled={ehVoceMesmo}
                title={ehVoceMesmo ? 'Você não pode desativar o próprio usuário.' : undefined}
                onChange={alterar('ativo')}
              />
            </div>
          </div>

          <hr />
          <h3 className="h6 fw-bold mb-3">Telas que este usuário pode acessar</h3>
          <PermissoesTelas
            telas={form.telas}
            aoMudar={(telas) => setForm({ ...form, telas })}
            travadas={ehVoceMesmo ? [TELAS.USUARIOS] : []}
            invalido={mostrar('telas')}
          />

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
            {salvando ? <Spinner size="sm" /> : novo ? 'Cadastrar usuário' : 'Salvar alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
