const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sistemaVendas',
  password: 'nova_senha',
  port: 5432,
});

module.exports = pool;