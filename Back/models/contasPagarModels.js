const db = require('../config/db');

class ContasPagarModel {
    static async criarPendencia(dados) {
        const { item, tipo, descricao, dataPagamento, valor } = dados;
        const [result] = await db.query(
            `INSERT INTO contasPagar (item, tipo, descricao, dataPagamento, valor) VALUES (?, ?, ?, ?, ?)`,
            [item, tipo, descricao, dataPagamento, valor]
        );
        return result.insertId;
    }

    static async editarPendencia(id, dados) {
        const { item, tipo, descricao, dataPagamento, valor } = dados;
        await db.query(
            `UPDATE contasPagar SET item = ?, tipo = ?, descricao = ?, dataPagamento = ?, valor = ? WHERE id = ?`,
            [item, tipo, descricao, dataPagamento, valor, id]
        );
    }

    static async excluirPendencia(id) {
        await db.query(`DELETE FROM contasPagar WHERE id = ?`, [id]);
    }

    static async listarTudo() {
        const [rows] = await db.query(`SELECT * FROM contasPagar`);
        return rows;
    }
}

module.exports = ContasPagarModel;