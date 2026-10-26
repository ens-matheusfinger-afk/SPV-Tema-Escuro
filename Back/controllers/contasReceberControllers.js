const sequelize = require('../config/database');
const ContasReceberModel = require('../models/contasReceberModels');
const Pedidos = require('../models/pedidosModels');
const Cliente = require('../models/clientesModels');
const Usuario = require('../models/usuariosModels');
const { hojeISO, dataValida, valorValido, centavos, falhar, responderErro } = require('../utils/financeiro');
const { registrarNoCaixa, removerDoCaixa } = require('../utils/caixa');
const { calcularEncargos, dividirPagamento } = require('../utils/encargos');

// GET /contas-receber - com o pedido e o cliente de cada conta (SPV-85)
exports.listar = async (req, res) => {
    try {
        const lista = await ContasReceberModel.findAll({
            include: [
                { model: Pedidos, as: 'pedido', attributes: ['id', 'descricao', 'status', 'dataEntregaPrevista'] },
                { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'telefone', 'fatorConfianca'] },
            ],
            order: [['dataPrevisao', 'ASC NULLS LAST'], ['id', 'ASC']],
        });
        res.json(lista);
    } catch (erro) {
        responderErro(res, erro, 'Erro ao listar contas a receber.');
    }
};

/*
 * Contas a receber (SPV-85).
 * Conta de PEDIDO: criada e atualizada sozinha pela trigger trg_pedidos_conta_receber
 *   (valor = total do pedido - já recebido; vencimento = data de entrega). Não se edita à mão.
 * Conta AVULSA: lançada na tela (serviço sem pedido, venda antiga, etc.).
 * Recebida = tem dataRecebimento.
 */
const FORMAS_RECEBIMENTO = ['dinheiro', 'pix', 'cartao'];

function lerAvulsa(body, parcial) {
  const tem = (campo) => !parcial || campo in body;
  const dados = {};
  if (tem('idCliente')) {
    const id = Number(body.idCliente);
    if (!Number.isInteger(id) || id <= 0) falhar('Escolha o cliente.');
    dados.idCliente = id;
  }
  if (tem('descricao')) {
    const descricao = String(body.descricao ?? '').trim();
    if (descricao.length < 2) falhar('Informe a descrição da conta.');
    if (descricao.length > 255) falhar('A descrição pode ter no máximo 255 caracteres.');
    dados.descricao = descricao;
  }
  if (tem('total')) {
    if (!valorValido(body.total)) falhar('Informe um valor maior que zero, com até 2 casas decimais.');
    dados.total = Number(body.total);
  }
  if (tem('dataPrevisao')) {
    if (!dataValida(body.dataPrevisao)) falhar('Informe a data de vencimento.');
    dados.dataPrevisao = body.dataPrevisao;
  }
  return dados;
}

async function buscarConta(id, transaction) {
  const conta = await ContasReceberModel.findByPk(id, { transaction, lock: transaction ? true : undefined });
  if (!conta) falhar('Conta a receber não encontrada.', 404);
  return conta;
}

const recalcularDoPedido = (idPedido, transaction) =>
  sequelize.query('SELECT fn_recalcular_conta_receber(:idPedido)', { replacements: { idPedido }, transaction });

// POST /contas-receber - conta avulsa
exports.cadastrar = async (req, res) => {
  try {
    const dados = lerAvulsa(req.body ?? {}, false);
    if (!(await Cliente.findByPk(dados.idCliente))) falhar('Cliente não encontrado.', 404);
    const conta = await ContasReceberModel.create(dados);
    res.status(201).json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao cadastrar conta a receber.');
  }
};

// PUT /contas-receber/:id - só conta avulsa em aberto
exports.editar = async (req, res) => {
  try {
    const conta = await buscarConta(req.params.id);
    if (conta.idPedido) {
      falhar('Esta conta vem do pedido: o valor e o vencimento mudam pelo próprio pedido (itens e data de entrega).', 409);
    }
    if (conta.dataRecebimento) falhar('Conta já recebida não pode ser editada. Desfaça o recebimento antes.', 409);
    await conta.update(lerAvulsa(req.body ?? {}, true));
    res.json(conta);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao editar conta a receber.');
  }
};

