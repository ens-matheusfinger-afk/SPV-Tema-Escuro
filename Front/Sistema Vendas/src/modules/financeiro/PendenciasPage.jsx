import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import ConfiancaCliente from '../../components/ConfiancaCliente/ConfiancaCliente'
import { useCarregar } from '../../hooks/useCarregar'
import { useAuth } from '../../hooks/useAuth'
import { ORIGEM_PENDENCIAS, listarPendencias } from '../../services/pendenciasService'
import { exportarExcel, nomeComData } from '../../utils/exportarExcel'
import { TELAS } from '../../utils/constants'
import { formatarMoeda, formatarTelefone, normalizarBusca } from '../../utils/formatters'
import './Financeiro.css'

/*
 * SPV-58 — Módulo de pendências por cliente (REQ016): para cada cliente, pagamentos vencidos
 * (inadimplência — SPV-118), valores a receber, pedidos prontos não retirados e pedidos em andamento.
 * Objetivo: atendimento rápido ("o que esse cliente tem pendente?") e cobrança.
 *
 * Dinâmica 01 (consulta por View): os dados vêm da VIEW vw_pendencias_clientes, calculada pelo
 * banco (DATABASE/viewPendenciasClientes.sql), pela API GET /pendencias. Nada de dado fixo aqui.
 */
