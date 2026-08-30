const express = require('express');
const router = express.Router();
const produtosControllers = require('../controllers/produtosControllers');

router.post('/', produtosControllers.cadastra);
router.get('/', produtosControllers.listar);
router.get('/:id', produtosControllers.buscarPorId);
router.put('/:id', produtosControllers.editar);
router.delete('/:id', produtosControllers.deleta);

module.exports = router;
