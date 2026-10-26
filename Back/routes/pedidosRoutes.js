const express = require('express');
const router = express.Router();
const pedidosControllers = require('../controllers/pedidosControllers');
const itensPedidoRoutes = require('./itensPedidoRoutes');
const anexosRoutes = require('./anexosRoutes');
const apontamentosRoutes = require('./apontamentosRoutes');
const conferenciasRoutes = require('./conferenciasRoutes');

router.post('/', pedidosControllers.cadastrar);
router.get('/', pedidosControllers.listar);
router.get('/:id', pedidosControllers.buscarPorId);
router.put('/:id', pedidosControllers.editar);
router.put('/:id/status', pedidosControllers.atualizarStatus);
router.put('/:id/desconto', pedidosControllers.aplicarDesconto); // SPV-73
router.delete('/:id', pedidosControllers.cancelar);

// Itens do pedido - CRUD dedicado em itensPedidoControllers/itensPedidoRoutes
router.use('/:id/itens', itensPedidoRoutes);
router.use('/:id/anexos', anexosRoutes.doPedido); // SPV-91
router.use('/:id/apontamentos', apontamentosRoutes.doPedido); // SPV-93/94/95
router.use('/:id/conferencias', conferenciasRoutes); // SPV-96

module.exports = router;
