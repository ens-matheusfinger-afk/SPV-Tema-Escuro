const express = require('express');
const router = express.Router();
const servicosControllers = require('../controllers/servicosControllers');

router.post('/', servicosControllers.cadastra);
router.get('/', servicosControllers.listar);
router.get('/:id', servicosControllers.buscarPorId);
router.put('/:id', servicosControllers.editar);
router.delete('/:id', servicosControllers.deleta);

module.exports = router;
