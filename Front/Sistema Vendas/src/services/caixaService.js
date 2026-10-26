import api from './api'

/*
 * Caixa (REQ013): SPV-97 entradas por forma de pagamento / SPV-84 fechamento do dia.
 * Recebimentos e pagamentos de contas entram sozinhos; aqui ficam os lançamentos manuais.
 */

export function montarLancamento(l) {
  return {
    id: l.id,
    data: l.data,
    tipo: l.tipo,
    forma: l.formaPagamento ?? null,
    valor: Number(l.valor),
    descricao: l.descricao ?? '',
    idPedido: l.idPedido ?? null,
    origem: l.idContaReceber ? 'receber' : l.idContaPagar ? 'pagar' : 'manual',
    usuario: l.usuario?.nome ?? '',
  }
}

function montarFechamento(f) {
  if (!f) return null
  const n = (v) => Number(v)
  return {
    id: f.id,
    data: f.data,
    saldoInicial: n(f.saldoInicial),
    entradasDinheiro: n(f.entradasDinheiro),
    entradasPix: n(f.entradasPix),
    entradasCartao: n(f.entradasCartao),
    saidasDinheiro: n(f.saidasDinheiro),
    saidasOutras: n(f.saidasOutras),
    dinheiroEsperado: n(f.dinheiroEsperado),
    dinheiroContado: n(f.dinheiroContado),
    diferenca: n(f.diferenca),
    observacao: f.observacao ?? '',
    usuario: f.usuario?.nome ?? '',
    fechadoEm: f.fechadoEm,
  }
}

export async function buscarCaixaDoDia(data) {
  const { data: r } = await api.get('/caixa', { params: data ? { data } : undefined })
  return {
    data: r.data,
    hoje: r.hoje,
    lancamentos: r.lancamentos.map(montarLancamento),
    resumo: r.resumo,
    fechamento: montarFechamento(r.fechamento),
    ultimoFechamento: r.ultimoFechamento,
  }
}

export async function listarLancamentosPeriodo(de, ate) {
  const { data } = await api.get('/caixa/periodo', { params: { de, ate } })
  return data.map(montarLancamento)
}

export async function listarFechamentos(limite = 30) {
  const { data } = await api.get('/caixa/fechamentos', { params: { limite } })
  return data.map(montarFechamento)
}

export async function lancarNoCaixa({ tipo, forma, valor, descricao, idUsuario }) {
  await api.post('/caixa', { tipo, formaPagamento: forma, valor, descricao, idUsuario })
}

export async function excluirLancamento(id) {
  await api.delete(`/caixa/${id}`)
}

export async function fecharCaixa({ data, dinheiroContado, observacao, idUsuario }) {
  await api.post('/caixa/fechar', { data, dinheiroContado, observacao, idUsuario })
}

/*
 * SPV-81 — relatório de fluxo de caixa (realizado) de um período.
 * Saldo anterior + entradas/saídas por dia com saldo acumulado, por forma, origem e categoria.
 */
export async function carregarFluxoCaixa(de, ate) {
  const { data } = await api.get('/caixa/fluxo', { params: { de, ate } })
  const n = (v) => Number(v ?? 0)
  const lista = (l) => l.map((x) => ({ nome: x.nome, valor: n(x.valor) }))
  return {
    de: data.de,
    ate: data.ate,
    saldoAnterior: n(data.saldoAnterior),
    totais: {
      entradas: n(data.totais.entradas),
      saidas: n(data.totais.saidas),
      resultado: n(data.totais.resultado),
      saldoFinal: n(data.totais.saldoFinal),
    },
    porDia: data.porDia.map((d) => ({
      ...d,
      entradas: n(d.entradas),
      saidas: n(d.saidas),
      saldoDia: n(d.saldoDia),
      acumulado: n(d.acumulado),
    })),
    porForma: { entrada: lista(data.porForma.entrada), saida: lista(data.porForma.saida) },
    porOrigem: lista(data.porOrigem),
    porCategoria: lista(data.porCategoria),
    lancamentos: data.lancamentos.map((l) => ({
      ...montarLancamento(l),
      categoria: l.contaPagar?.tipo ?? '',
    })),
  }
}
