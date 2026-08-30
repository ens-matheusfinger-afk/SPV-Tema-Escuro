const { Op } = require('sequelize');
const Caixa = require('../models/caixaModels');
const Usuario = require('../models/usuariosModels');
const Pedidos = require('../models/pedidosModels');

// Monta o intervalo [00:00:00, 23:59:59] de uma data 'YYYY-MM-DD' (ou hoje, se omitida)
function intervaloDoDia(dataStr) {
  const base = dataStr ? new Date(`${dataStr}T00:00:00`) : new Date();
  const inicio = new Date(base);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(base);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

// POST /caixa - REQ013: registra um lançamento (entrada ou saída) no caixa do dia
// Diagrama de Classes chama este método de "registrar()"
exports.cadastrar = async (req, res) => {
  try {
    const { tipo, formaPagamento, valor, descricao, idPedido, idUsuario } = req.body;

    if (!['entrada', 'saida'].includes(tipo)) {
      return res.status(400).json({ erro: "tipo deve ser 'entrada' ou 'saida'." });
    }
    if (!valor || valor <= 0) {
      return res.status(400).json({ erro: 'Informe um valor maior que zero.' });
    }
    if (!idUsuario) {
      return res.status(400).json({ erro: 'idUsuario é obrigatório (quem está registrando o lançamento).' });
    }
    if (tipo === 'entrada' && !['dinheiro', 'pix', 'cartao'].includes(formaPagamento)) {
      return res.status(400).json({ erro: "Para entradas, formaPagamento é obrigatória ('dinheiro', 'pix' ou 'cartao')." });
    }

    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    if (idPedido) {
      const pedido = await Pedidos.findByPk(idPedido);
      if (!pedido) {
        return res.status(404).json({ erro: 'Pedido não encontrado.' });
      }
    }

    const lancamento = await Caixa.create({
      tipo,
      formaPagamento: formaPagamento ?? null,
      valor,
      descricao: descricao ?? null,
      idPedido: idPedido ?? null,
      idUsuario,
    });

    return res.status(201).json(lancamento);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao registrar lançamento de caixa.', detalhes: error.message });
  }
};

// GET /caixa - REQ013: lista os lançamentos, com filtros opcionais (?data=YYYY-MM-DD&tipo=entrada|saida)
// Diagrama de Classes chama este método de "ver()"
exports.listar = async (req, res) => {
  try {
    const { data, tipo } = req.query;
    const where = {};

    if (data) {
      const { inicio, fim } = intervaloDoDia(data);
      where.data = { [Op.between]: [inicio, fim] };
    }
    if (tipo) {
      where.tipo = tipo;
    }

    const lancamentos = await Caixa.findAll({
      where,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nome'] },
        { model: Pedidos, as: 'pedido', attributes: ['id', 'descricao'] },
      ],
      order: [['data', 'DESC']],
    });

    return res.status(200).json(lancamentos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar lançamentos de caixa.', detalhes: error.message });
  }
};

// GET /caixa/:id - consulta um lançamento específico
exports.buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Caixa.findByPk(id, {
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nome'] },
        { model: Pedidos, as: 'pedido', attributes: ['id', 'descricao'] },
      ],
    });

    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    return res.status(200).json(lancamento);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao buscar lançamento.', detalhes: error.message });
  }
};

// PUT /caixa/:id - edita um lançamento (atualização parcial)
// Não permite trocar idPedido, para não desconectar o lançamento da venda original.
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    const lancamento = await Caixa.findByPk(id);
    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    const { idPedido, ...camposPermitidos } = req.body;
    await lancamento.update(camposPermitidos);

    return res.status(200).json(lancamento);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao editar lançamento.', detalhes: error.message });
  }
};

// DELETE /caixa/:id - remove um lançamento
// REQ038: idealmente exigir confirmação no front-end antes de chamar esta rota,
// já que é um dado financeiro.
exports.deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Caixa.findByPk(id);

    if (!lancamento) {
      return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    }

    await lancamento.destroy();

    return res.status(200).json({ mensagem: 'Lançamento removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao remover lançamento.', detalhes: error.message });
  }
};

// GET /caixa/fechamento?data=YYYY-MM-DD - REQ013: resumo do fechamento de caixa diário
// (total de vendas, formas de pagamento, despesas e saldo do dia)
exports.fechamentoDiario = async (req, res) => {
  try {
    const { data } = req.query;
    const { inicio, fim } = intervaloDoDia(data);

    const lancamentos = await Caixa.findAll({
      where: { data: { [Op.between]: [inicio, fim] } },
    });

    const porFormaPagamento = { dinheiro: 0, pix: 0, cartao: 0 };
    let totalEntradas = 0;
    let totalSaidas = 0;

    for (const lancamento of lancamentos) {
      const valor = Number(lancamento.valor);
      if (lancamento.tipo === 'entrada') {
        totalEntradas += valor;
        if (lancamento.formaPagamento) {
          porFormaPagamento[lancamento.formaPagamento] += valor;
        }
      } else {
        totalSaidas += valor;
      }
    }

    return res.status(200).json({
      data: inicio.toISOString().slice(0, 10),
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      porFormaPagamento,
      quantidadeLancamentos: lancamentos.length,
    });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao gerar fechamento diário.', detalhes: error.message });
  }
};
