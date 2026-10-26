import { useState } from 'react'
import { Button, ButtonGroup, Form } from 'react-bootstrap'
import PageHeader from '../../components/PageHeader/PageHeader'
import Carregando from '../../components/Carregando/Carregando'
import AlertaErro from '../../components/AlertaErro/AlertaErro'
import EstadoVazio from '../../components/EstadoVazio/EstadoVazio'
import BotaoExportar from '../../components/BotaoExportar/BotaoExportar'
import { useCarregar } from '../../hooks/useCarregar'
import { carregarFluxoCaixa } from '../../services/caixaService'
import { FORMAS_PAGAMENTO } from '../../services/financeiroService'
import { formatarDataHora, formatarDia, formatarMoeda, hojeISO } from '../../utils/formatters'
import { somarDias } from '../../utils/validacoes'
import { exportarFluxoCaixa } from './exportarFinanceiro'
import './Financeiro.css'

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function atalhos(hoje) {
  const inicioMes = `${hoje.slice(0, 7)}-01`
  const fimMesPassado = somarDias(inicioMes, -1)
  return [
    { rotulo: 'Este mês', de: inicioMes, ate: hoje },
    { rotulo: 'Mês passado', de: `${fimMesPassado.slice(0, 7)}-01`, ate: fimMesPassado },
    { rotulo: 'Últimos 7 dias', de: somarDias(hoje, -6), ate: hoje },
    { rotulo: 'Últimos 30 dias', de: somarDias(hoje, -29), ate: hoje },
  ]
}

const nomeForma = (f) => FORMAS_PAGAMENTO[f]?.nome ?? f
const diaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return SEMANA[new Date(a, m - 1, d).getDay()]
}
const corValor = (v) => (v < 0 ? 'text-danger' : v > 0 ? 'text-success' : '')

