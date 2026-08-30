const express = require('express');
const router = express.Router();
const controller = require('../controllers/movimentacoesControllers');

router.post('/receber', controller.receber);
router.post('/receber-desconto', controller.receberDesconto);
router.post('/pagar', controller.Pagar);
router.get('/', controller.listar);

module.exports = router;