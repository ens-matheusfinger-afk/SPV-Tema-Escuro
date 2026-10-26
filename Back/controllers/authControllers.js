const crypto = require('crypto');
const Usuario = require('../models/usuariosModels');
const UsuarioTela = require('../models/usuarioTelaModels');
const { registrarLog } = require('../utils/logs');

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
        // SPV-111: tentativa errada também fica registrada (sem gravar a senha)
        if(!usuario || usuario.senha !== gerarHashMD5(String(senha))){
            await registrarLog(req, {
                modulo:'acesso', acao:'login_falhou', entidade:'usuario', idEntidade: usuario?.id ?? null,
                idUsuario: usuario?.id ?? null, usuarioNome: usuario?.nome ?? null,
                descricao:`Tentativa de login falhou para o usuário "${String(login).trim().slice(0, 50)}" (${usuario ? 'senha errada' : 'usuário não existe'})`,
            });
            return res.status(401).json({ erro:'Usuário ou senha inválidos.' });
        }

        if(Number(usuario.status) !== 1){
            await registrarLog(req, {
                modulo:'acesso', acao:'login_bloqueado', entidade:'usuario', idEntidade: usuario.id,
                idUsuario: usuario.id, usuarioNome: usuario.nome,
                descricao:`Usuário inativo "${usuario.login}" tentou entrar`,
            });
            return res.status(403).json({ erro:'Usuário inativo. Fale com o administrador.' });
        }

        const dados = usuario.toJSON();
        delete dados.senha;

        await registrarLog(req, {
            modulo:'acesso', acao:'login', entidade:'usuario', idEntidade: usuario.id,
            idUsuario: usuario.id, usuarioNome: usuario.nome,
            descricao:`Entrou no sistema (${usuario.login})`,
        });

        res.json(dados);
    }catch(erro){
        res.status(500).json({ erro:erro.message });
    }
}

// POST /login/sair - SPV-111: registra a saída (manual ou por inatividade - REQ030)
async function sair(req,res){
    const motivo = req.body?.motivo === 'inatividade' ? 'inatividade' : 'manual';
    await registrarLog(req, {
        modulo:'acesso', acao: motivo === 'inatividade' ? 'sessao_expirada' : 'logout',
        descricao: motivo === 'inatividade' ? 'Sessão encerrada por inatividade' : 'Saiu do sistema',
    });
    res.json({ mensagem:'Saída registrada.' });
}

module.exports = {
    entrar,
    sair
};
