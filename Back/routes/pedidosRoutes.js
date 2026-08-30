const express = require('express');
const router = express.Router();
const pedidosControllers = require('../controllers/pedidosControllers');
const itensPedidoRoutes = require('./itensPedidoRoutes');

router.post('/', pedidosControllers.cadastrar);
router.get('/', pedidosControllers.listar);
router.get('/:id', pedidosControllers.buscarPorId);
router.put('/:id', pedidosControllers.editar);
router.put('/:id/status', pedidosControllers.atualizarStatus);
router.delete('/:id', pedidosControllers.cancelar);

// Itens do pedido - CRUD dedicado em itensPedidoControllers/itensPedidoRoutes
router.use('/:id/itens', itensPedidoRoutes);

module.exports = router;
