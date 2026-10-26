// Funções usadas pelas contas a pagar e a receber (SPV-85/86)

// "AAAA-MM-DD" de hoje no fuso do servidor
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto ?? ''))) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

// Valor em reais com até 2 casas, maior que zero e que caiba em NUMERIC(10,2)
function valorValido(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 && n <= 99999999.99 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
}

const centavos = (valor) => Math.round(Number(valor) * 100);

class ErroValidacao extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const falhar = (mensagem, status = 400) => {
  throw new ErroValidacao(status, mensagem);
};

function responderErro(res, erro, mensagemPadrao) {
  if (erro instanceof ErroValidacao) return res.status(erro.status).json({ erro: erro.message });
  return res.status(500).json({ erro: mensagemPadrao, detalhes: erro.message });
}

module.exports = { hojeISO, dataValida, valorValido, centavos, falhar, responderErro };