function ListaValores({ titulo, icone, itens, total, cor, nomear = (n) => n }) {
  return (
    <section className="spv-card h-100">
      <div className="spv-card-header">
        <i className={`bi ${icone} text-secondary`} aria-hidden="true"></i>
        <h2>{titulo}</h2>
      </div>
      {itens.length === 0 ? (
        <p className="small text-secondary px-3 py-3 mb-0">Nada no período.</p>
      ) : (
        <ul className="list-unstyled mb-0 spv-fluxo-lista">
          {itens.map((i) => (
            <li key={i.nome}>
              <div className="d-flex justify-content-between gap-2 small">
                <span className="text-truncate">{nomear(i.nome)}</span>
                <strong className="text-nowrap">{formatarMoeda(i.valor)}</strong>
              </div>
              <span className="spv-fluxo-trilho">
                <span
                  style={{ width: `${total ? (i.valor / total) * 100 : 0}%`, background: cor }}
                ></span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/*
 * SPV-81 — Relatório de fluxo de caixa (REQ013/REQ014/REQ019).
 * O que entrou e saiu de fato no caixa no período: saldo anterior, movimento dia a dia com
 * saldo acumulado, divisão por forma de pagamento, por origem e por categoria de despesa.
 * Exporta em Excel e imprime/salva em PDF.
 */
export default function FluxoCaixaPage() {
  const hoje = hojeISO()
  const opcoes = atalhos(hoje)
  const [periodo, setPeriodo] = useState({ de: opcoes[0].de, ate: opcoes[0].ate })
  const [verLancamentos, setVerLancamentos] = useState(false)

  const erroPeriodo =
    !periodo.de || !periodo.ate
      ? 'Informe as duas datas.'
      : periodo.de > periodo.ate
        ? 'A data inicial é depois da final.'
        : ''

  const { dados, carregando, erro, recarregar } = useCarregar(
    () => (erroPeriodo ? Promise.resolve(null) : carregarFluxoCaixa(periodo.de, periodo.ate)),
    [periodo.de, periodo.ate],
  )

  const t = dados?.totais
  const cartoes = dados
    ? [
        {
          rotulo: 'Saldo anterior',
          valor: dados.saldoAnterior,
          detalhe: `antes de ${formatarDia(dados.de)}`,
          cor: '#94a3b8',
          icone: 'bi-skip-backward',
        },
        {
          rotulo: 'Entradas',
          valor: t.entradas,
          detalhe: 'vendas e recebimentos',
          cor: 'var(--spv-emerald)',
          icone: 'bi-arrow-down-circle',
        },
        {
          rotulo: 'Saídas',
          valor: t.saidas,
          detalhe: 'despesas e pagamentos',
          cor: '#f07167',
          icone: 'bi-arrow-up-circle',
        },
        {
          rotulo: 'Saldo final',
          valor: t.saldoFinal,
          detalhe: `resultado do período: ${formatarMoeda(t.resultado)}`,
          cor: t.saldoFinal < 0 ? 'var(--bs-danger)' : 'var(--spv-sky)',
          icone: 'bi-wallet2',
        },
      ]
    : []

  return (
    <>
      <PageHeader
        titulo="Fluxo de caixa"
        subtitulo="Relatório do que entrou e saiu do caixa no período, com saldo acumulado dia a dia"
      >
        <div className="d-flex gap-2 spv-nao-imprimir">
          <BotaoExportar
            quantidade={dados ? dados.lancamentos.length : 0}
            aoExportar={() => exportarFluxoCaixa(dados)}
          />
          <Button
            variant="light"
            className="border"
            disabled={!dados}
            onClick={() => window.print()}
          >
            <i className="bi bi-printer me-1" aria-hidden="true"></i>
            Imprimir / PDF
          </Button>
        </div>
      </PageHeader>

      <div className="spv-somente-impressao mb-3">
        <h2 className="h5 fw-bold mb-0">SYS VENDAS: Relatório de fluxo de caixa</h2>
        {dados && (
          <div className="small">
            Período: {formatarDia(dados.de)} a {formatarDia(dados.ate)} · emitido em{' '}
            {formatarDataHora(new Date())}
          </div>
        )}
      </div>

      <div className="spv-card mb-3 spv-nao-imprimir">
        <div className="spv-card-body d-flex flex-wrap align-items-end gap-2">
          <ButtonGroup size="sm" aria-label="Atalhos de período">
            {opcoes.map((o) => (
              <Button
                key={o.rotulo}
                variant={
                  periodo.de === o.de && periodo.ate === o.ate ? 'primary' : 'outline-secondary'
                }
                onClick={() => setPeriodo({ de: o.de, ate: o.ate })}
              >
                {o.rotulo}
              </Button>
            ))}
          </ButtonGroup>
          <Form.Group className="ms-md-auto">
            <Form.Label className="small mb-1">De</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              value={periodo.de}
              max={hoje}
              onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="small mb-1">Até</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              value={periodo.ate}
              max={hoje}
              onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
            />
          </Form.Group>
        </div>
        {erroPeriodo && <div className="px-3 pb-2 small text-danger">{erroPeriodo}</div>}
      </div>

      {erro && <AlertaErro mensagem={erro} aoTentarNovamente={() => recarregar()} />}
      {carregando && !dados && <Carregando texto="Montando o fluxo de caixa..." />}

      {dados && (
        <>
          <div className="row g-2 g-md-3 mb-3">
            {cartoes.map((c) => (
              <div className="col-6 col-lg-3" key={c.rotulo}>
                <div className="spv-fin-card" style={{ '--cor': c.cor }}>
                  <div className="spv-fin-card-rotulo">
                    <i className={`bi ${c.icone} me-1`} aria-hidden="true"></i>
                    {c.rotulo}
                  </div>
                  <div className={`spv-fin-card-valor ${c.valor < 0 ? 'text-danger' : ''}`}>
                    {formatarMoeda(c.valor)}
                  </div>
                  <div className="spv-fin-card-detalhe">{c.detalhe}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3 mb-3">
            <div className="col-xl-8">
              <section className="spv-card h-100">
                <div className="spv-card-header">
                  <i className="bi bi-calendar3 text-secondary" aria-hidden="true"></i>
                  <h2>Movimento dia a dia</h2>
                  <span className="ms-auto small text-secondary">
                    {formatarDia(dados.de)} a {formatarDia(dados.ate)}
                  </span>
                </div>
                {dados.porDia.length === 0 ? (
                  <EstadoVazio icone="bi-safe" titulo="Nenhum lançamento no caixa neste período." />
                ) : (
                  <div className="table-responsive">
                    <table className="table spv-tabela mb-0" data-testid="tabela-fluxo">
                      <thead>
                        <tr>
                          <th>Dia</th>
                          <th className="text-end">Entradas</th>
                          <th className="text-end">Saídas</th>
                          <th className="text-end">Saldo do dia</th>
                          <th className="text-end">Saldo acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="spv-fluxo-anterior">
                          <td colSpan={4}>Saldo anterior</td>
                          <td className="text-end fw-semibold">
                            {formatarMoeda(dados.saldoAnterior)}
                          </td>
                        </tr>
                        {dados.porDia.map((d) => (
                          <tr key={d.dia}>
                            <td className="text-nowrap">
                              <span className="fw-semibold">{formatarDia(d.dia)}</span>{' '}
                              <span className="small text-secondary">{diaSemana(d.dia)}</span>
                            </td>
                            <td className="text-end text-success text-nowrap">
                              {d.entradas ? formatarMoeda(d.entradas) : '—'}
                            </td>
                            <td className="text-end text-danger text-nowrap">
                              {d.saidas ? formatarMoeda(d.saidas) : '—'}
                            </td>
                            <td className={`text-end text-nowrap ${corValor(d.saldoDia)}`}>
                              {formatarMoeda(d.saldoDia)}
                            </td>
                            <td
                              className={`text-end fw-semibold text-nowrap ${d.acumulado < 0 ? 'text-danger' : ''}`}
                            >
                              {formatarMoeda(d.acumulado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="fw-bold">
                          <td>Total</td>
                          <td className="text-end text-success text-nowrap">
                            {formatarMoeda(t.entradas)}
                          </td>
                          <td className="text-end text-danger text-nowrap">
                            {formatarMoeda(t.saidas)}
                          </td>
                          <td className={`text-end text-nowrap ${corValor(t.resultado)}`}>
                            {formatarMoeda(t.resultado)}
                          </td>
                          <td className="text-end text-nowrap">{formatarMoeda(t.saldoFinal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <div className="col-xl-4">
              <div className="d-flex flex-column gap-3 h-100">
                <ListaValores
                  titulo="Entradas por forma de pagamento"
                  icone="bi-wallet2"
                  itens={dados.porForma.entrada}
                  total={t.entradas}
                  cor="var(--spv-emerald)"
                  nomear={nomeForma}
                />
                <ListaValores
                  titulo="Saídas por forma de pagamento"
                  icone="bi-credit-card"
                  itens={dados.porForma.saida}
                  total={t.saidas}
                  cor="#f07167"
                  nomear={nomeForma}
                />
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <ListaValores
                titulo="De onde veio / para onde foi"
                icone="bi-diagram-3"
                itens={dados.porOrigem}
                total={Math.max(t.entradas, t.saidas)}
                cor="var(--spv-sky)"
              />
            </div>
            <div className="col-md-6">
              <ListaValores
                titulo="Saídas por categoria de despesa"
                icone="bi-tags"
                itens={dados.porCategoria}
                total={t.saidas}
                cor="#f5b400"
              />
            </div>
          </div>

          <section className="spv-card">
            <div className="spv-card-header">
              <i className="bi bi-list-ul text-secondary" aria-hidden="true"></i>
              <h2>Lançamentos do período ({dados.lancamentos.length})</h2>
              <Button
                size="sm"
                variant="link"
                className="ms-auto spv-nao-imprimir"
                onClick={() => setVerLancamentos((v) => !v)}
              >
                {verLancamentos ? 'Esconder' : 'Mostrar'}
              </Button>
            </div>
            {verLancamentos && (
              <div className="table-responsive">
                <table className="table spv-tabela mb-0">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th className="d-none d-md-table-cell">Forma</th>
                      <th className="text-end">Valor</th>
                      <th className="d-none d-lg-table-cell">Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td className="text-nowrap small">{formatarDataHora(l.data)}</td>
                        <td>
                          {l.descricao || '—'}
                          {l.categoria && (
                            <span className="badge rounded-pill text-bg-light border ms-1">
                              {l.categoria}
                            </span>
                          )}
                        </td>
                        <td className="d-none d-md-table-cell">
                          {l.forma ? nomeForma(l.forma) : '—'}
                        </td>
                        <td
                          className={`text-end text-nowrap fw-semibold ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}
                        >
                          {l.tipo === 'entrada' ? '+' : '−'} {formatarMoeda(l.valor)}
                        </td>
                        <td className="d-none d-lg-table-cell small text-secondary">{l.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
