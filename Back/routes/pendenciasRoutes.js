const express = require('express');
const router = express.Router();
const controller = require('../controllers/pendenciasControllers');

// SPV-58 — pendências por cliente (dados da VIEW vw_pendencias_clientes)
router.get('/', controller.listar);

module.exports = router;
