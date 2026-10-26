const Pedidos = require('../models/pedidosModels');
const ItensPedido = require('../models/itensPedidoModels');
const Produtos = require('../models/produtosModels');
const Servicos = require('../models/servicosModels');
const Estoque = require('../models/estoqueModels');
const MovimentacoesEstoque = require('../models/movimentacoesEstoqueModels');
const Usuario = require('../models/usuariosModels');
const ApontamentosProducao = require('../models/apontamentosProducaoModels');
const { Op } = require('sequelize');
const UsuarioTela = require('../models/usuarioTelaModels');
const { contasVencidasPorCliente } = require('../utils/inadimplencia');
const sequelize = require('../config/database');
const ContasReceber = require('../models/contasReceberModels');
const { calcularTotalPedido } = require('../utils/descontos');

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

    // SPV-118: cliente com conta vencida não abre pedido novo, a não ser com liberação
    // de alguém com acesso ao financeiro (tela "Contas a receber"), com motivo.
    const devendo = (await contasVencidasPorCliente(idCliente)).get(Number(idCliente));
    let liberacao = {};
    if (devendo) {
      const pedidoLiberacao = req.body.liberacao;
      if (!pedidoLiberacao) {
        return res.status(409).json({
          erro: `Cliente com ${devendo.contas.length} conta(s) vencida(s) (R$ ${devendo.totalVencido.toFixed(2).replace('.', ',')}). Novo pedido bloqueado até o pagamento ou liberação do financeiro.`,
          codigo: 'CLIENTE_INADIMPLENTE',
          totalVencido: devendo.totalVencido,
          contas: devendo.contas,
        });
      }
      const motivo = String(pedidoLiberacao.motivo ?? '').trim();
      if (motivo.length < 5) {
        return res.status(400).json({ erro: 'Explique o motivo da liberação (pelo menos 5 letras).' });
      }
      const podeLiberar = await UsuarioTela.findOne({
        where: { idUsuario: pedidoLiberacao.idUsuario, tela: 'contas-receber', podeAcessar: true },
      });
      if (!podeLiberar) {
        return res.status(403).json({ erro: 'Só quem tem acesso a "Contas a receber" pode liberar pedido para cliente devendo.' });
      }
      liberacao = { idLiberadoPor: pedidoLiberacao.idUsuario, motivoLiberacao: motivo.slice(0, 255) };
    }

    const pedido = await Pedidos.create({
      ...liberacao,
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
        { model: Usuario, as: 'liberadoPor', attributes: ['id', 'nome'] },
        { model: Usuario, as: 'descontoPor', attributes: ['id', 'nome'] }, // SPV-73
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

    // status, total e desconto são controlados por rotas/lógica dedicadas, não pelo editar geral
    const {
      status, total, subtotal, descontoTipo, descontoInformado, valorDesconto, motivoDesconto, idDescontoPor,
      ...camposPermitidos
    } = req.body;

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

    // SPV-96: aprovar (3 -> 4) ou devolver (3 -> 2) passa pela conferência, que fica registrada
    if (pedido.status === 3 && (status === 4 || status === 2)) {
      return res.status(400).json({
        erro: 'Para aprovar ou devolver, registre a conferência (POST /pedidos/:id/conferencias).',
      });
    }

    // SPV-94: não sai da produção com operador ainda trabalhando no pedido
    if (status >= 3 && status !== STATUS_CANCELADO) {
      const emAndamento = await ApontamentosProducao.count({
        where: { idPedido: pedido.id, fim: { [Op.is]: null } },
      });
      if (emAndamento > 0) {
        return res.status(400).json({
          erro: `Há ${emAndamento} apontamento(s) de produção em andamento neste pedido. Conclua antes de avançar.`,
        });
      }
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
        await MovimentacoesEstoque.movimentar(estoque, item.quantidade, {
          tipo: 'devolucao',
          motivo: `Pedido nº ${id} cancelado`,
          idPedido: Number(id),
        });
      }
    }

    // Encerra a produção que ainda estava aberta (o histórico continua salvo)
    await ApontamentosProducao.update(
      { fim: new Date(), quantidadeProduzida: 0, observacao: 'Encerrado: pedido cancelado' },
      { where: { idPedido: id, fim: { [Op.is]: null } } }
    );

    pedido.status = STATUS_CANCELADO;
    await pedido.save();

    return res.status(200).json({ mensagem: 'Pedido cancelado com sucesso.', pedido });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao cancelar pedido.', detalhes: error.message });
  }
};

