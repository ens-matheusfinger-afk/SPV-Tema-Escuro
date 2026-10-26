const sequelize = require('../config/database');
const Cliente = require('../models/clientesModels');
const ClienteCPF = require('../models/clientesCPFModels');
const ClienteCNPJ = require('../models/clientesCNPJModels');
const Pedidos = require('../models/pedidosModels');
const { somenteDigitos, cpfValido, cnpjValido } = require('../utils/documentos');
const { contasVencidasPorCliente } = require('../utils/inadimplencia');

/*
 * Clientes (tabela pai) + CPF ou CNPJ (tabelas filhas) numa chamada só.
 * O cliente é pessoa física (PF, com CPF) ou jurídica (PJ, com CNPJ) — nunca os dois
 * (a trigger trg_clientes_*_exclusivo garante isso também no banco).
 *
 * body aceito no POST/PUT:
 *   { nome, telefone, email, status, observacao, fatorConfianca,
 *     tipo: 'PF' | 'PJ', documento: '529.982.247-25', nomeFantasia }
 * As rotas /clientes-cpf e /clientes-cnpj continuam funcionando (cadastro em duas etapas).
 */

const incluirDocumentos = [ClienteCPF, ClienteCNPJ];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ErroValidacao extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const falhar = (mensagem, status = 400) => {
  throw new ErroValidacao(status, mensagem);
};

const texto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim());

// Valida e normaliza os campos enviados. parcial = true (PUT): só confere o que veio no body.
function lerCampos(body, parcial) {
  const tem = (campo) => !parcial || campo in body;
  const dados = {};

  if (tem('nome')) {
    const nome = texto(body.nome);
    if (nome.length < 2) falhar('Informe o nome do cliente (pelo menos 2 letras).');
    if (nome.length > 150) falhar('O nome pode ter no máximo 150 caracteres.');
    dados.nome = nome;
  }
  if (tem('telefone')) {
    const telefone = somenteDigitos(body.telefone);
    if (telefone && (telefone.length < 10 || telefone.length > 11)) {
      falhar('Telefone inválido: use DDD + número (10 ou 11 dígitos).');
    }
    dados.telefone = telefone || null;
  }
  if (tem('email')) {
    const email = texto(body.email).toLowerCase();
    if (email && (!EMAIL.test(email) || email.length > 100)) falhar('E-mail inválido.');
    dados.email = email || null;
  }
  if (tem('status') && body.status !== undefined) dados.status = Boolean(body.status);
  if (tem('observacao')) {
    const observacao = texto(body.observacao);
    if (observacao.length > 500) falhar('A observação pode ter no máximo 500 caracteres.');
    dados.observacao = observacao || null;
  }
  if (tem('fatorConfianca') && body.fatorConfianca !== undefined) {
    const fator = Number(body.fatorConfianca);
    if (!Number.isInteger(fator) || fator < 1 || fator > 5) {
      falhar('O fator de confiança vai de 1 (baixa) a 5 (alta).');
    }
    dados.fatorConfianca = fator;
  }

  // Documento (CPF ou CNPJ)
  let documento = null;
  if (tem('tipo') && body.tipo !== undefined) {
    const tipo = texto(body.tipo).toUpperCase();
    if (!['PF', 'PJ'].includes(tipo)) falhar('Tipo de cliente inválido: use PF ou PJ.');
    const numero = somenteDigitos(body.documento);
    if (tipo === 'PF' && !cpfValido(numero)) falhar('CPF inválido. Confira os números digitados.');
    if (tipo === 'PJ' && !cnpjValido(numero)) falhar('CNPJ inválido. Confira os números digitados.');
    const nomeFantasia = texto(body.nomeFantasia);
    if (nomeFantasia.length > 150) falhar('O nome fantasia pode ter no máximo 150 caracteres.');
    documento = { tipo, numero, nomeFantasia: nomeFantasia || null };
  }

  return { dados, documento };
}

// CPF/CNPJ já usado por outro cliente? -> 409 com o nome de quem tem
async function conferirDuplicado(documento, idAtual, transaction) {
  const Modelo = documento.tipo === 'PF' ? ClienteCPF : ClienteCNPJ;
  const campo = documento.tipo === 'PF' ? 'cpf' : 'cnpj';
  const existente = await Modelo.findOne({
    where: { [campo]: documento.numero },
    include: [{ model: Cliente, attributes: ['id', 'nome'] }],
    transaction,
  });
  if (existente && existente.idCliente !== idAtual) {
    falhar(
      `Este ${documento.tipo === 'PF' ? 'CPF' : 'CNPJ'} já está cadastrado para o cliente "${existente.Cliente?.nome}" (nº ${existente.idCliente}).`,
      409,
    );
  }
}

