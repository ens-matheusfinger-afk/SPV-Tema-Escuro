const ItensPedido = require('../models/itensPedidoModels');
const Pedidos = require('../models/pedidosModels');
const Produtos = require('../models/produtosModels');
const Servicos = require('../models/servicosModels');
const Estoque = require('../models/estoqueModels');

const STATUS_CANCELADO = 6;

// Recalcula o total do pedido somando quantidade * valorUnitario de cada item
async function recalcularTotal(idPedido) {
  const itens = await ItensPedido.findAll({ where: { idPedido } });
  const total = itens.reduce((soma, item) => soma + item.quantidade * Number(item.valorUnitario), 0);
  await Pedidos.update({ total }, { where: { id: idPedido } });
}

// GET /pedidos/:id/itens - lista os itens de um pedido específico
exports.listar = async (req, res) => {
  try {
    const { id: idPedido } = req.params;

    const pedido = await Pedidos.findByPk(idPedido);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    const itens = await ItensPedido.findAll({
      where: { idPedido },
      include: [
        { model: Produtos, as: 'produto', attributes: ['id', 'nome'] },
        { model: Servicos, as: 'servico', attributes: ['id', 'nome'] },
      ],
    });

    return res.status(200).json(itens);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar itens do pedido.', detalhes: error.message });
  }
};

// POST /pedidos/:id/itens - adiciona um item (produto OU serviço) ao pedido
// Diagrama de Classes chama este método de "adicionar()"
exports.adicionar = async (req, res) => {
  try {
    const { id: idPedido } = req.params;
    const { tipoItem, idProduto, idServico, quantidade } = req.body;

    if (!['produto', 'servico'].includes(tipoItem)) {
      return res.status(400).json({ erro: "tipoItem deve ser 'produto' ou 'servico'." });
    }
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Informe uma quantidade maior que zero.' });
    }

    const pedido = await Pedidos.findByPk(idPedido);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Não é possível adicionar itens a um pedido cancelado.' });
    }

    let valorUnitario;

    if (tipoItem === 'produto') {
      if (!idProduto) {
        return res.status(400).json({ erro: 'idProduto é obrigatório para tipoItem "produto".' });
      }
      const produto = await Produtos.findByPk(idProduto);
      if (!produto) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }
      valorUnitario = produto.valor;

      // Se o produto controla estoque, valida saldo e já dá baixa (REQ017)
      if (produto.controlaEstoque) {
        const estoque = await Estoque.findOne({ where: { idProduto } });
        if (!estoque) {
          return res.status(400).json({
            erro: 'Este produto controla estoque, mas não tem registro de estoque cadastrado.',
          });
        }
        if (estoque.estoqueAtual < quantidade) {
          return res.status(400).json({ erro: 'Saldo insuficiente em estoque.', estoqueAtual: estoque.estoqueAtual });
        }
        estoque.estoqueAtual -= quantidade;
        await estoque.save();
      }
    } else {
      if (!idServico) {
        return res.status(400).json({ erro: 'idServico é obrigatório para tipoItem "servico".' });
      }
      const servico = await Servicos.findByPk(idServico);
      if (!servico) {
        return res.status(404).json({ erro: 'Serviço não encontrado.' });
      }
      valorUnitario = servico.valor;
    }

    const item = await ItensPedido.create({
      idPedido,
      tipoItem,
      idProduto: tipoItem === 'produto' ? idProduto : null,
      idServico: tipoItem === 'servico' ? idServico : null,
      quantidade,
      valorUnitario,
    });

    await recalcularTotal(idPedido);
    const pedidoAtualizado = await Pedidos.findByPk(idPedido);

    return res.status(201).json({ item, pedido: pedidoAtualizado });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao adicionar item ao pedido.', detalhes: error.message });
  }
};

// PUT /pedidos/:id/itens/:itemId - edita a quantidade de um item já existente,
// ajustando o estoque pela diferença (se for produto controlado - REQ017)
exports.editar = async (req, res) => {
  try {
    const { id: idPedido, itemId } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Informe uma quantidade maior que zero.' });
    }

    const pedido = await Pedidos.findByPk(idPedido);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Não é possível editar itens de um pedido cancelado.' });
    }

    const item = await ItensPedido.findOne({ where: { id: itemId, idPedido } });
    if (!item) {
      return res.status(404).json({ erro: 'Item não encontrado neste pedido.' });
    }

    const diferenca = quantidade - item.quantidade; // > 0 = precisa consumir mais estoque

    if (item.tipoItem === 'produto' && diferenca !== 0) {
      const produto = await Produtos.findByPk(item.idProduto);
      if (produto && produto.controlaEstoque) {
        const estoque = await Estoque.findOne({ where: { idProduto: item.idProduto } });
        if (!estoque) {
          return res.status(400).json({ erro: 'Registro de estoque não encontrado para este produto.' });
        }
        if (diferenca > 0 && estoque.estoqueAtual < diferenca) {
          return res.status(400).json({ erro: 'Saldo insuficiente em estoque.', estoqueAtual: estoque.estoqueAtual });
        }
        estoque.estoqueAtual -= diferenca; // se diferenca for negativa, isso devolve ao estoque
        await estoque.save();
      }
    }

    item.quantidade = quantidade;
    await item.save();

    await recalcularTotal(idPedido);
    const pedidoAtualizado = await Pedidos.findByPk(idPedido);

    return res.status(200).json({ item, pedido: pedidoAtualizado });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar item do pedido.', detalhes: error.message });
  }
};

// DELETE /pedidos/:id/itens/:itemId - remove um item do pedido
// Diagrama de Classes chama este método de "remover()"
exports.remover = async (req, res) => {
  try {
    const { id: idPedido, itemId } = req.params;

    const pedido = await Pedidos.findByPk(idPedido);
    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    if (pedido.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Não é possível remover itens de um pedido cancelado.' });
    }

    const item = await ItensPedido.findOne({ where: { id: itemId, idPedido } });
    if (!item) {
      return res.status(404).json({ erro: 'Item não encontrado neste pedido.' });
    }

    // Devolve ao estoque, se for produto controlado (REQ017)
    if (item.tipoItem === 'produto') {
      const produto = await Produtos.findByPk(item.idProduto);
      if (produto && produto.controlaEstoque) {
        const estoque = await Estoque.findOne({ where: { idProduto: item.idProduto } });
        if (estoque) {
          estoque.estoqueAtual += item.quantidade;
          await estoque.save();
        }
      }
    }

    await item.destroy();
    await recalcularTotal(idPedido);
    const pedidoAtualizado = await Pedidos.findByPk(idPedido);

    return res.status(200).json({ mensagem: 'Item removido com sucesso.', pedido: pedidoAtualizado });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao remover item do pedido.', detalhes: error.message });
  }
};