// PUT /pedidos/:id/desconto - SPV-73: aplicar, trocar ou tirar o desconto do pedido
// body: { tipo: 'valor' | 'percentual' | null, valor, motivo, idUsuario }
// tipo null (ou vazio) = tira o desconto. Pedido finalizado ou cancelado não muda mais.
exports.aplicarDesconto = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};
    const tipo = body.tipo || null;

    const resultado = await sequelize.transaction(async (transaction) => {
      const pedido = await Pedidos.findByPk(id, { transaction, lock: true });
      if (!pedido) return { status: 404, json: { erro: 'Pedido não encontrado.' } };
      if (pedido.status >= STATUS_FINALIZADO) {
        return { status: 409, json: { erro: 'Pedido finalizado ou cancelado não pode receber desconto.' } };
      }
      if (!(await Usuario.findByPk(body.idUsuario, { transaction }))) {
        return { status: 400, json: { erro: 'Informe quem está dando o desconto (idUsuario).' } };
      }

      let campos;
      if (!tipo) {
        campos = { descontoTipo: null, descontoInformado: 0, motivoDesconto: null, idDescontoPor: null };
      } else {
        if (!['valor', 'percentual'].includes(tipo)) {
          return { status: 400, json: { erro: "Tipo de desconto inválido: use 'valor' (R$) ou 'percentual' (%)." } };
        }
        const valor = Number(body.valor);
        const centavosOk = Number.isFinite(valor) && Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
        if (!centavosOk || valor <= 0) {
          return { status: 400, json: { erro: 'Informe um desconto maior que zero, com até 2 casas decimais.' } };
        }
        if (tipo === 'percentual' && valor > 100) {
          return { status: 400, json: { erro: 'O desconto em % vai de 0,01 a 100.' } };
        }
        if (tipo === 'valor' && valor > Number(pedido.subtotal)) {
          return {
            status: 400,
            json: { erro: `O desconto não pode passar do valor dos itens (R$ ${Number(pedido.subtotal).toFixed(2).replace('.', ',')}).` },
          };
        }
        const motivo = String(body.motivo ?? '').trim();
        if (motivo.length < 3) return { status: 400, json: { erro: 'Informe o motivo do desconto.' } };
        if (motivo.length > 255) return { status: 400, json: { erro: 'O motivo pode ter no máximo 255 caracteres.' } };
        campos = { descontoTipo: tipo, descontoInformado: valor, motivoDesconto: motivo, idDescontoPor: Number(body.idUsuario) };
      }

      const valores = calcularTotalPedido({
        subtotal: pedido.subtotal,
        descontoTipo: campos.descontoTipo,
        descontoInformado: campos.descontoInformado,
      });

      // Não pode ficar menor do que o cliente já pagou deste pedido
      const recebido = Number(
        (await ContasReceber.sum('total', {
          where: { idPedido: pedido.id, dataRecebimento: { [Op.ne]: null } },
          transaction,
        })) ?? 0
      );
      if (Math.round(valores.total * 100) < Math.round(recebido * 100)) {
        return {
          status: 409,
          json: { erro: `O cliente já pagou R$ ${recebido.toFixed(2).replace('.', ',')} deste pedido: o total não pode ficar abaixo disso.` },
        };
      }

      await pedido.update({ ...campos, ...valores }, { transaction });
      // conta a receber do pedido acompanha o novo total (trigger 6; chamada aqui também por garantia)
      await sequelize.query('SELECT fn_recalcular_conta_receber(:id)', { replacements: { id: pedido.id }, transaction });
      return { status: 200, json: pedido };
    });

    return res.status(resultado.status).json(resultado.json);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao aplicar desconto.', detalhes: error.message });
  }
};
