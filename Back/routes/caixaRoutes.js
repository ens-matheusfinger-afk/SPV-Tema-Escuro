const express = require('express');
const router = express.Router();
const caixaControllers = require('../controllers/caixaControllers');

router.post('/', caixaControllers.cadastrar);
router.get('/', caixaControllers.listar);

// Precisa vir ANTES de "/:id", senão o Express entende "fechamento" como um :id
router.get('/fechamento', caixaControllers.fechamentoDiario);

router.get('/:id', caixaControllers.buscarPorId);
router.put('/:id', caixaControllers.editar);
router.delete('/:id', caixaControllers.deletar);

module.exports = router;
