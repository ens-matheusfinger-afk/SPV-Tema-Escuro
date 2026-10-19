const crypto = require('crypto');
const Usuario = require('../models/usuariosModels');
const UsuarioTela = require('../models/usuarioTelaModels');

function gerarHashMD5(texto){
    return crypto.createHash('md5').update(texto).digest('hex');
}

async function listar(req,res){
    try{
        const usuarios = await Usuario.findAll({
            include: UsuarioTela,
            attributes: { exclude: ['senha'] }
        });
        res.json(usuarios);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function buscar(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id, {
            include: UsuarioTela,
            attributes: { exclude: ['senha'] }
        });
        res.json(usuario);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function inserir(req,res){
    try{
        const usuario = await Usuario.create({
            login:req.body.login,
            senha:gerarHashMD5(req.body.senha),
            nome:req.body.nome,
            status:req.body.status
        });
        // nunca devolve o hash da senha
        const dados = usuario.toJSON();
        delete dados.senha;
        res.status(201).json(dados);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

async function atualizar(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id);

        const dados = {
            login:req.body.login,
            nome:req.body.nome,
            status:req.body.status
        };

        // só atualiza a senha se ela foi enviada
        if(req.body.senha){
            dados.senha = gerarHashMD5(req.body.senha);
        }

        await usuario.update(dados);

        // nunca devolve o hash da senha
        const resposta = usuario.toJSON();
        delete resposta.senha;
        res.json(resposta);
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

// PUT /usuarios/:id/senha - o próprio usuário troca a senha (tela "Meu usuário")
// Recebe { senhaAtual, novaSenha } e só troca se a senha atual estiver certa
async function alterarSenha(req,res){
    try{
        const { senhaAtual, novaSenha } = req.body || {};

        if(!senhaAtual || !novaSenha){
            return res.status(400).json({ erro:'Informe a senha atual e a nova senha.' });
        }
        if(String(novaSenha).length < 6){
            return res.status(400).json({ erro:'A nova senha precisa ter pelo menos 6 caracteres.' });
        }

        const usuario = await Usuario.findByPk(req.params.id);
        if(!usuario){
            return res.status(404).json({ erro:'Usuário não encontrado.' });
        }
        if(usuario.senha !== gerarHashMD5(String(senhaAtual))){
            return res.status(400).json({ erro:'A senha atual está incorreta.' });
        }

        await usuario.update({ senha:gerarHashMD5(String(novaSenha)) });

        res.json({ mensagem:'Senha alterada com sucesso.' });
    }catch(erro){
        res.status(500).json({ erro:erro.message });
    }
}

async function excluir(req,res){
    try{
        const usuario = await Usuario.findByPk(req.params.id);
        await usuario.destroy();
        res.json({ mensagem:"Usuário removido." });
    }catch(erro){
        res.status(500).json({erro:erro.message});
    }
}

module.exports = {
    listar,
    buscar,
    inserir,
    atualizar,
    alterarSenha,
    excluir
};