const express = require('express');
const router = express.Router();
const controller = require('../controllers/contasReceberControllers');

router.post('/pago', controller.pago);
router.delete('/cancela/:id', controller.cancela);
router.put('/adiantar/:id', controller.adiantar);
router.get('/', controller.listar);

module.exports = router;