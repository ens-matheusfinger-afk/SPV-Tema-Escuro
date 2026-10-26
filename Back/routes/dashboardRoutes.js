const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardControllers');

// SPV-101 — dashboard gerencial (faturamento, pedidos, ticket médio, produção)
router.get('/', controller.resumo);

module.exports = router;
