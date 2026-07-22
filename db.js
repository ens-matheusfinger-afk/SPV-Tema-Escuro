const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'CRIE O DB AINDA',
  password: 'nova_senha',
  port: 5432,
});

module.exports = pool;