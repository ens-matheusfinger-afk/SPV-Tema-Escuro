const express = require('express');
// mergeParams: true - para enxergar o ":id" (idPedido) definido no router pai (pedidosRoutes)
const router = express.Router({ mergeParams: true });
const itensPedidoControllers = require('../controllers/itensPedidoControllers');

router.get('/', itensPedidoControllers.listar);
router.post('/', itensPedidoControllers.adicionar);
router.put('/:itemId', itensPedidoControllers.editar);
router.delete('/:itemId', itensPedidoControllers.remover);

module.exports = router;
