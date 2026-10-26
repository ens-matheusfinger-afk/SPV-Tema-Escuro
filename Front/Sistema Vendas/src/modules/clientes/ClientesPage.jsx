import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dropdown, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import ConfiancaCliente from '../../components/ConfiancaCliente/ConfiancaCliente'
import ClienteFormModal from './ClienteFormModal'
import { exportarClientes } from './exportarClientes'
import { RESUMO_VAZIO, resumirPedidosPorCliente } from './resumoClientes'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import { mensagemDeErro } from '../../services/api'
import {
  CONFIANCA_DE_ATENCAO,
  alterarStatusCliente,
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
} from '../../services/clientesService'
import { listarPedidos } from '../../services/pedidosService'
import { TELAS } from '../../utils/constants'
import {
  formatarDocumento,
  formatarMoeda,
  formatarTelefone,
  normalizarBusca,
} from '../../utils/formatters'
import './ClientesPage.css'

const SITUACOES = {
  ativos: (c) => c.ativo,
  inativos: (c) => !c.ativo,
  todos: () => true,
}

/*
 * Cadastro de clientes pessoa física (CPF) e jurídica (CNPJ).
 * SPV-119: observação e fator de confiança | SPV-105: exportar para Excel.
 */
export default function ClientesPage() {
  const notificar = useNotificacao()
  const { podeAcessar } = useAuth()
  const vePedidos = podeAcessar(TELAS.PEDIDOS)

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const [clientes, pedidos] = await Promise.all([
      listarClientes(),
      vePedidos ? listarPedidos() : Promise.resolve([]),
    ])
    const resumos = resumirPedidosPorCliente(pedidos)
    return clientes.map((c) => ({ ...c, resumo: resumos.get(c.id) ?? RESUMO_VAZIO }))
  }, [])

  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [situacao, setSituacao] = useState('ativos')
  const [soAtencao, setSoAtencao] = useState(false)
  const [formulario, setFormulario] = useState(null) // { cliente } (null = novo)
  const [excluindo, setExcluindo] = useState(null)

  const lista = dados ?? []
  const termo = normalizarBusca(busca)
  const numeros = busca.replace(/\D/g, '')
  const visiveis = lista.filter(
    (c) =>
      SITUACOES[situacao](c) &&
      (!tipo || c.tipo === tipo) &&
      (!soAtencao || c.fatorConfianca <= CONFIANCA_DE_ATENCAO) &&
      (!termo ||
        normalizarBusca(c.nome).includes(termo) ||
        normalizarBusca(c.nomeFantasia).includes(termo) ||
        normalizarBusca(c.email).includes(termo) ||
        (numeros.length >= 3 && (c.documento.includes(numeros) || c.telefone.includes(numeros)))),
  )
  const contar = (filtro) => lista.filter(filtro).length
  const emAtencao = contar((c) => c.ativo && c.fatorConfianca <= CONFIANCA_DE_ATENCAO)

  const salvar = async (valores) => {
    const editado = formulario.cliente
    if (editado) {
      await atualizarCliente(editado.id, valores)
      notificar(`Cliente ${valores.nome.trim()} atualizado.`)
    } else {
      await criarCliente(valores)
      notificar(`Cliente ${valores.nome.trim()} cadastrado.`)
    }
    setFormulario(null)
    await recarregar(true)
  }

  const alternarAtivo = async (c) => {
    try {
      await alterarStatusCliente(c.id, !c.ativo)
      notificar(`Cliente ${c.nome} ${c.ativo ? 'inativado' : 'reativado'}.`)
      await recarregar(true)
    } catch (e) {
      notificar(mensagemDeErro(e), 'danger')
    }
  }

  return (
    <>
      <PageHeader
        titulo="Clientes"
        subtitulo="Cadastro de clientes pessoa física (CPF) e jurídica (CNPJ)"
      >
        <BotaoExportar quantidade={visiveis.length} aoExportar={() => exportarClientes(visiveis)} />
        <Button onClick={() => setFormulario({ cliente: null })}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
          Novo cliente
        </Button>
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <div className="row g-2 align-items-center">
            <div className="col-lg-5">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail"
                  aria-label="Buscar clientes"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-6 col-lg-2">
              <Form.Select
                aria-label="Tipo de cliente"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">PF e PJ</option>
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </Form.Select>
            </div>
            <div className="col-6 col-lg-2">
              <Form.Select
                aria-label="Situação do cliente"
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
              >
                <option value="ativos">Ativos ({contar(SITUACOES.ativos)})</option>
                <option value="inativos">Inativos ({contar(SITUACOES.inativos)})</option>
                <option value="todos">Todos ({lista.length})</option>
              </Form.Select>
            </div>
            <div className="col-lg-3">
              <Form.Check
                type="switch"
                id="filtro-atencao"
                label={`Só confiança baixa (${emAtencao})`}
                checked={soAtencao}
                onChange={(e) => setSoAtencao(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Carregando clientes..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-person-vcard" titulo="Nenhum cliente encontrado.">
            {lista.length === 0
              ? 'Cadastre o primeiro cliente no botão "Novo cliente".'
              : 'Ajuste a busca ou os filtros.'}
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela spv-clientes">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="d-none d-md-table-cell">Contato</th>
                  <th>Confiança</th>
                  {vePedidos && <th className="text-end d-none d-lg-table-cell">Pedidos</th>}
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => (
                  <tr key={c.id} className={c.ativo ? '' : 'spv-cliente-inativo'}>
                    <td>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-semibold">{c.nome}</span>
                        <span className="badge rounded-pill text-bg-light border">
                          {c.tipo ?? '—'}
                        </span>
                        {!c.ativo && (
                          <span className="badge rounded-pill text-bg-secondary">Inativo</span>
                        )}
                      </div>
                      <div className="small text-secondary">
                        {[
                          c.documento &&
                            `${c.tipo === 'PJ' ? 'CNPJ' : 'CPF'} ${formatarDocumento(c.documento)}`,
                          c.nomeFantasia,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sem CPF/CNPJ'}
                      </div>
                      {c.observacao && (
                        <div className="small spv-cliente-obs" title={c.observacao}>
                          <i className="bi bi-chat-left-text me-1" aria-hidden="true"></i>
                          {c.observacao}
                        </div>
                      )}
                    </td>
                    <td className="d-none d-md-table-cell small">
                      {c.telefone && (
                        <div className="text-nowrap">
                          <i className="bi bi-telephone me-1 text-secondary" aria-hidden="true"></i>
                          {formatarTelefone(c.telefone)}
                        </div>
                      )}
                      {c.email && (
                        <div className="text-truncate" style={{ maxWidth: 220 }}>
                          <i className="bi bi-envelope me-1 text-secondary" aria-hidden="true"></i>
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <ConfiancaCliente fator={c.fatorConfianca} />
                    </td>
                    {vePedidos && (
                      <td className="text-end d-none d-lg-table-cell small text-nowrap">
                        {c.resumo.pedidos === 0 ? (
                          <span className="text-secondary">nenhum</span>
                        ) : (
                          <>
                            <div>
                              {c.resumo.pedidos} pedido(s)
                              {c.resumo.abertos > 0 && ` · ${c.resumo.abertos} em aberto`}
                            </div>
                            <div className="text-secondary">
                              comprado {formatarMoeda(c.resumo.comprado)}
                            </div>
                          </>
                        )}
                      </td>
                    )}
                    <td className="text-end text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-1"
                        onClick={() => setFormulario({ cliente: c })}
                      >
                        <i className="bi bi-pencil" aria-hidden="true"></i>
                        <span className="d-none d-lg-inline ms-1">Editar</span>
                      </Button>
                      <Dropdown className="d-inline-block" align="end">
                        <Dropdown.Toggle size="sm" variant="light" className="border">
                          Mais
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {vePedidos && (
                            <>
                              <Dropdown.Item as={Link} to={`/pedidos/cliente?id=${c.id}`}>
                                <i className="bi bi-receipt me-2" aria-hidden="true"></i>
                                Ver pedidos
                              </Dropdown.Item>
                              {c.ativo && (
                                <Dropdown.Item as={Link} to={`/pedidos/novo?cliente=${c.id}`}>
                                  <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
                                  Novo pedido
                                </Dropdown.Item>
                              )}
                              <Dropdown.Divider />
                            </>
                          )}
                          <Dropdown.Item onClick={() => alternarAtivo(c)}>
                            <i
                              className={`bi ${c.ativo ? 'bi-person-dash' : 'bi-person-check'} me-2`}
                              aria-hidden="true"
                            ></i>
                            {c.ativo ? 'Inativar' : 'Reativar'}
                          </Dropdown.Item>
                          <Dropdown.Item className="text-danger" onClick={() => setExcluindo(c)}>
                            <i className="bi bi-trash me-2" aria-hidden="true"></i>
                            Excluir
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {dados && (
          <div className="px-3 py-2 small text-secondary border-top">
            {visiveis.length} de {lista.length} cliente(s)
          </div>
        )}
      </div>

      {formulario && (
        <ClienteFormModal
          key={formulario.cliente?.id ?? 'novo'}
          cliente={formulario.cliente}
          clientesExistentes={lista}
          aoSalvar={salvar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      <ConfirmModal
        aberto={Boolean(excluindo)}
        titulo="Excluir cliente"
        textoConfirmar="Excluir"
        aoFechar={() => setExcluindo(null)}
        aoConfirmar={async () => {
          await excluirCliente(excluindo.id)
          notificar(`Cliente ${excluindo.nome} excluído.`)
          await recarregar(true)
        }}
      >
        <p className="mb-0">
          Excluir <strong>{excluindo?.nome}</strong> e o CPF/CNPJ dele? Essa ação não pode ser
          desfeita.
          {excluindo?.resumo.pedidos > 0 &&
            ` Este cliente tem ${excluindo.resumo.pedidos} pedido(s) — nesse caso o sistema não deixa excluir; use "Inativar".`}
        </p>
      </ConfirmModal>
    </>
  )
}
