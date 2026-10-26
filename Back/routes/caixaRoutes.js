const express = require('express');
const router = express.Router();
const caixaControllers = require('../controllers/caixaControllers');

// REQ013 — SPV-84 (fechamento) / SPV-97 (entradas por forma de pagamento)
router.get('/', caixaControllers.doDia); // ?data=AAAA-MM-DD
router.get('/periodo', caixaControllers.periodo); // ?de=&ate=
router.get('/fluxo', caixaControllers.fluxo); // ?de=&ate= - SPV-81 relatório de fluxo de caixa
router.get('/fechamentos', caixaControllers.fechamentos);
router.post('/', caixaControllers.lancar);
router.post('/fechar', caixaControllers.fechar);
router.delete('/:id', caixaControllers.excluir);

module.exports = router;
