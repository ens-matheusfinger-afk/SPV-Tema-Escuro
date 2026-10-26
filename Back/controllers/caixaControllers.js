const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Caixa = require('../models/caixaModels');
const FechamentosCaixa = require('../models/fechamentosCaixaModels');
const Usuario = require('../models/usuariosModels');
const ContasPagar = require('../models/contasPagarModels');
const { hojeISO, dataValida, valorValido, centavos, falhar, responderErro } = require('../utils/financeiro');
const { diaDe, intervaloDoDia, garantirCaixaAberto, garantirDinheiroDisponivel, resumoDoDia } = require('../utils/caixa');

/*
 * REQ013 — Caixa (SPV-84 fechamento / SPV-97 entradas por forma de pagamento).
 * Cada linha da tabela caixa é um lançamento (entrada ou saída).
 * Recebimentos de contas a receber e pagamentos de contas a pagar entram sozinhos
 * (ver utils/caixa.js). Aqui ficam os lançamentos manuais (venda no balcão, sangria,
 * troco...) e o fechamento do dia, que trava o dia para novos lançamentos.
 */

const FORMAS_ENTRADA = ['dinheiro', 'pix', 'cartao'];
const FORMAS_SAIDA = ['dinheiro', 'pix', 'cartao', 'boleto', 'transferencia'];

const incluir = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'nome'] },
];

function lerDia(valor) {
  const dia = valor || hojeISO();
  if (!dataValida(dia)) falhar('Data inválida (use AAAA-MM-DD).');
  return dia;
}

// GET /caixa?data=AAAA-MM-DD - lançamentos, totais por forma e fechamento do dia
exports.doDia = async (req, res) => {
  try {
    const dia = lerDia(req.query.data);
    const { lancamentos, resumo, ultimoFechamento } = await resumoDoDia(dia, incluir);
    const fechamento = await FechamentosCaixa.findOne({ where: { data: dia }, include: incluir });
    res.json({ data: dia, hoje: hojeISO(), lancamentos, resumo, fechamento, ultimoFechamento });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao carregar o caixa.');
  }
};

// GET /caixa/periodo?de=&ate= - lançamentos de um período (exportação)
exports.periodo = async (req, res) => {
  try {
    const de = lerDia(req.query.de);
    const ate = lerDia(req.query.ate);
    if (de > ate) falhar('A data inicial não pode ser depois da final.');
    const lancamentos = await Caixa.findAll({
      where: { data: { [Op.between]: [intervaloDoDia(de).inicio, intervaloDoDia(ate).fim] } },
      include: incluir,
      order: [['data', 'ASC'], ['id', 'ASC']],
    });
    res.json(lancamentos);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao listar lançamentos.');
  }
};

// GET /caixa/fluxo?de=AAAA-MM-DD&ate=AAAA-MM-DD - SPV-81 relatório de fluxo de caixa (realizado)
// Saldo anterior + entradas e saídas dia a dia com saldo acumulado, por forma de pagamento,
// por origem (recebimento de conta, pagamento de conta, lançamento manual) e por categoria de despesa.
const ORIGENS = {
  receber: 'Recebimento de contas a receber',
  pagar: 'Pagamento de contas a pagar',
  manualEntrada: 'Lançamento manual (entrada)',
  manualSaida: 'Lançamento manual (saída)',
};

