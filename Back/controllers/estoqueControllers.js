const Estoque = require('../models/estoqueModels');
const Produtos = require('../models/produtosModels');

// POST /estoque - cadastra o controle de estoque de um produto (REQ017)
// Diagrama de Classes chama este método de "adiciona()"
exports.cadastrar = async (req, res) => {
  try {
    const { idProduto, estoqueAtual, estoqueMinimo, estoqueMaximo } = req.body;

    if (!idProduto) {
      return res.status(400).json({ erro: 'idProduto é obrigatório.' });
    }

    const produto = await Produtos.findByPk(idProduto);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    if (!produto.controlaEstoque) {
      return res.status(400).json({
        erro: 'Este produto não está marcado como "controlaEstoque". Edite o produto antes de cadastrar o estoque dele.',
      });
    }

    const jaExiste = await Estoque.findOne({ where: { idProduto } });
    if (jaExiste) {
      return res.status(409).json({ erro: 'Este produto já possui um registro de estoque.' });
    }

    const estoque = await Estoque.create({
      idProduto,
      estoqueAtual: estoqueAtual ?? 0,
      estoqueMinimo: estoqueMinimo ?? 0,
      estoqueMaximo: estoqueMaximo ?? null,
    });

    return res.status(201).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cadastrar estoque.', detalhes: error.message });
  }
};

// GET /estoque - lista todo o estoque, já trazendo os dados do produto (JOIN)
exports.listar = async (req, res) => {
  try {
    const estoque = await Estoque.findAll({
      include: [{ model: Produtos, as: 'produto', attributes: ['id', 'nome', 'valor'] }],
      order: [['id', 'ASC']],
    });
    return res.status(200).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar estoque.', detalhes: error.message });
  }
};

// GET /estoque/produto/:idProduto - consulta rápida do saldo de um produto (REQ017)
exports.buscarPorProduto = async (req, res) => {
  try {
    const { idProduto } = req.params;

    const estoque = await Estoque.findOne({
      where: { idProduto },
      include: [{ model: Produtos, as: 'produto', attributes: ['id', 'nome', 'valor'] }],
    });

    if (!estoque) {
      return res.status(404).json({ erro: 'Este produto não possui controle de estoque cadastrado.' });
    }

    return res.status(200).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao consultar saldo.', detalhes: error.message });
  }
};

// PUT /estoque/:id - edita estoqueMinimo/estoqueMaximo (atualização parcial)
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    // idProduto e estoqueAtual não se editam por aqui: idProduto é fixo após o
    // cadastro, e estoqueAtual só muda via /entrada ou /saida, para manter o saldo confiável.
    const { idProduto, estoqueAtual, ...camposPermitidos } = req.body;

    const estoque = await Estoque.findByPk(id);
    if (!estoque) {
      return res.status(404).json({ erro: 'Registro de estoque não encontrado.' });
    }

    await estoque.update(camposPermitidos);

    return res.status(200).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar estoque.', detalhes: error.message });
  }
};

// POST /estoque/:id/entrada - REQ017: registra entrada de produto
// Diagrama de Classes chama este método de "adiciona()"
exports.entrada = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Informe uma quantidade de entrada maior que zero.' });
    }

    const estoque = await Estoque.findByPk(id);
    if (!estoque) {
      return res.status(404).json({ erro: 'Registro de estoque não encontrado.' });
    }

    estoque.estoqueAtual += quantidade;
    await estoque.save();

    return res.status(200).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao registrar entrada.', detalhes: error.message });
  }
};

// POST /estoque/:id/saida - REQ017: registra saída de produto, validando saldo disponível
// Diagrama de Classes chama este método de "consome()"
exports.saida = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ erro: 'Informe uma quantidade de saída maior que zero.' });
    }

    const estoque = await Estoque.findByPk(id);
    if (!estoque) {
      return res.status(404).json({ erro: 'Registro de estoque não encontrado.' });
    }

    if (estoque.estoqueAtual < quantidade) {
      return res.status(400).json({
        erro: 'Saldo insuficiente.',
        estoqueAtual: estoque.estoqueAtual,
      });
    }

    estoque.estoqueAtual -= quantidade;
    await estoque.save();

    return res.status(200).json(estoque);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao registrar saída.', detalhes: error.message });
  }
};

// DELETE /estoque/:id - remove o controle de estoque de um produto
// Diagrama de Classes chama este método de "cancela()"
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const estoque = await Estoque.findByPk(id);

    if (!estoque) {
      return res.status(404).json({ erro: 'Registro de estoque não encontrado.' });
    }

    await estoque.destroy();

    return res.status(200).json({ mensagem: 'Registro de estoque removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao remover estoque.', detalhes: error.message });
  }
};
