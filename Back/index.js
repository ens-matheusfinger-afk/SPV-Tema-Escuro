require('dotenv').config();
const express = require('express');
const sequelize = require('./config/database');
const produtosRoutes = require('./routes/produtosRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');
const servicosRoutes = require('./routes/servicosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const caixaRoutes = require('./routes/caixaRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const clientesCPFRoutes = require('./routes/clientesCPFRoutes');
const clientesCNPJRoutes = require('./routes/clientesCNPJRoutes');
const contasPagarRoutes = require('./routes/contasPagarRoutes');
const contasReceberRoutes = require('./routes/contasReceberRoutes');
const movimentacoesRoutes = require('./routes/movimentacoesRoutes');
const usuarioTelaRoutes = require('./routes/usuarioTelaRoutes');
const authRoutes = require('./routes/authRoutes');
const anexosRoutes = require('./routes/anexosRoutes');
const apontamentosRoutes = require('./routes/apontamentosRoutes');
const pendenciasRoutes = require('./routes/pendenciasRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const logsRoutes = require('./routes/logsRoutes');
const { auditoria } = require('./utils/logs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(auditoria); // SPV-111: registra em logs as operações que alteram dados (REQ028)

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/produtos', produtosRoutes);
app.use('/estoque', estoqueRoutes);
app.use('/servicos', servicosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/caixa', caixaRoutes);
app.use('/clientes', clientesRoutes);
app.use('/clientes-cpf', clientesCPFRoutes);
app.use('/clientes-cnpj', clientesCNPJRoutes);
app.use('/contas-pagar', contasPagarRoutes);
app.use('/contas-receber', contasReceberRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/usuario-tela', usuarioTelaRoutes); // permissões por tela (REQ002)
app.use('/login', authRoutes);               // autenticação (REQ003)
app.use('/anexos', anexosRoutes.avulso);     // arquivos dos pedidos (SPV-91)
app.use('/apontamentos', apontamentosRoutes.avulso); // produção / M.E.S. (SPV-93/94/95)
app.use('/pendencias', pendenciasRoutes);           // pendências por cliente - VIEW (SPV-58)
app.use('/dashboard', dashboardRoutes);             // dashboard gerencial (SPV-101)
app.use('/logs', logsRoutes);                       // registro de logs (SPV-111)

sequelize
  .authenticate()
  .then(() => console.log('Conexão com o PostgreSQL estabelecida com sucesso.'))
  .catch((error) => console.error('Não foi possível conectar ao banco de dados:', error.message));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});