const crypto = require('crypto');
const Usuario = require('../models/usuariosModels');
const UsuarioTela = require('../models/usuarioTelaModels');

function gerarHashMD5(texto){
    return crypto.createHash('md5').update(texto).digest('hex');
}

// POST /login - REQ003: autenticação
// Recebe { login, senha } e devolve o usuário (sem a senha) com as telas liberadas (UsuarioTelas)
async function entrar(req,res){
    try{
        const { login, senha } = req.body || {};

        if(!login || !senha){
            return res.status(400).json({ erro:'Informe o usuário e a senha.' });
        }

        const usuario = await Usuario.findOne({
            where:{ login: String(login).trim().toLowerCase() },
            include: UsuarioTela
        });

        // Mesma mensagem para usuário inexistente e senha errada (não revela qual dos dois errou)
        if(!usuario || usuario.senha !== gerarHashMD5(String(senha))){
            return res.status(401).json({ erro:'Usuário ou senha inválidos.' });
        }

        if(Number(usuario.status) !== 1){
            return res.status(403).json({ erro:'Usuário inativo. Fale com o administrador.' });
        }

        const dados = usuario.toJSON();
        delete dados.senha;

        res.json(dados);
    }catch(erro){
        res.status(500).json({ erro:erro.message });
    }
}

module.exports = {
    entrar
};
