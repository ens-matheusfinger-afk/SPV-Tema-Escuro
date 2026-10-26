import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Form, Nav } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import GraficoBarras from './components/GraficoBarras'
import PainelPowerBI from './components/PainelPowerBI'
import { useCarregar } from '../../hooks/useCarregar'
import { carregarDashboard } from '../../services/dashboardService'
import { STATUS_PEDIDO } from '../../utils/constants'
import { formatarDuracao, formatarMoeda, hojeISO } from '../../utils/formatters'
import { exportarDashboard } from './exportarDashboard'
import '../financeiro/Financeiro.css'
import './Dashboard.css'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const rotuloMes = (mes) => `${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(2, 4)}`
const nomeMes = (mes) => `${NOMES_MESES[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`

function Variacao({ valor }) {
  if (valor === null) return <span>sem vendas no mês anterior</span>
  const sobe = valor >= 0
  return (
    <span className={sobe ? 'text-success' : 'text-danger'}>
      <i
        className={`bi ${sobe ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} me-1`}
        aria-hidden="true"
      ></i>
      {sobe ? '+' : ''}
      {valor.toFixed(1).replace('.', ',')}% vs. mês anterior
    </span>
  )
}

function Cartao({ rotulo, icone, cor, valor, children }) {
  return (
    <div className="spv-fin-card" style={{ '--cor': cor }}>
      <div className="spv-fin-card-rotulo">
        <i className={`bi ${icone} me-1`} aria-hidden="true"></i>
        {rotulo}
      </div>
      <div className="spv-fin-card-valor">{valor}</div>
      <div className="spv-fin-card-detalhe">{children}</div>
    </div>
  )
}

/*
 * SPV-101 — Dashboard gerencial (REQ018): faturamento, pedidos, ticket médio e produção,
 * calculados pelo Back a partir do banco (GET /dashboard).
 * SPV-79 — Indicadores gerenciais (REQ035): aba com o painel do Power BI publicado pelo grupo.
 */
export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') === 'bi' ? 'bi' : 'geral'
  const [mes, setMes] = useState(hojeISO().slice(0, 7))
  const [grafico, setGrafico] = useState('mes')

  const { dados, carregando, erro, recarregar } = useCarregar(() => carregarDashboard(mes), [mes])

  const trocarAba = (chave) => setParams(chave === 'bi' ? { aba: 'bi' } : {}, { replace: true })

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Indicadores gerenciais: faturamento, produtividade e volume de pedidos"
      >
        {aba === 'geral' && (
          <>
            <Form.Control
              type="month"
              aria-label="Mês dos indicadores"
              value={mes}
              max={hojeISO().slice(0, 7)}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              style={{ width: '11rem' }}
            />
            <BotaoExportar
              quantidade={dados ? undefined : 0}
              aoExportar={() => exportarDashboard(dados)}
            />
          </>
        )}
      </PageHeader>

      <Nav variant="tabs" className="mb-3" activeKey={aba} onSelect={trocarAba}>
        <Nav.Item>
          <Nav.Link eventKey="geral">
            <i className="bi bi-speedometer2 me-1" aria-hidden="true"></i>
            Visão geral
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="bi">
            <i className="bi bi-pie-chart me-1" aria-hidden="true"></i>
            Power BI
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {aba === 'bi' ? (
        <PainelPowerBI />
      ) : (
        <>
          {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}
          {carregando && !dados && <Carregando texto="Calculando os indicadores..." />}
          {dados && <VisaoGeral dados={dados} grafico={grafico} setGrafico={setGrafico} />}
        </>
      )}
    </>
  )
}

