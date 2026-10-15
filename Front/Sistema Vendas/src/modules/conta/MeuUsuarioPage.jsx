import { useState } from 'react'
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import { alterarMinhaSenha } from '../../services/usuariosService'
import { mensagemDeErro, USANDO_MOCK } from '../../services/api'
import { resetarBancoMock } from '../../mocks/bancoMock'
import { GRUPOS_DE_TELAS, TAMANHO_MINIMO_SENHA } from '../../utils/constants'
import { iniciais } from '../../utils/formatters'

const SENHAS_VAZIAS = { atual: '', nova: '', confirmar: '' }

// Acesso ao próprio usuário: ver dados e alterar a senha
export default function MeuUsuarioPage() {
  const { usuario, logout } = useAuth()
  const notificar = useNotificacao()

  const [senhas, setSenhas] = useState(SENHAS_VAZIAS)
  const [mostrarSenhas, setMostrarSenhas] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmarReset, setConfirmarReset] = useState(false)

  const erros = {
    atual: !senhas.atual,
    nova: senhas.nova.length < TAMANHO_MINIMO_SENHA || senhas.nova === senhas.atual,
    confirmar: senhas.confirmar !== senhas.nova,
  }
  const valido = !Object.values(erros).some(Boolean)
  const mostrar = (campo) => tentou && erros[campo]
  const tipo = mostrarSenhas ? 'text' : 'password'

  const alterar = (campo) => (e) => setSenhas({ ...senhas, [campo]: e.target.value })

  const salvar = async (e) => {
    e.preventDefault()
    setTentou(true)
    setErro('')
    if (!valido) return
    setSalvando(true)
    try {
      await alterarMinhaSenha(usuario.id, senhas.atual, senhas.nova)
      notificar('Senha alterada com sucesso.')
      setSenhas(SENHAS_VAZIAS)
      setTentou(false)
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setSalvando(false)
    }
  }

  const telasLiberadas = GRUPOS_DE_TELAS.flatMap((g) => g.telas).filter(([tela]) =>
    usuario.telas.includes(tela),
  )

  return (
    <>
      <PageHeader titulo="Meu usuário" subtitulo="Seus dados de acesso e troca de senha" />

      <div className="row g-3">
        <div className="col-lg-6">
          <section className="spv-card h-100">
            <div className="spv-card-header">
              <i className="bi bi-person text-secondary" aria-hidden="true"></i>
              <h2>Meus dados</h2>
            </div>
            <div className="spv-card-body">
              <div className="d-flex align-items-center gap-3 mb-4">
                <span
                  className="spv-avatar"
                  style={{ width: '3.2rem', height: '3.2rem', fontSize: '1.1rem' }}
                >
                  {iniciais(usuario.nome)}
                </span>
                <div>
                  <div className="fw-bold fs-5">{usuario.nome}</div>
                  <div className="text-secondary">{usuario.perfilNome}</div>
                </div>
              </div>

              <dl className="row small mb-0">
                <dt className="col-4 spv-dado-rotulo">Login</dt>
                <dd className="col-8">{usuario.login}</dd>
                <dt className="col-4 spv-dado-rotulo">Situação</dt>
                <dd className="col-8">
                  <span className="badge rounded-pill text-bg-success">Ativo</span>
                </dd>
                <dt className="col-4 spv-dado-rotulo">Telas liberadas</dt>
                <dd className="col-8 mb-0">
                  {telasLiberadas.length === 0 ? (
                    <span className="text-secondary">
                      Nenhuma tela liberada. Fale com o administrador.
                    </span>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {telasLiberadas.map(([tela, rotulo]) => (
                        <li key={tela}>
                          <i className="bi bi-check2 text-success me-1" aria-hidden="true"></i>
                          {rotulo}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </dl>
              <p className="small text-secondary mt-3 mb-0">
                Para mudar nome, login ou permissões, fale com o administrador do sistema.
              </p>
            </div>
          </section>
        </div>

        <div className="col-lg-6">
          <section className="spv-card">
            <div className="spv-card-header">
              <i className="bi bi-key text-secondary" aria-hidden="true"></i>
              <h2>Alterar senha</h2>
            </div>
            <Form className="spv-card-body" onSubmit={salvar} noValidate>
              <Form.Group className="mb-3" controlId="senha-atual">
                <Form.Label>Senha atual</Form.Label>
                <Form.Control
                  type={tipo}
                  autoComplete="current-password"
                  value={senhas.atual}
                  isInvalid={mostrar('atual')}
                  onChange={alterar('atual')}
                />
                <Form.Control.Feedback type="invalid">Informe a senha atual.</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3" controlId="senha-nova">
                <Form.Label>Nova senha</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type={tipo}
                    autoComplete="new-password"
                    value={senhas.nova}
                    isInvalid={mostrar('nova')}
                    onChange={alterar('nova')}
                  />
                  <Button
                    variant="light"
                    className="border"
                    aria-label={mostrarSenhas ? 'Esconder senhas' : 'Mostrar senhas'}
                    onClick={() => setMostrarSenhas(!mostrarSenhas)}
                  >
                    <i className={`bi ${mostrarSenhas ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {senhas.nova && senhas.nova === senhas.atual
                      ? 'A nova senha precisa ser diferente da atual.'
                      : `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              <Form.Group className="mb-3" controlId="senha-confirmar">
                <Form.Label>Confirmar nova senha</Form.Label>
                <Form.Control
                  type={tipo}
                  autoComplete="new-password"
                  value={senhas.confirmar}
                  isInvalid={mostrar('confirmar')}
                  onChange={alterar('confirmar')}
                />
                <Form.Control.Feedback type="invalid">
                  As senhas não conferem.
                </Form.Control.Feedback>
              </Form.Group>

              {erro && (
                <Alert variant="danger" className="small py-2">
                  {erro}
                </Alert>
              )}

              <Button type="submit" disabled={salvando}>
                {salvando ? <Spinner size="sm" /> : 'Alterar senha'}
              </Button>
            </Form>
          </section>

          {USANDO_MOCK && (
            <section className="spv-card mt-3">
              <div className="spv-card-header">
                <i className="bi bi-database text-secondary" aria-hidden="true"></i>
                <h2>Modo de teste</h2>
              </div>
              <div className="spv-card-body small">
                <p className="text-secondary">
                  O sistema está usando dados de exemplo salvos neste navegador (sem Back). Pedidos
                  e usuários que você criou ficam guardados aqui até restaurar.
                </p>
                <Button size="sm" variant="outline-danger" onClick={() => setConfirmarReset(true)}>
                  Restaurar dados de exemplo
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmModal
        aberto={confirmarReset}
        titulo="Restaurar dados de exemplo"
        textoConfirmar="Restaurar"
        aoFechar={() => setConfirmarReset(false)}
        aoConfirmar={async () => {
          resetarBancoMock()
          logout('Os dados de exemplo foram restaurados. Entre novamente (senha 123).')
        }}
      >
        <p className="mb-0">
          Tudo o que foi criado ou alterado no modo de teste será apagado e os dados de exemplo
          voltam ao original.
        </p>
      </ConfirmModal>
    </>
  )
}