exports.fluxo = async (req, res) => {
  try {
    const de = lerDia(req.query.de);
    const ate = lerDia(req.query.ate);
    if (de > ate) falhar('A data inicial não pode ser depois da final.');
    const dias = (new Date(`${ate}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000;
    if (dias > 366) falhar('Escolha um período de até 1 ano.');

    const inicio = intervaloDoDia(de).inicio;
    const anteriores = await Caixa.findAll({ attributes: ['tipo', 'valor'], where: { data: { [Op.lt]: inicio } } });
    const saldoAnterior = anteriores.reduce((s, l) => s + (l.tipo === 'entrada' ? 1 : -1) * centavos(l.valor), 0);

    const lancamentos = await Caixa.findAll({
      where: { data: { [Op.between]: [inicio, intervaloDoDia(ate).fim] } },
      include: [...incluir, { model: ContasPagar, as: 'contaPagar', attributes: ['id', 'tipo', 'fornecedor'] }],
      order: [['data', 'ASC'], ['id', 'ASC']],
    });

    const porDia = new Map();
    const porForma = { entrada: {}, saida: {} };
    const porOrigem = {};
    const porCategoria = {};
    let entradas = 0;
    let saidas = 0;
    for (const l of lancamentos) {
      const c = centavos(l.valor);
      const dia = diaDe(l.data);
      const linha = porDia.get(dia) ?? { dia, entradas: 0, saidas: 0, lancamentos: 0 };
      linha.lancamentos += 1;
      const forma = l.formaPagamento || 'sem forma';
      porForma[l.tipo][forma] = (porForma[l.tipo][forma] ?? 0) + c;
      let origem;
      if (l.tipo === 'entrada') {
        entradas += c;
        linha.entradas += c;
        origem = l.idContaReceber ? ORIGENS.receber : ORIGENS.manualEntrada;
      } else {
        saidas += c;
        linha.saidas += c;
        origem = l.idContaPagar ? ORIGENS.pagar : ORIGENS.manualSaida;
        const categoria = l.contaPagar?.tipo || 'Despesa do dia (caixa)';
        porCategoria[categoria] = (porCategoria[categoria] ?? 0) + c;
      }
      porOrigem[origem] = (porOrigem[origem] ?? 0) + c;
      porDia.set(dia, linha);
    }

    const reais = (n) => n / 100;
    let acumulado = saldoAnterior;
    const linhas = [...porDia.values()].map((d) => {
      acumulado += d.entradas - d.saidas;
      return {
        dia: d.dia,
        lancamentos: d.lancamentos,
        entradas: reais(d.entradas),
        saidas: reais(d.saidas),
        saldoDia: reais(d.entradas - d.saidas),
        acumulado: reais(acumulado),
      };
    });
    const emLista = (obj) =>
      Object.entries(obj).map(([nome, valor]) => ({ nome, valor: reais(valor) })).sort((a, b) => b.valor - a.valor);

    res.json({
      de,
      ate,
      saldoAnterior: reais(saldoAnterior),
      totais: {
        entradas: reais(entradas),
        saidas: reais(saidas),
        resultado: reais(entradas - saidas),
        saldoFinal: reais(saldoAnterior + entradas - saidas),
      },
      porDia: linhas,
      porForma: { entrada: emLista(porForma.entrada), saida: emLista(porForma.saida) },
      porOrigem: emLista(porOrigem),
      porCategoria: emLista(porCategoria),
      lancamentos,
    });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao gerar o fluxo de caixa.');
  }
};

// GET /caixa/fechamentos?limite=30 - histórico dos fechamentos (mais recentes primeiro)
exports.fechamentos = async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limite) || 30, 366);
    res.json(await FechamentosCaixa.findAll({ include: incluir, order: [['data', 'DESC']], limit: limite }));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao listar fechamentos.');
  }
};

// POST /caixa - lançamento manual no caixa de HOJE
// body: { tipo: 'entrada'|'saida', formaPagamento, valor, descricao, idUsuario }
exports.lancar = async (req, res) => {
  try {
    const { tipo, formaPagamento, valor, idUsuario } = req.body ?? {};
    const descricao = String(req.body?.descricao ?? '').trim();
    if (!['entrada', 'saida'].includes(tipo)) falhar('Escolha entrada ou saída.');
    const formas = tipo === 'entrada' ? FORMAS_ENTRADA : FORMAS_SAIDA;
    if (!formas.includes(formaPagamento)) falhar('Escolha a forma de pagamento.');
    if (!valorValido(valor)) falhar('Informe um valor maior que zero, com até 2 casas decimais.');
    if (descricao.length < 2) falhar('Descreva o lançamento (ex.: venda no balcão, troco, sangria).');
    if (!(await Usuario.findByPk(idUsuario))) falhar('Usuário não encontrado.', 404);

    const dia = hojeISO();
    await garantirCaixaAberto(dia);
    if (tipo === 'saida' && formaPagamento === 'dinheiro') await garantirDinheiroDisponivel(dia, valor);
    const lancamento = await Caixa.create({
      data: new Date(),
      tipo,
      formaPagamento,
      valor: Number(valor),
      descricao: descricao.slice(0, 255),
      idUsuario,
    });
    res.status(201).json(lancamento);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao registrar lançamento de caixa.');
  }
};

// DELETE /caixa/:id - só lançamento manual e com o dia ainda aberto
exports.excluir = async (req, res) => {
  try {
    const lancamento = await Caixa.findByPk(req.params.id);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    if (lancamento.idContaReceber || lancamento.idContaPagar) {
      falhar('Este lançamento veio de uma conta. Para desfazer, use "Desfazer recebimento/pagamento" na conta.', 409);
    }
    const dia = diaDe(lancamento.data);
    await garantirCaixaAberto(dia);
    if (lancamento.tipo === 'entrada' && lancamento.formaPagamento === 'dinheiro') {
      const { resumo } = await resumoDoDia(dia);
      if (centavos(resumo.dinheiroEsperado) - centavos(lancamento.valor) < 0) {
        falhar('Este dinheiro já foi usado em saídas do dia: excluir a entrada deixaria o caixa negativo.', 409);
      }
    }
    await lancamento.destroy();
    res.json({ mensagem: 'Lançamento removido.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao remover lançamento.');
  }
};

// POST /caixa/fechar - SPV-84: fecha o dia conferindo o dinheiro da gaveta
// body: { data?, dinheiroContado, observacao?, idUsuario }
exports.fechar = async (req, res) => {
  try {
    const body = req.body ?? {};
    const dia = lerDia(body.data);
    if (dia > hojeISO()) falhar('Não dá para fechar um dia que ainda não chegou.');
    const contado = Number(body.dinheiroContado);
    if (body.dinheiroContado === '' || body.dinheiroContado === undefined || !Number.isFinite(contado) || contado < 0) {
      falhar('Informe quanto dinheiro foi contado na gaveta (pode ser 0).');
    }
    if (Math.abs(Math.round(contado * 100) - contado * 100) > 1e-6) falhar('Use no máximo 2 casas decimais.');
    if (!(await Usuario.findByPk(body.idUsuario))) falhar('Usuário não encontrado.', 404);

    const fechamento = await sequelize.transaction(async (transaction) => {
      await garantirCaixaAberto(dia, transaction);
      const { resumo } = await resumoDoDia(dia);
      const diferenca = (centavos(contado) - centavos(resumo.dinheiroEsperado)) / 100;
      const observacao = String(body.observacao ?? '').trim();
      if (diferenca !== 0 && observacao.length < 3) {
        falhar(
          `O dinheiro contado tem diferença de R$ ${diferenca.toFixed(2).replace('.', ',')} em relação ao esperado. Explique na observação.`,
        );
      }
      return FechamentosCaixa.create(
        {
          data: dia,
          saldoInicial: resumo.saldoInicial,
          entradasDinheiro: resumo.entradas.dinheiro,
          entradasPix: resumo.entradas.pix,
          entradasCartao: resumo.entradas.cartao,
          saidasDinheiro: resumo.saidas.dinheiro,
          saidasOutras: resumo.saidas.outras,
          dinheiroEsperado: resumo.dinheiroEsperado,
          dinheiroContado: contado,
          diferenca,
          observacao: observacao.slice(0, 255) || null,
          idUsuario: body.idUsuario,
        },
        { transaction },
      );
    });
    res.status(201).json(fechamento);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao fechar o caixa.');
  }
};
