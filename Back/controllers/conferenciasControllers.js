const ConferenciasPedido = require('../models/conferenciasPedidoModels');
const Pedidos = require('../models/pedidosModels');
const Usuario = require('../models/usuariosModels');

const STATUS_EM_PRODUCAO = 2;
const STATUS_AGUARDANDO_CONFERENCIA = 3;
const STATUS_AGUARDANDO_CLIENTE = 4;

// GET /pedidos/:id/conferencias - histórico de conferências do pedido (mais antigas primeiro)
exports.listar = async (req, res) => {
  try {
    const lista = await ConferenciasPedido.findAll({
      where: { idPedido: req.params.id },
      include: [{ model: Usuario, as: 'conferente', attributes: ['id', 'nome'] }],
      order: [['data', 'ASC'], ['id', 'ASC']],
    });
    return res.status(200).json(lista);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar conferências.', detalhes: error.message });
  }
};

// POST /pedidos/:id/conferencias - SPV-96: aprova ou devolve o pedido para retrabalho
// body: { idUsuario, resultado: 'aprovado' | 'devolvido', motivo }
//   aprovado  -> pedido vai para "Aguardando cliente" (4)
//   devolvido -> pedido volta para "Em produção" (2); motivo é obrigatório
exports.registrar = async (req, res) => {
  try {
    const idUsuario = Number(req.body.idUsuario);
    const { resultado } = req.body;
    const motivo = req.body.motivo?.trim() || null;

    if (!idUsuario) return res.status(400).json({ erro: 'idUsuario (conferente) é obrigatório.' });
    if (!['aprovado', 'devolvido'].includes(resultado)) {
      return res.status(400).json({ erro: "resultado deve ser 'aprovado' ou 'devolvido'." });
    }
    if (resultado === 'devolvido' && !motivo) {
      return res.status(400).json({ erro: 'Informe o motivo da devolução (o que precisa ser refeito).' });
    }

    const pedido = await Pedidos.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.status !== STATUS_AGUARDANDO_CONFERENCIA) {
      return res.status(400).json({ erro: 'Só dá para conferir pedidos que estão "Aguardando conferência".' });
    }
    if (!(await Usuario.findByPk(idUsuario))) {
      return res.status(404).json({ erro: 'Conferente não encontrado.' });
    }

    const conferencia = await ConferenciasPedido.create({ idPedido: pedido.id, idUsuario, resultado, motivo });

    pedido.status = resultado === 'aprovado' ? STATUS_AGUARDANDO_CLIENTE : STATUS_EM_PRODUCAO;
    await pedido.save();

    return res.status(201).json({ conferencia, pedido });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao registrar conferência.', detalhes: error.message });
  }
};