// Grava o CPF ou o CNPJ do cliente (troca de PF para PJ apaga o documento antigo)
async function gravarDocumento(idCliente, documento, transaction) {
  if (documento.tipo === 'PF') {
    await ClienteCNPJ.destroy({ where: { idCliente }, transaction });
    const atual = await ClienteCPF.findOne({ where: { idCliente }, transaction });
    if (atual) await atual.update({ cpf: documento.numero }, { transaction });
    else await ClienteCPF.create({ idCliente, cpf: documento.numero }, { transaction });
  } else {
    await ClienteCPF.destroy({ where: { idCliente }, transaction });
    const atual = await ClienteCNPJ.findOne({ where: { idCliente }, transaction });
    const valores = { cnpj: documento.numero, nomeFantasia: documento.nomeFantasia };
    if (atual) await atual.update(valores, { transaction });
    else await ClienteCNPJ.create({ idCliente, ...valores }, { transaction });
  }
}

function responderErro(res, erro, mensagemPadrao) {
  if (erro instanceof ErroValidacao) return res.status(erro.status).json({ erro: erro.message });
  if (erro.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ erro: 'Este CPF/CNPJ já está cadastrado para outro cliente.' });
  }
  return res.status(500).json({ erro: mensagemPadrao, detalhes: erro.message });
}

// GET /clientes
async function listar(req, res) {
  try {
    const clientes = await Cliente.findAll({ include: incluirDocumentos, order: [['nome', 'ASC']] });
    res.json(clientes);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao listar clientes.');
  }
}

// GET /clientes/:id
async function buscar(req, res) {
  try {
    const cliente = await Cliente.findByPk(req.params.id, { include: incluirDocumentos });
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao buscar cliente.');
  }
}

// POST /clientes - cadastra o cliente e, se vier "tipo", o CPF/CNPJ junto (tudo ou nada)
async function inserir(req, res) {
  try {
    const { dados, documento } = lerCampos(req.body ?? {}, false);
    if (!dados.telefone && !dados.email) falhar('Informe ao menos um contato: telefone ou e-mail.');
    if (dados.status === undefined) dados.status = true; // cliente novo já entra ativo

    const id = await sequelize.transaction(async (transaction) => {
      if (documento) await conferirDuplicado(documento, null, transaction);
      const cliente = await Cliente.create(dados, { transaction });
      if (documento) await gravarDocumento(cliente.id, documento, transaction);
      return cliente.id;
    });

    const cliente = await Cliente.findByPk(id, { include: incluirDocumentos });
    res.status(201).json(cliente);
  } catch (erro) {
    responderErro(res, erro, 'Erro ao cadastrar cliente.');
  }
}

// PUT /clientes/:id - atualização parcial (só os campos enviados)
async function atualizar(req, res) {
  try {
    const body = req.body ?? {};
    if (Object.keys(body).length === 0) falhar('Envie ao menos um campo para atualizar.');
    const { dados, documento } = lerCampos(body, true);

    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const telefone = 'telefone' in dados ? dados.telefone : cliente.telefone;
    const email = 'email' in dados ? dados.email : cliente.email;
    if (!telefone && !email) falhar('Informe ao menos um contato: telefone ou e-mail.');

    await sequelize.transaction(async (transaction) => {
      if (documento) await conferirDuplicado(documento, cliente.id, transaction);
      await cliente.update(dados, { transaction });
      if (documento) await gravarDocumento(cliente.id, documento, transaction);
    });

    res.json(await Cliente.findByPk(cliente.id, { include: incluirDocumentos }));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao atualizar cliente.');
  }
}

// DELETE /clientes/:id - só cliente sem pedidos (LGPD: pedido de exclusão do titular).
// Quem já tem pedidos é inativado: o histórico de vendas não pode perder o cliente.
async function excluir(req, res) {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });

    const pedidos = await Pedidos.count({ where: { idCliente: cliente.id } });
    if (pedidos > 0) {
      return res.status(409).json({
        erro: `Este cliente tem ${pedidos} pedido(s) e não pode ser excluído. Use "Inativar" para que ele não apareça em pedidos novos.`,
      });
    }

    await cliente.destroy(); // CPF/CNPJ saem junto (ON DELETE CASCADE)
    res.json({ mensagem: 'Cliente removido.' });
  } catch (erro) {
    responderErro(res, erro, 'Erro ao excluir cliente.');
  }
}

// GET /clientes/inadimplentes - SPV-118/58: clientes com conta vencida (e quais contas)
async function inadimplentes(req, res) {
  try {
    const mapa = await contasVencidasPorCliente();
    res.json([...mapa.values()].sort((a, b) => b.totalVencido - a.totalVencido));
  } catch (erro) {
    responderErro(res, erro, 'Erro ao listar clientes inadimplentes.');
  }
}

module.exports = {
  inadimplentes,
  listar,
  buscar,
  inserir,
  atualizar,
  excluir,
};
