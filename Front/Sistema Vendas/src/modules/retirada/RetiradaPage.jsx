import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Form, InputGroup } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { useCarregar } from '../../hooks/useCarregar'
import { useNotificacao } from '../../hooks/useNotificacao'
import { useAuth } from '../../hooks/useAuth'
import { alterarStatusPedido, listarPedidos } from '../../services/pedidosService'
import { listarClientes } from '../../services/clientesService'
import { listarContasReceber } from '../../services/financeiroService'
import { listarConferencias } from '../../services/conferenciaService'
import { TELAS } from '../../utils/constants'
import {
  diaParaInput,
  formatarDia,
  formatarMoeda,
  formatarTelefone,
  hojeISO,
  normalizarBusca,
} from '../../utils/formatters'
import { exportarExcel, nomeComData } from '../../utils/exportarExcel'
import '../financeiro/Financeiro.css'
import './RetiradaPage.css'

// A partir de quantos dias parado o pedido pede atenção (amarelo) e vira urgente (vermelho)
const DIAS_ATENCAO = 7
const DIAS_URGENTE = 15

const STATUS_AGUARDANDO_CLIENTE = 4

function diasEntre(de, ate) {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Data/hora -> "AAAA-MM-DD" no fuso do navegador
function diaLocal(valor) {
  const d = new Date(valor)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/*
 * Junta o que a tela precisa: pedidos "Aguardando cliente", o cliente de cada um,
 * quanto ainda falta receber (contas a receber em aberto do pedido) e desde quando está pronto
 * (data da conferência aprovada — SPV-96).
 */
async function carregarRetirada() {
  const [pedidos, clientes, contas] = await Promise.all([
    listarPedidos(STATUS_AGUARDANDO_CLIENTE),
    listarClientes(),
    listarContasReceber().catch(() => null), // sem acesso/erro: a coluna mostra "—"
  ])
  const porId = new Map(clientes.map((c) => [c.id, c]))
  const conferencias = await Promise.all(
    pedidos.map((p) => listarConferencias(p.id).catch(() => [])),
  )
  const hoje = hojeISO()
  return pedidos.map((p, i) => {
    const aprovada = conferencias[i]
      .filter((c) => c.resultado === 'aprovado')
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0]
    const prontoDesde = aprovada ? diaLocal(aprovada.data) : null
    const aReceber = contas
      ? contas
          .filter((c) => c.idPedido === p.id && !c.quitada)
          .reduce((s, c) => s + Math.round(c.valor * 100), 0) / 100
      : null
    const previsto = p.dataEntregaPrevista ? diaParaInput(p.dataEntregaPrevista) : null
    return {
      ...p,
      cliente: porId.get(p.idCliente) ?? null,
      prontoDesde,
      diasEsperando: prontoDesde ? diasEntre(prontoDesde, hoje) : null,
      previsto,
      aReceber,
    }
  })
}

const ORDENS = {
  espera: (a, b) => (b.diasEsperando ?? -1) - (a.diasEsperando ?? -1) || a.id - b.id,
  previsto: (a, b) => String(a.previsto ?? '9999').localeCompare(String(b.previsto ?? '9999')),
  valor: (a, b) => b.total - a.total,
  cliente: (a, b) => (a.cliente?.nome ?? '').localeCompare(b.cliente?.nome ?? ''),
}

function SeloEspera({ dias }) {
  if (dias === null) return <span className="text-secondary small">—</span>
  const classe = dias >= DIAS_URGENTE ? 'danger' : dias >= DIAS_ATENCAO ? 'warning' : 'success'
  const texto = dias === 0 ? 'pronto hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
  return <span className={`badge rounded-pill text-bg-${classe}`}>{texto}</span>
}

// Mensagem pronta para avisar o cliente pelo WhatsApp
function linkWhatsApp(pedido) {
  const numero = (pedido.cliente?.telefone ?? '').replace(/\D/g, '')
  if (numero.length < 10) return null
  const nome = pedido.cliente?.nome?.split(' ')[0] ?? ''
  const texto = `Olá${nome ? `, ${nome}` : ''}! Seu pedido nº ${pedido.id} está pronto e aguardando a retirada.`
  return `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`
}

/*
 * REQ012 — Listagem de pedidos aguardando cliente (pronto para retirada).
 * Número do pedido, cliente, desde quando está pronto, data prevista de retirada, valor e quanto
 * falta receber. Destaca quem está parado há muito tempo, permite avisar o cliente pelo WhatsApp
 * e registrar a entrega (finaliza o pedido — REQ020).
 */
export default function RetiradaPage() {
  const notificar = useNotificacao()
  const { podeAcessar } = useAuth()
  const veReceber = podeAcessar(TELAS.CONTAS_RECEBER)
  const { dados, carregando, erro, recarregar } = useCarregar(carregarRetirada, [])

  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('espera')
  const [filtro, setFiltro] = useState('todos')
  const [entregando, setEntregando] = useState(null)

  const hoje = hojeISO()
  const lista = dados ?? []
  const FILTROS = {
    todos: () => true,
    parados: (p) => (p.diasEsperando ?? 0) >= DIAS_ATENCAO,
    receber: (p) => (p.aReceber ?? 0) > 0,
    vencidos: (p) => p.previsto && p.previsto <= hoje,
  }
  const termo = normalizarBusca(busca)
  const numeros = busca.replace(/\D/g, '')
  const visiveis = lista
    .filter(FILTROS[filtro])
    .filter(
      (p) =>
        !termo ||
        String(p.id) === busca.trim().replace(/^n?º?\s*/i, '') ||
        normalizarBusca(p.cliente?.nome ?? '').includes(termo) ||
        normalizarBusca(p.descricao).includes(termo) ||
        (numeros.length >= 3 && (p.cliente?.telefone ?? '').includes(numeros)),
    )
    .sort(ORDENS[ordem])

  const somaReceber = lista.reduce((s, p) => s + (p.aReceber ?? 0), 0)
  const cartoes = [
    {
      chave: 'todos',
      rotulo: 'Prontos para retirada',
      valor: lista.length,
      detalhe: `${formatarMoeda(lista.reduce((s, p) => s + p.total, 0))} em pedidos`,
      cor: 'var(--spv-mint)',
      icone: 'bi-bag-check',
    },
    {
      chave: 'parados',
      rotulo: `Parados há ${DIAS_ATENCAO}+ dias`,
      valor: lista.filter(FILTROS.parados).length,
      detalhe: 'avisar o cliente',
      cor: '#f5b400',
      icone: 'bi-hourglass-bottom',
    },
    {
      chave: 'vencidos',
      rotulo: 'Retirada prevista até hoje',
      valor: lista.filter(FILTROS.vencidos).length,
      detalhe: 'data combinada já chegou',
      cor: 'var(--bs-danger)',
      icone: 'bi-calendar-x',
    },
    {
      chave: 'receber',
      rotulo: 'A receber na retirada',
      valor: formatarMoeda(somaReceber),
      detalhe: `${lista.filter(FILTROS.receber).length} pedido(s) com saldo`,
      cor: 'var(--spv-sky)',
      icone: 'bi-cash-coin',
    },
  ]

  const exportar = () =>
    exportarExcel(nomeComData('aguardando-cliente'), [
      {
        aba: 'Aguardando cliente',
        linhas: visiveis,
        colunas: [
          { titulo: 'Nº', tipo: 'inteiro', valor: (p) => p.id, largura: 7 },
          { titulo: 'Cliente', valor: (p) => p.cliente?.nome ?? '', largura: 28 },
          {
            titulo: 'Telefone',
            valor: (p) => formatarTelefone(p.cliente?.telefone ?? ''),
            largura: 16,
          },
          { titulo: 'Descrição', valor: (p) => p.descricao, largura: 30 },
          { titulo: 'Pronto desde', tipo: 'data', valor: (p) => p.prontoDesde, largura: 13 },
          { titulo: 'Dias esperando', tipo: 'inteiro', valor: (p) => p.diasEsperando, largura: 14 },
          { titulo: 'Retirada prevista', tipo: 'data', valor: (p) => p.previsto, largura: 15 },
          { titulo: 'Valor', tipo: 'moeda', valor: (p) => p.total, largura: 13 },
          { titulo: 'Falta receber', tipo: 'moeda', valor: (p) => p.aReceber, largura: 14 },
        ],
      },
    ])

  return (
    <>
      <PageHeader
        titulo="Aguardando cliente"
        subtitulo="Pedidos conferidos e prontos para retirada"
      >
        <BotaoExportar quantidade={visiveis.length} aoExportar={exportar} />
      </PageHeader>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}

      {dados && (
        <div className="row g-2 g-md-3 mb-3">
          {cartoes.map((c) => (
            <div className="col-6 col-lg-3" key={c.chave}>
              <button
                type="button"
                className={`spv-fin-card ${filtro === c.chave && c.chave !== 'todos' ? 'ativo' : ''}`}
                style={{ '--cor': c.cor }}
                aria-pressed={filtro === c.chave}
                onClick={() => setFiltro(filtro === c.chave ? 'todos' : c.chave)}
              >
                <div className="spv-fin-card-rotulo">
                  <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                  {c.rotulo}
                </div>
                <div className="spv-fin-card-valor">{c.valor}</div>
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
                  placeholder="Buscar por nº do pedido, cliente, telefone ou descrição"
                  aria-label="Buscar pedido aguardando cliente"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-md-4">
              <Form.Select
                aria-label="Ordenar"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              >
                <option value="espera">Esperando há mais tempo</option>
                <option value="previsto">Data prevista de retirada</option>
                <option value="valor">Maior valor</option>
                <option value="cliente">Cliente (A–Z)</option>
              </Form.Select>
            </div>
          </div>
        </div>

        {carregando && !dados ? (
          <Carregando texto="Carregando pedidos prontos..." />
        ) : visiveis.length === 0 ? (
          <EstadoVazio
            icone="bi-bag-check"
            titulo={
              lista.length === 0
                ? 'Nenhum pedido aguardando retirada.'
                : 'Nenhum pedido neste filtro.'
            }
          >
            {lista.length === 0
              ? 'Os pedidos aparecem aqui quando a conferência é aprovada.'
              : 'Ajuste a busca ou clique de novo no cartão para tirar o filtro.'}
          </EstadoVazio>
        ) : (
          <div className="table-responsive">
            <table className="table spv-tabela mb-0" data-testid="tabela-retirada">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Pronto desde</th>
                  <th className="d-none d-md-table-cell">Retirada prevista</th>
                  <th className="text-end">Valor</th>
                  <th className="text-end">Falta receber</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => {
                  const zap = linkWhatsApp(p)
                  const urgente = (p.diasEsperando ?? 0) >= DIAS_URGENTE
                  return (
                    <tr key={p.id} className={urgente ? 'spv-retirada-urgente' : ''}>
                      <td className="text-nowrap">
                        <Link to={`/pedidos/${p.id}`} className="fw-semibold">
                          nº {p.id}
                        </Link>
                        {p.descricao && (
                          <div className="small text-secondary text-truncate spv-retirada-desc">
                            {p.descricao}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold">
                          {p.cliente?.nome ?? `Cliente ${p.idCliente}`}
                        </div>
                        {p.cliente?.telefone && (
                          <div className="small text-secondary">
                            {formatarTelefone(p.cliente.telefone)}
                          </div>
                        )}
                      </td>
                      <td className="text-nowrap">
                        {p.prontoDesde && <div className="small">{formatarDia(p.prontoDesde)}</div>}
                        <SeloEspera dias={p.diasEsperando} />
                      </td>
                      <td className="d-none d-md-table-cell text-nowrap">
                        {p.previsto ? (
                          <span className={p.previsto < hoje ? 'text-danger fw-semibold' : ''}>
                            {formatarDia(p.previsto)}
                          </span>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                      <td className="text-end fw-semibold text-nowrap">{formatarMoeda(p.total)}</td>
                      <td className="text-end text-nowrap">
                        {p.aReceber === null ? (
                          <span className="text-secondary">—</span>
                        ) : p.aReceber > 0 ? (
                          <span className="text-danger fw-semibold">
                            {formatarMoeda(p.aReceber)}
                          </span>
                        ) : (
                          <span className="text-success small">
                            <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>pago
                          </span>
                        )}
                      </td>
                      <td className="text-end text-nowrap">
                        {zap && (
                          <a
                            href={zap}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-light border me-1"
                            title="Avisar o cliente pelo WhatsApp"
                          >
                            <i className="bi bi-whatsapp text-success" aria-hidden="true"></i>
                            <span className="visually-hidden">Avisar pelo WhatsApp</span>
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => setEntregando(p)}
                        >
                          <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                          <span className="d-none d-lg-inline ms-1">Registrar entrega</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {dados && (
          <div className="px-3 py-2 small text-secondary border-top d-flex flex-wrap gap-2">
            <span>
              {visiveis.length} de {lista.length} pedido(s)
            </span>
            <span className="ms-auto">
              "Pronto desde" = data da conferência aprovada. Amarelo: {DIAS_ATENCAO}+ dias ·
              Vermelho: {DIAS_URGENTE}+ dias
            </span>
          </div>
        )}
      </div>

      <ConfirmModal
        aberto={Boolean(entregando)}
        titulo="Registrar entrega"
        textoConfirmar="Entregar e finalizar"
        variante="success"
        aoFechar={() => setEntregando(null)}
        aoConfirmar={async () => {
          await alterarStatusPedido(entregando.id, 5)
          notificar(`Pedido nº ${entregando.id} entregue e finalizado.`)
          await recarregar(true)
        }}
      >
        <p className="mb-2">
          Confirmar a retirada do pedido <strong>nº {entregando?.id}</strong> por{' '}
          <strong>{entregando?.cliente?.nome}</strong>? O pedido passa para "Finalizado".
        </p>
        {entregando?.aReceber > 0 && (
          <Alert variant="warning" className="small mb-0">
            <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
            Ainda falta receber <strong>{formatarMoeda(entregando.aReceber)}</strong> deste pedido.
            {veReceber ? (
              <>
                {' '}
                Registre o pagamento em{' '}
                <Link to="/financeiro/contas-receber">Contas a receber</Link>, ou entregue assim
                mesmo e a conta continua em aberto.
              </>
            ) : (
              ' Se entregar assim mesmo, a conta continua em aberto no financeiro.'
            )}
          </Alert>
        )}
      </ConfirmModal>
    </>
  )
}