// POST /contas-receber/:id/receber  body: { valor?, dataRecebimento?, formaPagamento, idUsuario }
// Valor menor que o da conta = recebimento parcial (ex.: sinal de 50%): o restante continua em aberto.
exports.receber = async (req, res) => {
  try {
    const body = req.body ?? {};
    const resultado = await sequelize.transaction(async (transaction) => {
      const conta = await buscarConta(req.params.id, transaction);
      if (conta.dataRecebimento) falhar('Esta conta já foi recebida.', 409);

      const data = body.dataRecebimento || hojeISO();
      if (!dataValida(data)) falhar('Data de recebimento inválida.');
      if (data > hojeISO()) falhar('A data de recebimento não pode ser no futuro.');
      if (!FORMAS_RECEBIMENTO.includes(body.formaPagamento)) falhar('Informe a forma de pagamento: dinheiro, PIX ou cartão.');

      // SPV-73: conta vencida paga com multa de 2% + juros de 1% ao mês (cobrarEncargos: false = dispensa)
      const pedido = conta.idPedido ? await Pedidos.findByPk(conta.idPedido, { transaction }) : null;
      const semEncargos = { diasAtraso: 0, multa: 0, juros: 0, totalAtualizado: Number(conta.total), fator: 1 };
      const calculados = calcularEncargos(conta, pedido?.status ?? null, data);
      const encargos = body.cobrarEncargos === false ? semEncargos : calculados;

      const valor = body.valor === undefined || body.valor === '' ? encargos.totalAtualizado : Number(body.valor);
      if (!valorValido(valor)) falhar('Informe um valor maior que zero, com até 2 casas decimais.');
      if (centavos(valor) > centavos(encargos.totalAtualizado)) {
        const limite = encargos.totalAtualizado.toFixed(2).replace('.', ',');
        falhar(encargos.diasAtraso
          ? `O valor recebido não pode passar do total com multa e juros (R$ ${limite}).`
          : `O valor recebido não pode passar do valor da conta (R$ ${limite}).`);
      }
      const partes = dividirPagamento(conta, encargos, valor);
      const restante = (centavos(conta.total) - centavos(partes.principal)) / 100;

      if (!(await Usuario.findByPk(body.idUsuario, { transaction }))) falhar('Informe quem está recebendo (idUsuario).');

      await conta.update({
        total: partes.principal,
        valorMulta: partes.multa,
        valorJuros: partes.juros,
        diasAtraso: encargos.diasAtraso,
        dataRecebimento: data,
        formaPagamento: body.formaPagamento,
      }, { transaction });

      // SPV-97: o dinheiro entra no caixa do dia, na forma de pagamento usada
      const cliente = conta.idCliente ? await Cliente.findByPk(conta.idCliente, { transaction }) : null;
      await registrarNoCaixa(
        {
          dia: data,
          tipo: 'entrada',
          formaPagamento: body.formaPagamento,
          valor,
          descricao: `Recebimento: ${conta.idPedido ? `pedido nº ${conta.idPedido}` : conta.descricao}${cliente ? ` (${cliente.nome})` : ''}${restante > 0 ? ' — parcial' : ''}${partes.multa + partes.juros > 0 ? ` + multa/juros R$ ${(partes.multa + partes.juros).toFixed(2).replace('.', ',')}` : ''}`.slice(0, 255),
          idPedido: conta.idPedido,
          idContaReceber: conta.id,
          idUsuario: body.idUsuario,
        },
        transaction,
      );

      if (restante > 0) {
        if (conta.idPedido) {
          await recalcularDoPedido(conta.idPedido, transaction); // a trigger cria a conta do restante
        } else {
          await ContasReceberModel.create(
            { idCliente: conta.idCliente, descricao: conta.descricao, total: restante, dataPrevisao: conta.dataPrevisao },
            { transaction },
          );
        }
      }
      return { conta, restante, encargos: { ...partes, diasAtraso: encargos.diasAtraso, valorPago: valor } };
    });
    res.json({ ...resultado.conta.toJSON(), restante: resultado.restante, encargos: resultado.encargos });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao registrar recebimento.');
  }
};

// POST /contas-receber/:id/estornar - desfaz um recebimento lançado por engano
exports.estornar = async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const conta = await buscarConta(req.params.id, transaction);
      if (!conta.dataRecebimento) falhar('Esta conta ainda não foi recebida.', 409);
      await removerDoCaixa({ idContaReceber: conta.id }, transaction); // tira o valor do caixa (dia aberto)
      await conta.update({ dataRecebimento: null, formaPagamento: null, valorMulta: 0, valorJuros: 0, diasAtraso: 0 }, { transaction });
      if (conta.idPedido) await recalcularDoPedido(conta.idPedido, transaction); // junta com o que falta receber
    });
    res.json({ mensagem: 'Recebimento desfeito.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao desfazer recebimento.');
  }
};

// DELETE /contas-receber/:id - só conta avulsa em aberto
exports.excluir = async (req, res) => {
  try {
    const conta = await buscarConta(req.params.id);
    if (conta.idPedido) falhar('A conta de um pedido não pode ser excluída. Para não cobrar, cancele o pedido.', 409);
    if (conta.dataRecebimento) falhar('Conta já recebida não pode ser excluída (é histórico financeiro).', 409);
    await conta.destroy();
    res.json({ mensagem: 'Conta a receber excluída.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao excluir conta a receber.');
  }
};

// GET /contas-receber/:id/encargos?data=AAAA-MM-DD - SPV-73: quanto fica com multa e juros nessa data
exports.encargos = async (req, res) => {
  try {
    const conta = await buscarConta(req.params.id);
    if (conta.dataRecebimento) falhar('Esta conta já foi recebida.', 409);
    const data = req.query.data || hojeISO();
    if (!dataValida(data)) falhar('Data inválida (use AAAA-MM-DD).');
    const pedido = conta.idPedido ? await Pedidos.findByPk(conta.idPedido) : null;
    const { fator, ...encargos } = calcularEncargos(conta, pedido?.status ?? null, data);
    res.json({ id: conta.id, valor: Number(conta.total), data, ...encargos });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao calcular multa e juros.');
  }
};