function VisaoGeral({ dados, grafico, setGrafico }) {
  const { vendas, caixa, situacao, producao } = dados
  const maxStatus = Math.max(1, ...situacao.porStatus.map((s) => s.quantidade))
  const maxCliente = Math.max(1, ...dados.topClientes.map((c) => c.faturamento))

  const barras =
    grafico === 'mes'
      ? dados.porMes.map((m) => ({
          chave: m.mes,
          rotulo: rotuloMes(m.mes),
          valor: m.faturamento,
          dica: `${rotuloMes(m.mes)}: ${formatarMoeda(m.faturamento)} em ${m.pedidos} pedido(s)`,
          destaque: m.mes === dados.mes,
        }))
      : dados.porDia.map((d) => {
          const dia = Number(d.dia.slice(8))
          return {
            chave: d.dia,
            rotulo: dia === 1 || dia % 5 === 0 ? String(dia) : '',
            valor: d.faturamento,
            dica: `${String(dia).padStart(2, '0')}/${d.dia.slice(5, 7)}: ${formatarMoeda(d.faturamento)} em ${d.pedidos} pedido(s)`,
          }
        })

  return (
    <>
      <p className="small text-secondary mb-2">
        <i className="bi bi-calendar3 me-1" aria-hidden="true"></i>
        Indicadores de <strong>{nomeMes(dados.mes)}</strong>
      </p>

      <div className="row g-2 g-md-3 mb-3">
        <div className="col-6 col-lg-3">
          <Cartao
            rotulo="Faturamento"
            icone="bi-graph-up-arrow"
            cor="var(--spv-emerald)"
            valor={formatarMoeda(vendas.faturamento)}
          >
            <Variacao valor={vendas.variacao} />
          </Cartao>
        </div>
        <div className="col-6 col-lg-3">
          <Cartao rotulo="Pedidos" icone="bi-receipt" cor="var(--spv-sky)" valor={vendas.pedidos}>
            {vendas.cancelados > 0
              ? `${vendas.cancelados} cancelado(s) fora da conta`
              : 'nenhum cancelado'}
          </Cartao>
        </div>
        <div className="col-6 col-lg-3">
          <Cartao
            rotulo="Ticket médio"
            icone="bi-cart-check"
            cor="#f5b400"
            valor={formatarMoeda(vendas.ticketMedio)}
          >
            faturamento ÷ pedidos
          </Cartao>
        </div>
        <div className="col-6 col-lg-3">
          <Cartao
            rotulo="Saldo do caixa no mês"
            icone="bi-safe"
            cor={caixa.saldo < 0 ? 'var(--bs-danger)' : 'var(--spv-mint)'}
            valor={formatarMoeda(caixa.saldo)}
          >
            entrou {formatarMoeda(caixa.entradas)} · saiu {formatarMoeda(caixa.saidas)}
          </Cartao>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <section className="spv-card h-100">
            <div className="spv-card-header">
              <i className="bi bi-bar-chart text-secondary" aria-hidden="true"></i>
              <h2>Faturamento {grafico === 'mes' ? 'dos últimos 6 meses' : 'por dia do mês'}</h2>
              <div
                className="btn-group btn-group-sm ms-auto"
                role="group"
                aria-label="Período do gráfico"
              >
                <button
                  type="button"
                  className={`btn ${grafico === 'mes' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setGrafico('mes')}
                >
                  Por mês
                </button>
                <button
                  type="button"
                  className={`btn ${grafico === 'dia' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setGrafico('dia')}
                >
                  Por dia
                </button>
              </div>
            </div>
            <div className="spv-card-body">
              <GraficoBarras
                barras={barras}
                formatar={formatarMoeda}
                mostrarValores={grafico === 'mes'}
              />
            </div>
          </section>
        </div>

        <div className="col-lg-4">
          <section className="spv-card h-100">
            <div className="spv-card-header">
              <i className="bi bi-kanban text-secondary" aria-hidden="true"></i>
              <h2>Pedidos em andamento agora</h2>
              <span className="ms-auto fw-bold">{situacao.emAndamento}</span>
            </div>
            <ul className="list-unstyled mb-0 spv-dash-status">
              {situacao.porStatus.map((s) => (
                <li key={s.status}>
                  <span className="text-truncate">
                    <i
                      className={`bi ${STATUS_PEDIDO[s.status].icone} me-1`}
                      aria-hidden="true"
                    ></i>
                    {STATUS_PEDIDO[s.status].nome}
                  </span>
                  <span className="spv-dash-trilho">
                    <span
                      className={`bg-${STATUS_PEDIDO[s.status].cor}`}
                      style={{ width: `${(s.quantidade / maxStatus) * 100}%` }}
                    ></span>
                  </span>
                  <strong>{s.quantidade}</strong>
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 border-top small">
              {situacao.atrasados > 0 ? (
                <span className="text-danger fw-semibold">
                  <i className="bi bi-alarm me-1" aria-hidden="true"></i>
                  {situacao.atrasados} pedido(s) com a entrega atrasada
                </span>
              ) : (
                <span className="text-success">
                  <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
                  Nenhuma entrega atrasada
                </span>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <section className="spv-card h-100">
            <div className="spv-card-header">
              <i className="bi bi-trophy text-secondary" aria-hidden="true"></i>
              <h2>Clientes que mais compraram no mês</h2>
            </div>
            {dados.topClientes.length === 0 ? (
              <EstadoVazio icone="bi-people" titulo="Nenhuma venda neste mês." />
            ) : (
              <ul className="list-unstyled mb-0 spv-dash-ranking">
                {dados.topClientes.map((c, i) => (
                  <li key={c.id}>
                    <span className="spv-dash-posicao">{i + 1}º</span>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between gap-2">
                        <span className="fw-semibold text-truncate">{c.nome}</span>
                        <span className="fw-semibold text-nowrap">
                          {formatarMoeda(c.faturamento)}
                        </span>
                      </div>
                      <span className="spv-dash-trilho">
                        <span
                          style={{
                            width: `${(c.faturamento / maxCliente) * 100}%`,
                            background: 'var(--spv-emerald)',
                          }}
                        ></span>
                      </span>
                      <div className="small text-secondary">{c.pedidos} pedido(s)</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="col-lg-6">
          <section className="spv-card h-100">
            <div className="spv-card-header">
              <i className="bi bi-gear-wide-connected text-secondary" aria-hidden="true"></i>
              <h2>Produtividade no mês</h2>
              <span className="ms-auto small text-secondary">
                {producao.pecas} peça(s) · {formatarDuracao(producao.minutos)}
              </span>
            </div>
            {producao.porOperador.length === 0 ? (
              <EstadoVazio icone="bi-stopwatch" titulo="Nenhum apontamento encerrado neste mês." />
            ) : (
              <div className="table-responsive">
                <table className="table spv-tabela mb-0">
                  <thead>
                    <tr>
                      <th>Operador</th>
                      <th className="text-end">Peças</th>
                      <th className="text-end">Tempo</th>
                      <th className="text-end d-none d-sm-table-cell">Peças/hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {producao.porOperador.map((o) => (
                      <tr key={o.id}>
                        <td className="fw-semibold">{o.nome}</td>
                        <td className="text-end">{o.pecas}</td>
                        <td className="text-end text-nowrap">{formatarDuracao(o.minutos)}</td>
                        <td className="text-end d-none d-sm-table-cell">
                          {o.minutos > 0
                            ? ((o.pecas / o.minutos) * 60).toFixed(1).replace('.', ',')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <p className="small text-secondary mt-3 mb-0" data-testid="origem-dashboard">
        <i className="bi bi-database me-1" aria-hidden="true"></i>
        Faturamento = total dos pedidos criados no mês (sem cancelados). Saldo do caixa = entradas −
        saídas lançadas no caixa no mês. Dados calculados pelo banco do sistema.
      </p>
    </>
  )
}
