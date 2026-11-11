import { useState } from 'react'
import { matchPath, Navigate, useLocation } from 'react-router-dom'
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/Logo/Logo'
import { USANDO_MOCK } from '../../services/api'
import { ROTAS } from '../../routes/rotas'
import './LoginPage.css'

// Volta para a tela que a pessoa tentou abrir, mas só se o usuário que entrou tiver acesso a ela
function destinoPermitido(usuario, de) {
  if (!de) return '/'
  const rota = ROTAS.find((r) => matchPath({ path: r.path, end: true }, de))
  if (!rota) return '/'
  return rota.tela == null || usuario.telas.includes(rota.tela) ? de : '/'
}

// Tela 1 do protótipo — Login do Usuário (REQ003)
export default function LoginPage() {
  const { usuario, aviso, login } = useAuth()
  const location = useLocation()

  const [form, setForm] = useState({ login: '', senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Depois do login (ou se já estiver logado) sai da tela de login
  if (usuario) return <Navigate to={destinoPermitido(usuario, location.state?.de)} replace />

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const entrar = async (e) => {
    e.preventDefault()
    if (!form.login.trim() || !form.senha) {
      setErro('Preencha usuário e senha.')
      return
    }

    setEnviando(true)
    const resultado = await login(form.login, form.senha)
    setEnviando(false)

    if (!resultado.ok) setErro(resultado.erro)
  }

  return (
    <div className="spv-login">
      {/* Lado esquerdo (só em telas grandes): apresentação do sistema */}
      <aside className="spv-login-vitrine" aria-hidden="true">
        <div className="spv-login-marca">
          <span className="spv-login-logo">
            <Logo tamanho={34} />
          </span>
          <span>SYS VENDAS</span>
        </div>

        <div>
          <h2 className="spv-login-chamada">
            Do pedido ao <span>fechamento do caixa</span>, num lugar só.
          </h2>
          <ul className="spv-login-etapas">
            <li>
              <i className="bi bi-receipt"></i>Pedidos e clientes
            </li>
            <li>
              <i className="bi bi-gear-wide-connected"></i>Produção e conferência
            </li>
            <li>
              <i className="bi bi-cash-coin"></i>Financeiro e indicadores
            </li>
          </ul>
        </div>

        <p className="spv-login-rodape">Sistema de Pedidos e Vendas · UGV</p>
      </aside>

      <main className="spv-login-area">
        <div className="spv-login-card">
          <div className="mb-4">
            <span className="spv-login-logo d-lg-none mb-3">
              <Logo tamanho={34} />
            </span>
            <h1 className="h3 fw-bold mb-1">Entrar</h1>
            <p className="text-secondary mb-0">
              Use o login e a senha cadastrados pelo administrador.
            </p>
          </div>

          {aviso && !erro && (
            <Alert variant="warning" className="small py-2">
              {aviso}
            </Alert>
          )}
          {erro && (
            <Alert variant="danger" className="small py-2">
              {erro}
            </Alert>
          )}

          <Form onSubmit={entrar} noValidate>
            <Form.Group className="mb-3" controlId="login">
              <Form.Label>Usuário</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-person" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  name="login"
                  placeholder="Login do usuário"
                  autoComplete="username"
                  autoFocus
                  value={form.login}
                  onChange={alterar}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-4" controlId="senha">
              <Form.Label>Senha</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-lock" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  name="senha"
                  type="password"
                  placeholder="Senha"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={alterar}
                />
              </InputGroup>
            </Form.Group>

            <Button type="submit" size="lg" className="w-100" disabled={enviando}>
              {enviando ? (
                <Spinner size="sm" />
              ) : (
                <>
                  Entrar <i className="bi bi-arrow-right ms-1" aria-hidden="true"></i>
                </>
              )}
            </Button>
          </Form>

          {USANDO_MOCK && (
            <p className="text-secondary text-center mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
              Modo de teste: admin, atendente, operador, conferente, financeiro ou gerente.
              <br />
              Senha: 123
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
