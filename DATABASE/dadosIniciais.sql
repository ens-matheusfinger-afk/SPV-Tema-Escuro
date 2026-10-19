-- =====================================================================
-- SPV - Dados iniciais (rodar depois de instalarBanco.sql e triggers.sql)
-- ---------------------------------------------------------------------
-- Cria o usuário administrador para o primeiro login, com acesso a todas
-- as telas. Pode rodar de novo sem duplicar nada.
--
--   Usuário: admin
--   Senha:   123      <- troque no primeiro acesso, na tela "Meu usuário"
--
-- A senha é gravada como hash MD5, o mesmo formato que o Back usa
-- (usuariosControllers / authControllers). Nunca grave senha em texto puro.
--
-- Os demais usuários são criados pela tela "Usuários" do sistema.
-- =====================================================================

-- 1) Usuário administrador (só cria se ainda não existir)
INSERT INTO "usuarios" ("login", "senha", "nome", "status")
SELECT 'admin', md5('123'), 'Administrador', 1
WHERE NOT EXISTS (SELECT 1 FROM "usuarios" WHERE "login" = 'admin');

-- 2) Libera todas as telas para o admin
-- As chaves das telas são as mesmas de Front/Sistema Vendas/src/utils/constants.js (TELAS)
INSERT INTO "usuarioTela" ("idUsuario", "tela", "podeAcessar")
SELECT u.id, t.tela, true
  FROM "usuarios" u
 CROSS JOIN (VALUES
       ('dashboard'), ('pedidos'), ('producao'), ('conferencia'), ('retirada'),
       ('usuarios'), ('clientes'), ('produtos'), ('servicos'), ('estoque'),
       ('caixa'), ('contas-pagar'), ('contas-receber'), ('pendencias')
     ) AS t(tela)
 WHERE u."login" = 'admin'
   AND NOT EXISTS (
       SELECT 1 FROM "usuarioTela" ut
        WHERE ut."idUsuario" = u.id AND ut."tela" = t.tela
   );

-- Conferência: deve mostrar o admin com 14 telas
SELECT u."login", u."nome", COUNT(ut.id) AS telas_liberadas
  FROM "usuarios" u
  LEFT JOIN "usuarioTela" ut ON ut."idUsuario" = u.id AND ut."podeAcessar"
 WHERE u."login" = 'admin'
 GROUP BY u."login", u."nome";