export default function PendenciasPage() {
  const { podeAcessar } = useAuth()
  const vePedidos = podeAcessar(TELAS.PEDIDOS)
  const { dados, carregando, erro, recarregar } = useCarregar(listarPendencias, [])

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const lista = dados ?? []
  const termo = normalizarBusca(busca)
  const numeros = busca.replace(/\D/g, '')
  const FILTROS = {
    todos: () => true,
    devendo: (l) => l.inadimplente,
    retirada: (l) => l.idsProntos.length > 0,
    receber: (l) => l.aReceber > 0,
  }
  const visiveis = lista.filter(
    (l) =>
      FILTROS[filtro](l) &&
      (!termo ||
        normalizarBusca(l.cliente.nome).includes(termo) ||
        (numeros.length >= 3 && l.cliente.telefone.includes(numeros))),
  )
  const soma = (campo) => lista.reduce((s, l) => s + l[campo], 0)
  const cartoes = [
    {
      chave: 'devendo',
      rotulo: 'Clientes devendo',
      valor: formatarMoeda(soma('vencido')),
      detalhe: `${lista.filter(FILTROS.devendo).length} cliente(s) com conta vencida`,
      cor: 'var(--bs-danger)',
      icone: 'bi-slash-circle',
    },
    {
      chave: 'receber',
      rotulo: 'Total a receber',
      valor: formatarMoeda(soma('aReceber')),
      detalhe: `${lista.filter(FILTROS.receber).length} cliente(s)`,
      cor: 'var(--spv-sky)',
      icone: 'bi-cash-stack',
    },
    {
      chave: 'retirada',
      rotulo: 'Prontos não retirados',
      valor: lista.reduce((s, l) => s + l.idsProntos.length, 0),
      detalhe: 'pedidos aguardando o cliente',
      cor: 'var(--spv-mint)',
      icone: 'bi-bag-check',
    },
    {
      chave: 'todos',
      rotulo: 'Pedidos em andamento',
      valor: lista.reduce((s, l) => s + l.emAndamento, 0),
      detalhe: 'cadastrado, produção ou conferência',
      cor: 'var(--spv-cor-neutra)',
      icone: 'bi-gear',
    },
  ]

  const exportar = () =>
    exportarExcel(nomeComData('pendencias-por-cliente'), [
      {
        aba: 'Pendências',
        linhas: visiveis,
        colunas: [
          { titulo: 'Cliente', valor: (l) => l.cliente.nome, largura: 30 },
          { titulo: 'Telefone', valor: (l) => formatarTelefone(l.cliente.telefone), largura: 16 },
          { titulo: 'Vencido (devendo)', tipo: 'moeda', valor: (l) => l.vencido, largura: 16 },
          {
            titulo: 'Contas vencidas',
            tipo: 'inteiro',
            valor: (l) => l.contasVencidas,
            largura: 12,
          },
          { titulo: 'Total a receber', tipo: 'moeda', valor: (l) => l.aReceber, largura: 15 },
          {
            titulo: 'Prontos não retirados',
            tipo: 'inteiro',
            valor: (l) => l.idsProntos.length,
            largura: 14,
          },
          {
            titulo: 'Pedidos não retirados',
            valor: (l) => l.idsProntos.map((id) => `nº ${id}`).join(', '),
            largura: 22,
          },
          {
            titulo: 'Em andamento',
            tipo: 'inteiro',
            valor: (l) => l.emAndamento,
            largura: 12,
          },
        ],
      },
    ])

  return (
    <>
      <PageHeader
        titulo="Pendências por cliente"
        subtitulo="Pagamentos vencidos, valores a receber e pedidos não retirados de cada cliente"
      >
        <BotaoExportar quantidade={visiveis.length} aoExportar={exportar} />
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {dados && (
        <div className="row g-2 g-md-3 mb-3">
          {cartoes.map((c) => (
            <div className="col-6 col-lg-3" key={c.rotulo}>
              <button
                type="button"
                className={`spv-fin-card ${filtro === c.chave && c.chave !== 'todos' ? 'ativo' : ''}`}
                style={{ '--cor': c.cor }}
                onClick={() => setFiltro(filtro === c.chave ? 'todos' : c.chave)}
              >
                <div className="spv-fin-card-rotulo">
                  <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                  {c.rotulo}
                </div>
                <div
                  className={`spv-fin-card-valor ${c.chave === 'devendo' && soma('vencido') > 0 ? 'text-danger' : ''}`}
                >
                  {c.valor}
                </div>
                <div className="spv-fin-card-detalhe">{c.detalhe}</div>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="spv-card">
        <div className="spv-card-body border-bottom">
          <div className="row g-2">
            <div className="col-md-8">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search" aria-hidden="true"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Buscar cliente por nome ou telefone"
                  aria-label="Buscar cliente"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <Form.Select
                aria-label="Tipo de pendência"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todos">Todas as pendências</option>
                <option value="devendo">Só quem está devendo</option>
                <option value="receber">Com valor a receber</option>
                <option value="retirada">Com pedido pronto não retirado</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando ? (
          <Carregando texto="Consultando as pendências..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio icone="bi-emoji-smile" titulo="Nenhuma pendência encontrada." />
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela mb-0">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="text-end">Vencido</th>
                  <th className="text-end d-none d-md-table-cell">A receber</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.cliente.id}>
                    <td>
                      <div className="fw-semibold">
                        {vePedidos ? (
                          <Link to={`/pedidos/cliente?id=${l.cliente.id}`}>{l.cliente.nome}</Link>
                        ) : (
                          l.cliente.nome
                        )}
                      </div>
                      <div className="small text-secondary d-flex flex-wrap gap-2 align-items-center">
                        {l.cliente.telefone && <span>{formatarTelefone(l.cliente.telefone)}</span>}
                        <ConfiancaCliente fator={l.cliente.fatorConfianca} compacto />
                      </div>
                    </td>
                    <td className="text-end text-nowrap">
                      {l.inadimplente ? (
                        <>
                          <div className="fw-bold text-danger">{formatarMoeda(l.vencido)}</div>
                          <div className="small text-danger">
                            <i className="bi bi-slash-circle me-1" aria-hidden="true"></i>
                            pedido novo bloqueado
                          </div>
                        </>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="text-end d-none d-md-table-cell text-nowrap">
                      {l.aReceber > 0 ? (
                        formatarMoeda(l.aReceber)
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="small">
                      {l.idsProntos.length > 0 && (
                        <div className="text-success fw-semibold">
                          <i className="bi bi-bag-check me-1" aria-hidden="true"></i>
                          {l.idsProntos.length} pronto(s) para retirar:{' '}
                          {l.idsProntos.map((id, i) => (
                            <span key={id}>
                              {i > 0 && ', '}
                              {vePedidos ? <Link to={`/pedidos/${id}`}>nº {id}</Link> : `nº ${id}`}
                            </span>
                          ))}
                        </div>
                      )}
                      {l.emAndamento > 0 && (
                        <div className="text-secondary">
                          <i className="bi bi-gear me-1" aria-hidden="true"></i>
                          {l.emAndamento} em andamento
                        </div>
                      )}
                      {l.idsProntos.length === 0 && l.emAndamento === 0 && (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {dados && (
          <div className="px-3 py-2 small text-secondary border-top d-flex flex-wrap gap-2">
            <span>{visiveis.length} cliente(s) com pendência</span>
            <span className="ms-auto" data-testid="origem-dados">
              <i className="bi bi-database me-1" aria-hidden="true"></i>
              Dados calculados pelo banco (view <code>{ORIGEM_PENDENCIAS}</code>)
            </span>
          </div>
        )}
      </div>
    </>
  )
}
