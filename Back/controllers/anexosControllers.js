const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AnexosPedido = require('../models/anexosPedidoModels');
const Pedidos = require('../models/pedidosModels');
const Usuario = require('../models/usuariosModels');

const STATUS_CANCELADO = 6;

// Onde os arquivos ficam salvos (Back/uploads). A pasta é criada se não existir.
const PASTA_UPLOADS = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const TAMANHO_MAXIMO_MB = 10;
const MAXIMO_POR_ENVIO = 10;

// Tipos aceitos: fotos, PDF, Word, Excel e texto (SPV-91)
const TIPOS_ACEITOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: PASTA_UPLOADS,
    // nome sorteado: dois arquivos "foto.jpg" nunca se sobrescrevem
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TIPOS_ACEITOS[file.mimetype]}`),
  }),
  limits: { fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024, files: MAXIMO_POR_ENVIO },
  fileFilter: (req, file, cb) => {
    if (TIPOS_ACEITOS[file.mimetype]) return cb(null, true);
    const erro = new Error(`Tipo de arquivo não aceito: ${file.originalname}. Envie foto, PDF, Word, Excel ou texto.`);
    erro.code = 'TIPO_NAO_ACEITO';
    return cb(erro);
  },
});

// multer grava o nome original em latin1; converte para não estragar acentos
const nomeOriginal = (file) => Buffer.from(file.originalname, 'latin1').toString('utf8');

const apagarArquivos = (files = []) =>
  files.forEach((f) => fs.unlink(f.path, () => {}));

/*
 * Confere o CONTEÚDO do arquivo, não só o nome/extensão: lê os primeiros bytes ("assinatura")
 * e vê se batem com o tipo declarado. Assim um .exe renomeado para .pdf ou .jpg é recusado.
 */
const ASSINATURAS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => b.subarray(0, 4).toString('latin1') === 'GIF8',
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  // .docx/.xlsx são pacotes ZIP; .doc/.xls são do formato antigo do Office (OLE)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  'application/msword': (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
  'application/vnd.ms-excel': (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
  // texto: não pode ter bytes nulos (sinal de arquivo binário)
  'text/plain': (b) => !b.includes(0x00),
};

function conteudoConfere(file) {
  const bytes = Buffer.alloc(512);
  const fd = fs.openSync(file.path, 'r');
  const lidos = fs.readSync(fd, bytes, 0, 512, 0);
  fs.closeSync(fd);
  const inicio = bytes.subarray(0, lidos);
  if (inicio.subarray(0, 2).toString('latin1') === 'MZ') return false; // programa do Windows (.exe/.dll)
  if (inicio.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) return false; // programa Linux (ELF)
  const confere = ASSINATURAS[file.mimetype];
  return Boolean(confere && lidos > 0 && confere(inicio));
}

const MENSAGENS_MULTER = {
  LIMIT_FILE_SIZE: `Cada arquivo pode ter no máximo ${TAMANHO_MAXIMO_MB} MB.`,
  LIMIT_FILE_COUNT: `Envie no máximo ${MAXIMO_POR_ENVIO} arquivos por vez.`,
  LIMIT_UNEXPECTED_FILE: 'Envie os arquivos no campo "arquivos".',
};

// POST /pedidos/:id/anexos  (multipart/form-data: arquivos[] + idUsuario)
exports.enviar = (req, res) => {
  upload.array('arquivos', MAXIMO_POR_ENVIO)(req, res, async (erroUpload) => {
    if (erroUpload) {
      apagarArquivos(req.files);
      const mensagem = MENSAGENS_MULTER[erroUpload.code] || erroUpload.message;
      return res.status(400).json({ erro: mensagem });
    }

    try {
      const { id: idPedido } = req.params;
      const idUsuario = Number(req.body.idUsuario);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ erro: 'Escolha pelo menos um arquivo.' });
      }
      const falsos = req.files.filter((f) => !conteudoConfere(f));
      if (falsos.length > 0) {
        apagarArquivos(req.files);
        return res.status(400).json({
          erro: `O conteúdo de "${nomeOriginal(falsos[0])}" não confere com o tipo do arquivo (pode ser um programa ou arquivo renomeado). Envio bloqueado.`,
        });
      }
      if (!idUsuario) {
        apagarArquivos(req.files);
        return res.status(400).json({ erro: 'idUsuario é obrigatório (quem está enviando).' });
      }

      const pedido = await Pedidos.findByPk(idPedido);
      if (!pedido) {
        apagarArquivos(req.files);
        return res.status(404).json({ erro: 'Pedido não encontrado.' });
      }
      if (pedido.status === STATUS_CANCELADO) {
        apagarArquivos(req.files);
        return res.status(400).json({ erro: 'Não é possível anexar arquivos a um pedido cancelado.' });
      }
      if (!(await Usuario.findByPk(idUsuario))) {
        apagarArquivos(req.files);
        return res.status(404).json({ erro: 'Usuário não encontrado.' });
      }

      const anexos = await AnexosPedido.bulkCreate(
        req.files.map((f) => ({
          idPedido: pedido.id,
          nomeOriginal: nomeOriginal(f),
          arquivo: f.filename,
          tipo: f.mimetype,
          tamanho: f.size,
          idUsuario,
        }))
      );

      return res.status(201).json(anexos);
    } catch (error) {
      apagarArquivos(req.files);
      return res.status(500).json({ erro: 'Erro ao salvar os anexos.', detalhes: error.message });
    }
  });
};

// GET /pedidos/:id/anexos - lista os anexos do pedido (mais novos primeiro)
exports.listar = async (req, res) => {
  try {
    const anexos = await AnexosPedido.findAll({
      where: { idPedido: req.params.id },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nome'] }],
      order: [['dataEnvio', 'DESC']],
    });
    return res.status(200).json(anexos);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar anexos.', detalhes: error.message });
  }
};

// GET /anexos/:id/arquivo - abre o arquivo no navegador (?download=1 baixa)
exports.arquivo = async (req, res) => {
  try {
    const anexo = await AnexosPedido.findByPk(req.params.id);
    if (!anexo) return res.status(404).json({ erro: 'Anexo não encontrado.' });

    const caminho = path.join(PASTA_UPLOADS, path.basename(anexo.arquivo));
    if (!fs.existsSync(caminho)) {
      return res.status(404).json({ erro: 'O arquivo deste anexo não está mais no servidor.' });
    }

    const modo = req.query.download ? 'attachment' : 'inline';
    res.setHeader(
      'Content-Disposition',
      `${modo}; filename*=UTF-8''${encodeURIComponent(anexo.nomeOriginal)}`
    );
    res.type(anexo.tipo);
    return res.sendFile(caminho);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao abrir o anexo.', detalhes: error.message });
  }
};

// DELETE /anexos/:id - remove o registro e o arquivo
exports.remover = async (req, res) => {
  try {
    const anexo = await AnexosPedido.findByPk(req.params.id, {
      include: [{ model: Pedidos, as: 'pedido', attributes: ['id', 'status'] }],
    });
    if (!anexo) return res.status(404).json({ erro: 'Anexo não encontrado.' });
    if (anexo.pedido?.status === STATUS_CANCELADO) {
      return res.status(400).json({ erro: 'Pedido cancelado: os anexos ficam guardados como histórico.' });
    }

    const arquivo = anexo.arquivo;
    await anexo.destroy();
    fs.unlink(path.join(PASTA_UPLOADS, path.basename(arquivo)), () => {});

    return res.status(200).json({ mensagem: 'Anexo removido.' });
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao remover anexo.', detalhes: error.message });
  }
};
