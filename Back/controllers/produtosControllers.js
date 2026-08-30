const Produtos = require('../models/produtosModels');

// POST /produtos - REQ007: Cadastro de Produtos
// Diagrama de Classes chama este método de "cadastra()"
exports.cadastra = async (req, res) => {
  try {
    const { nome, descricao, valor, controlaEstoque } = req.body;

    if (!nome || valor === undefined) {
      return res.status(400).json({ erro: 'Nome e valor são obrigatórios.' });
    }

    const produto = await Produtos.create({
      nome,
      descricao,
      valor,
      controlaEstoque: controlaEstoque ?? false,
    });

    return res.status(201).json(produto);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cadastrar produto.', detalhes: error.message });
  }
};

// GET /produtos - lista todos os produtos
exports.listar = async (req, res) => {
  try {
    const produtos = await Produtos.findAll({ order: [['nome', 'ASC']] });
    return res.status(200).json(produtos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar produtos.', detalhes: error.message });
  }
};

// GET /produtos/:id - consulta um produto específico
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produtos.findByPk(id);

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.status(200).json(produto);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao buscar produto.', detalhes: error.message });
  }
};

// PUT /produtos/:id - edita um produto existente
// Atualização parcial: só as chaves enviadas no body são alteradas,
// o resto do produto permanece como estava no banco.
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    const produto = await Produtos.findByPk(id);
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    await produto.update(req.body);

    return res.status(200).json(produto);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar produto.', detalhes: error.message });
  }
};

// DELETE /produtos/:id
// Diagrama de Classes chama este método de "deleta()"
exports.deleta = async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await Produtos.findByPk(id);

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    await produto.destroy();

    return res.status(200).json({ mensagem: 'Produto removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao deletar produto.', detalhes: error.message });
  }
};
