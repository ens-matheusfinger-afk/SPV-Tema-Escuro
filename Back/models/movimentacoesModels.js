const db = require('../config/db');

class MovimentacoesModel {
    static async receber(dados) {
        const { idReceber, idUsuario, valorTotal } = dados;
        const [result] = await db.query(
            `INSERT INTO movimentacoes (tipo, idReceber, idUsuario, valorTotal) VALUES ('RECEBER', ?, ?, ?)`,
            [idReceber, idUsuario, valorTotal]
        );
        return result.insertId;
    }

    static async Pagar(dados) {
        const { idPagar, idUsuario, valorTotal } = dados;
        const [result] = await db.query(
            `INSERT INTO movimentacoes (tipo, idPagar, idUsuario, valorTotal) VALUES ('PAGAR', ?, ?, ?)`,
            [idPagar, idUsuario, valorTotal]
        );
        return result.insertId;
    }

    static async receberDesconto(dados) {
        const { idReceber, idUsuario, valorTotal, desconto } = dados;
        const valorFinal = valorTotal - (desconto || 0);
        const [result] = await db.query(
            `INSERT INTO movimentacoes (tipo, idReceber, idUsuario, valorTotal) VALUES ('RECEBER_DESCONTO', ?, ?, ?)`,
            [idReceber, idUsuario, valorFinal]
        );
        return result.insertId;
    }

    static async listarTudo() {
        const [rows] = await db.query(`SELECT * FROM movimentacoes`);
        return rows;
    }
}

module.exports = MovimentacoesModel;