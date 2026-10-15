import { useState } from 'react'
import { Button, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import UsuarioFormModal from './UsuarioFormModal'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { useNotificacao } from '../../hooks/useNotificacao'
import {
  alterarStatusUsuario,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
} from '../../services/usuariosService'
import { iniciais, normalizarBusca } from '../../utils/formatters'
import { nomeDoPerfil } from '../../utils/permissoes'

// Gerenciamento de usuários (REQ001 / REQ002)
export default function UsuariosPage() {
  const { usuario: eu, recarregarUsuario } = useAuth()
  const notificar = useNotificacao()
  const { dados: usuarios, carregando, erro, recarregar } = useCarregar(listarUsuarios, [])

  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState('ativos')
  const [formulario, setFormulario] = useState(null) // { usuario } (usuario null = novo)
  const [alterandoStatus, setAlterandoStatus] = useState(null)

  const termo = normalizarBusca(busca)
  const visiveis = (usuarios ?? []).filter(
    (u) =>
      (situacao === 'todos' || (situacao === 'ativos' ? u.ativo : !u.ativo)) &&
      (!termo || normalizarBusca(u.nome).includes(termo) || u.login.includes(termo)),
  )

  const salvar = async (valores) => {
    const editado = formulario.usuario
    if (editado) {
      await atualizarUsuario(editado.id, valores)
      notificar(`Usuário ${valores.nome} atualizado.`)
      if (editado.id === eu.id) await recarregarUsuario()
    } else {
      await criarUsuario(valores)
      notificar(`Usuário ${valores.nome} cadastrado.`)
    }
    setFormulario(null)
    await recarregar(true)
  }

  return (
    <>
      <PageHeader
        titulo="Usuários"
        subtitulo="Quem pode entrar no sistema e quais telas cada um acessa"
      >
        <Button onClick={() => setFormulario({ usuario: null })}>
          <i className="bi bi-person-plus me-1" aria-hidden="true"></i>
          Novo usuário
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <div className="row g-2">
            <div className="col-md-8">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por nome ou login"
                  aria-label="Buscar usuários"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <Form.Select
                aria-label="Situação"
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
              >
                <option value="ativos">Somente ativos</option>
                <option value="inativos">Somente inativos</option>
                <option value="todos">Todos</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando usuários..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-people" titulo="Nenhum usuário encontrado." />
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Login</th>
                  <th className="d-none d-md-table-cell">Perfil</th>
                  <th>Situação</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="spv-avatar">{iniciais(u.nome)}</span>
                        <span className="fw-semibold">
                          {u.nome}
                          {u.id === eu.id && (
                            <span className="badge text-bg-light border ms-2">Você</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="text-secondary">{u.login}</td>
                    <td className="d-none d-md-table-cell">
                      {nomeDoPerfil(u.telas)}
                      <div className="small text-secondary">
                        {u.telas.length} tela(s) liberada(s)
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge rounded-pill ${u.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-1"
                        onClick={() => setFormulario({ usuario: u })}
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Editar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={u.ativo ? 'outline-danger' : 'outline-success'}
                        disabled={u.id === eu.id}
                        title={
                          u.id === eu.id ? 'Você não pode desativar o próprio usuário.' : undefined
                        }
                        onClick={() => setAlterandoStatus(u)}
                      >
                        <i
                          className={`bi ${u.ativo ? 'bi-person-slash' : 'bi-person-check'}`}
                          aria-hidden="true"
                        ></i>
                        <span className="d-none d-lg-inline ms-1">
                          {u.ativo ? 'Desativar' : 'Reativar'}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {usuarios && (
          <div className="px-3 py-2 small text-secondary border-top">
            {visiveis.length} de {usuarios.length} usuário(s)
          </div>
        )}
      </div>

      {formulario && (
        <UsuarioFormModal
          key={formulario.usuario?.id ?? 'novo'}
          usuario={formulario.usuario}
          usuariosExistentes={usuarios ?? []}
          ehVoceMesmo={formulario.usuario?.id === eu.id}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      <ConfirmModal
        aberto={Boolean(alterandoStatus)}
        titulo={alterandoStatus?.ativo ? 'Desativar usuário' : 'Reativar usuário'}
        textoConfirmar={alterandoStatus?.ativo ? 'Desativar' : 'Reativar'}
        variante={alterandoStatus?.ativo ? 'danger' : 'success'}
        aoFechar={() => setAlterandoStatus(null)}
        aoConfirmar={async () => {
          const ativar = !alterandoStatus.ativo
          await alterarStatusUsuario(alterandoStatus, ativar)
          notificar(`Usuário ${alterandoStatus.nome} ${ativar ? 'reativado' : 'desativado'}.`)
          await recarregar(true)
        }}
      >
        {alterandoStatus?.ativo ? (
          <p className="mb-0">
            <strong>{alterandoStatus?.nome}</strong> não vai mais conseguir entrar no sistema. O
            histórico de pedidos dele continua salvo. Você pode reativar quando quiser.
          </p>
        ) : (
          <p className="mb-0">
            <strong>{alterandoStatus?.nome}</strong> volta a poder entrar no sistema com as mesmas
            permissões.
          </p>
        )}
      </ConfirmModal>
    </>
  )
}
