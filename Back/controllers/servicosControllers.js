const Servicos = require('../models/servicosModels');
const ItensPedido = require('../models/itensPedidoModels');

// POST /servicos - REQ006: Cadastro de Serviços
exports.cadastra = async (req, res) => {
  try {
    const { nome, descricao, valor, duracaoEstimada } = req.body;

    if (!nome || valor === undefined) {
      return res.status(400).json({ erro: 'Nome e valor são obrigatórios.' });
    }

    const servico = await Servicos.create({
      nome,
      descricao,
      valor,
      duracaoEstimada: duracaoEstimada ?? null,
    });

    return res.status(201).json(servico);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cadastrar serviço.', detalhes: error.message });
  }
};

// GET /servicos - lista todos os serviços
exports.listar = async (req, res) => {
  try {
    const servicos = await Servicos.findAll({ order: [['nome', 'ASC']] });
    return res.status(200).json(servicos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar serviços.', detalhes: error.message });
  }
};

// GET /servicos/:id - consulta um serviço específico
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const servico = await Servicos.findByPk(id);

    if (!servico) {
      return res.status(404).json({ erro: 'Serviço não encontrado.' });
    }

    return res.status(200).json(servico);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao buscar serviço.', detalhes: error.message });
  }
};

// PUT /servicos/:id - edita um serviço existente (atualização parcial)
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    const servico = await Servicos.findByPk(id);
    if (!servico) {
      return res.status(404).json({ erro: 'Serviço não encontrado.' });
    }

    await servico.update(req.body);

    return res.status(200).json(servico);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar serviço.', detalhes: error.message });
  }
};

// DELETE /servicos/:id
exports.deleta = async (req, res) => {
  try {
    const { id } = req.params;
    const servico = await Servicos.findByPk(id);

    if (!servico) {
      return res.status(404).json({ erro: 'Serviço não encontrado.' });
    }

    // Não exclui o que já foi vendido: o pedido perderia a referência do item
    const usadoEmPedidos = await ItensPedido.count({ where: { idServico: id } });
    if (usadoEmPedidos > 0) {
      return res.status(409).json({
        erro: `Este serviço já foi usado em ${usadoEmPedidos} item(ns) de pedido e não pode ser excluído. Você pode editar o nome ou o valor.`,
      });
    }

    await servico.destroy();

    return res.status(200).json({ mensagem: 'Serviço removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao deletar serviço.', detalhes: error.message });
  }
};
