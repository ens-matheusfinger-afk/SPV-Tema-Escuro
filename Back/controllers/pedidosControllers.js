const Pedidos = require('../models/pedidosModels');
const ItensPedido = require('../models/itensPedidoModels');
const Produtos = require('../models/produtosModels');
const Servicos = require('../models/servicosModels');
const Estoque = require('../models/estoqueModels');
const Usuario = require('../models/usuariosModel');

const STATUS_CANCELADO = 6;
const STATUS_FINALIZADO = 5;

// POST /pedidos - REQ004: Gerar Pedidos
// Diagrama de Classes chama este método de "gerarPedido()"
exports.cadastrar = async (req, res) => {
  try {
    const { descricao, idCliente, idVendedor, dataEntregaPrevista, anexo } = req.body;

    if (!idCliente || !idVendedor) {
      return res.status(400).json({ erro: 'idCliente e idVendedor são obrigatórios.' });
    }

    const vendedor = await Usuario.findByPk(idVendedor);
    if (!vendedor) {
      return res.status(404).json({ erro: 'Vendedor (usuário) não encontrado.' });
    }

    const pedido = await Pedidos.create({
      descricao,
      idCliente,
      idVendedor,
      dataEntregaPrevista: dataEntregaPrevista ?? null,
      anexo: anexo ?? null,
      status: 1, // Cadastro do pedido
      total: 0,
    });

    return res.status(201).json(pedido);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao gerar pedido.', detalhes: error.message });
  }
};

// GET /pedidos - REQ009: Consulta de Pedidos em Aberto (aqui, lista geral com filtro opcional por status)
exports.listar = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const pedidos = await Pedidos.findAll({
      where,
      include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nome'] }],
      order: [['dataCriacao', 'DESC']],
    });

    return res.status(200).json(pedidos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar pedidos.', detalhes: error.message });
  }
};

// GET /pedidos/:id - consulta um pedido específico, com os itens
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedidos.findByPk(id, {
      include: [
        { model: Usuario, as: 'vendedor', attributes: ['id', 'nome'] },
        {
          model: ItensPedido,
          as: 'itens',
          include: [
            { model: Produtos, as: 'produto', attributes: ['id', 'nome'] },
            { model: Servicos, as: 'servico', attributes: ['id', 'nome'] },
          ],
        },
      ],
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao buscar pedido.', detalhes: error.message });
  }
};

// PUT /pedidos/:id - REQ004: editar dados gerais do pedido (atualização parcial)
// Diagrama de Classes chama este método de "editarPedido()"
// Não altera status por aqui (ver /pedidos/:id/status) nem total (calculado via itens).
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    const pedido = await Pedidos.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Não é possível editar um pedido cancelado.' });
    }

    // status e total são controlados por rotas/lógica dedicadas, não pelo editar geral
    const { status, total, ...camposPermitidos } = req.body;

    await pedido.update(camposPermitidos);

    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar pedido.', detalhes: error.message });
  }
};

// PUT /pedidos/:id/status - REQ005: Alterar estado do pedido
// Diagrama de Classes chama este método de "atualizarPedido()"
exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (![1, 2, 3, 4, 5, 6].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido. Use um valor de 1 a 6.' });
    }

    const pedido = await Pedidos.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Não é possível alterar o status de um pedido cancelado.' });
    }

    pedido.status = status;
    if (status === STATUS_FINALIZADO) {
      pedido.dataEntregaRealizada = new Date();
    }
    await pedido.save();

    return res.status(200).json(pedido);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao atualizar status do pedido.', detalhes: error.message });
  }
};

// DELETE /pedidos/:id - REQ038: cancelamento exige confirmação, então aqui NÃO apaga
// o pedido, só marca como cancelado (status 6), preservando o histórico.
// Diagrama de Classes chama este método de "cancelarPedido()"
exports.cancelar = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedidos.findByPk(id);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Este pedido já está cancelado.' });
    }

    // Devolve ao estoque os itens de produto com controle de estoque, já
    // que o pedido não vai mais consumir esse saldo (REQ017).
    const itens = await ItensPedido.findAll({ where: { idPedido: id, tipoItem: 'produto' } });
    for (const item of itens) {
      const estoque = await Estoque.findOne({ where: { idProduto: item.idProduto } });
      if (estoque) {
        estoque.estoqueAtual += item.quantidade;
        await estoque.save();
      }
    }

    pedido.status = STATUS_CANCELADO;
    await pedido.save();

    return res.status(200).json({ mensagem: 'Pedido cancelado com sucesso.', pedido });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cancelar pedido.', detalhes: error.message });
  }
};
