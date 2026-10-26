const sequelize = require('../config/database');
const ContasPagarModel = require('../models/contasPagarModels');
const Usuario = require('../models/usuariosModels');
const { registrarNoCaixa, removerDoCaixa } = require('../utils/caixa');
const { hojeISO, dataValida, valorValido, falhar, responderErro } = require('../utils/financeiro');

/*
 * Contas a pagar (SPV-86/98).
 * Conta paga = tem dataPagamento. Em aberto = sem dataPagamento.
 */

// GET /contas-pagar - vencimento mais próximo primeiro
exports.listar = async (req, res) => {
  try {
    res.json(await ContasPagarModel.listarTudo());
  } catch (erro) {
    responderErro(res, erro, 'Erro ao listar contas a pagar.');
  }
};

const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'cartao', 'boleto', 'transferencia'];

// Valida os campos da conta. parcial = true (PUT): só confere o que veio.
function lerConta(body, parcial) {
  const tem = (campo) => !parcial || campo in body;
  const dados = {};
  if (tem('descricao')) {
    const descricao = String(body.descricao ?? '').trim();
    if (descricao.length < 2) falhar('Informe a descrição da conta.');
    if (descricao.length > 255) falhar('A descrição pode ter no máximo 255 caracteres.');
    dados.descricao = descricao;
  }
  if (tem('tipo')) {
    const tipo = String(body.tipo ?? '').trim();
    if (!tipo) falhar('Informe a categoria da conta (ex.: Aluguel, Matéria-prima).');
    if (tipo.length > 50) falhar('A categoria pode ter no máximo 50 caracteres.');
    dados.tipo = tipo;
  }
  if (tem('fornecedor')) {
    const fornecedor = String(body.fornecedor ?? '').trim();
    if (fornecedor.length > 150) falhar('O fornecedor pode ter no máximo 150 caracteres.');
    dados.fornecedor = fornecedor || null;
  }
  if (tem('valor')) {
    if (!valorValido(body.valor)) falhar('Informe um valor maior que zero, com até 2 casas decimais.');
    dados.valor = Number(body.valor);
  }
  if (tem('dataVencimento')) {
    if (!dataValida(body.dataVencimento)) falhar('Informe a data de vencimento.');
    dados.dataVencimento = body.dataVencimento;
  }
  return dados;
}

// POST /contas-pagar
exports.cadastrar = async (req, res) => {
  try {
    const conta = await ContasPagarModel.create(lerConta(req.body ?? {}, false));
    res.status(201).json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao cadastrar conta a pagar.');
  }
};

// PUT /contas-pagar/:id - só conta em aberto (paga é histórico; estorne antes)
exports.editar = async (req, res) => {
  try {
    const conta = await ContasPagarModel.findByPk(req.params.id);
    if (!conta) return res.status(404).json({ erro: 'Conta a pagar não encontrada.' });
    if (conta.dataPagamento) falhar('Conta já paga não pode ser editada. Desfaça o pagamento antes.', 409);
    await conta.update(lerConta(req.body ?? {}, true));
    res.json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao editar conta a pagar.');
  }
};

// POST /contas-pagar/:id/pagar  body: { dataPagamento?, formaPagamento, idUsuario }
// O pagamento sai do caixa do dia (SPV-97), na forma usada.
exports.pagar = async (req, res) => {
  try {
    const body = req.body ?? {};
    const conta = await sequelize.transaction(async (transaction) => {
      const conta = await ContasPagarModel.findByPk(req.params.id, { transaction, lock: true });
      if (!conta) falhar('Conta a pagar não encontrada.', 404);
      if (conta.dataPagamento) falhar('Esta conta já está paga.', 409);
      const data = body.dataPagamento || hojeISO();
      if (!dataValida(data)) falhar('Data de pagamento inválida.');
      if (data > hojeISO()) falhar('A data de pagamento não pode ser no futuro.');
      if (!FORMAS_PAGAMENTO.includes(body.formaPagamento)) falhar('Informe como a conta foi paga.');
      if (!(await Usuario.findByPk(body.idUsuario, { transaction }))) falhar('Informe quem está pagando (idUsuario).');

      await conta.update({ dataPagamento: data, formaPagamento: body.formaPagamento }, { transaction });
      await registrarNoCaixa(
        {
          dia: data,
          tipo: 'saida',
          formaPagamento: body.formaPagamento,
          valor: Number(conta.valor),
          descricao: `Pagamento: ${conta.descricao}${conta.fornecedor ? ` (${conta.fornecedor})` : ''}`.slice(0, 255),
          idContaPagar: conta.id,
          idUsuario: body.idUsuario,
        },
        transaction,
      );
      return conta;
    });
    res.json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao registrar pagamento.');
  }
};

// POST /contas-pagar/:id/estornar - desfaz um pagamento lançado por engano (e tira do caixa)
exports.estornar = async (req, res) => {
  try {
    const conta = await sequelize.transaction(async (transaction) => {
      const conta = await ContasPagarModel.findByPk(req.params.id, { transaction, lock: true });
      if (!conta) falhar('Conta a pagar não encontrada.', 404);
      if (!conta.dataPagamento) falhar('Esta conta ainda não foi paga.', 409);
      await removerDoCaixa({ idContaPagar: conta.id }, transaction);
      await conta.update({ dataPagamento: null, formaPagamento: null }, { transaction });
      return conta;
    });
    res.json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao desfazer pagamento.');
  }
};

// DELETE /contas-pagar/:id - só conta em aberto
exports.excluir = async (req, res) => {
  try {
    const conta = await ContasPagarModel.findByPk(req.params.id);
    if (!conta) return res.status(404).json({ erro: 'Conta a pagar não encontrada.' });
    if (conta.dataPagamento) falhar('Conta já paga não pode ser excluída (é histórico financeiro).', 409);
    await conta.destroy();
    res.json({ mensagem: 'Conta a pagar excluída.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao excluir conta a pagar.');
  }
};
