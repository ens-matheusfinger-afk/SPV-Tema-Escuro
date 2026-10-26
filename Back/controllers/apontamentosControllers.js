const { Op } = require('sequelize');
const ApontamentosProducao = require('../models/apontamentosProducaoModels');
const Pedidos = require('../models/pedidosModels');
const Usuario = require('../models/usuariosModels');
const Cliente = require('../models/clientesModels');

// Status do pedido em que dá para apontar produção
const STATUS_CADASTRADO = 1;
const STATUS_EM_PRODUCAO = 2;
const QUANTIDADE_MAXIMA = 999999;

const incluirOperador = { model: Usuario, as: 'operador', attributes: ['id', 'nome'] };

// GET /pedidos/:id/apontamentos - histórico de produção do pedido
exports.listarPorPedido = async (req, res) => {
  try {
    const apontamentos = await ApontamentosProducao.findAll({
      where: { idPedido: req.params.id },
      include: [incluirOperador],
      order: [['inicio', 'ASC']],
    });
    return res.status(200).json(apontamentos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar apontamentos.', detalhes: error.message });
  }
};

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

// GET /apontamentos?emAndamento=true&idUsuario=3 - visão da tela de Produção
// GET /apontamentos?de=2026-10-01&ate=2026-10-31 - SPV-103: período (pela data de início) para exportar
exports.listar = async (req, res) => {
  try {
    const where = {};
    if (req.query.emAndamento === 'true') where.fim = { [Op.is]: null };
    if (req.query.idUsuario) where.idUsuario = req.query.idUsuario;

    const { de, ate } = req.query;
    if ((de && !DIA_VALIDO.test(de)) || (ate && !DIA_VALIDO.test(ate))) {
      return res.status(400).json({ erro: 'Use datas no formato AAAA-MM-DD em "de" e "ate".' });
    }
    if (de && ate && de > ate) {
      return res.status(400).json({ erro: 'A data inicial não pode ser depois da final.' });
    }
    if (de || ate) {
      where.inicio = {};
      if (de) where.inicio[Op.gte] = new Date(`${de}T00:00:00`);
      if (ate) where.inicio[Op.lte] = new Date(`${ate}T23:59:59.999`);
    }

    const apontamentos = await ApontamentosProducao.findAll({
      where,
      include: [
        incluirOperador,
        {
          model: Pedidos,
          as: 'pedido',
          attributes: ['id', 'descricao', 'status', 'dataEntregaPrevista', 'idCliente'],
          include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'nome'] }],
        },
      ],
      order: [['inicio', 'DESC']],
    });
    return res.status(200).json(apontamentos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar apontamentos.', detalhes: error.message });
  }
};

// POST /pedidos/:id/apontamentos - SPV-93: operador inicia a produção do pedido
// body: { idUsuario }. Se o pedido estiver "Cadastrado", ele passa para "Em produção".
exports.iniciar = async (req, res) => {
  try {
    const idUsuario = Number(req.body.idUsuario);
    if (!idUsuario) return res.status(400).json({ erro: 'idUsuario (operador) é obrigatório.' });

    const pedido = await Pedidos.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (![STATUS_CADASTRADO, STATUS_EM_PRODUCAO].includes(pedido.status)) {
      return res.status(400).json({
        erro: 'Só dá para apontar produção em pedidos "Cadastrado" ou "Em produção".',
      });
    }

    const operador = await Usuario.findByPk(idUsuario);
    if (!operador || Number(operador.status) !== 1) {
      return res.status(404).json({ erro: 'Operador não encontrado ou inativo.' });
    }

    const aberto = await ApontamentosProducao.findOne({
      where: { idPedido: pedido.id, idUsuario, fim: { [Op.is]: null } },
    });
    if (aberto) {
      return res.status(409).json({ erro: 'Você já tem um apontamento em andamento neste pedido.' });
    }

    if (pedido.status === STATUS_CADASTRADO) {
      pedido.status = STATUS_EM_PRODUCAO;
      await pedido.save();
    }

    const apontamento = await ApontamentosProducao.create({ idPedido: pedido.id, idUsuario });
    return res.status(201).json(apontamento);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao iniciar apontamento.', detalhes: error.message });
  }
};

// PUT /apontamentos/:id/concluir - SPV-94/95: encerra com a quantidade produzida
// body: { quantidadeProduzida, observacao? }
exports.concluir = async (req, res) => {
  try {
    const quantidade = Number(req.body.quantidadeProduzida);
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > QUANTIDADE_MAXIMA) {
      return res.status(400).json({ erro: 'Informe a quantidade produzida (número inteiro, 0 ou mais).' });
    }

    const apontamento = await ApontamentosProducao.findByPk(req.params.id);
    if (!apontamento) return res.status(404).json({ erro: 'Apontamento não encontrado.' });
    if (apontamento.fim) return res.status(409).json({ erro: 'Este apontamento já foi concluído.' });

    await apontamento.update({
      fim: new Date(),
      quantidadeProduzida: quantidade,
      observacao: req.body.observacao?.trim() || null,
    });
    return res.status(200).json(apontamento);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao concluir apontamento.', detalhes: error.message });
  }
};

// DELETE /apontamentos/:id - desfaz um início feito por engano (só enquanto em andamento)
exports.cancelar = async (req, res) => {
  try {
    const apontamento = await ApontamentosProducao.findByPk(req.params.id);
    if (!apontamento) return res.status(404).json({ erro: 'Apontamento não encontrado.' });
    if (apontamento.fim) {
      return res.status(400).json({ erro: 'Apontamento concluído não pode ser apagado (é histórico de produção).' });
    }
    await apontamento.destroy();
    return res.status(200).json({ mensagem: 'Apontamento cancelado.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cancelar apontamento.', detalhes: error.message });
  }
};
