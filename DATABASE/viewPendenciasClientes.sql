-- =====================================================================
-- VIEW vw_pendencias_clientes  (SPV-58 / Dinâmica 01: consulta por View)
-- ---------------------------------------------------------------------
-- Uma linha por cliente que tem alguma pendência, já calculada pelo banco:
--   valor_vencido        -> contas a receber vencidas e em aberto (cliente devendo):
--                           conta avulsa, ou de pedido já ENTREGUE (status 5).
--                           Pedido ainda não entregue com data passada não conta
--                           (o atraso é da empresa, não do cliente).
--   contas_vencidas      -> quantas contas formam o valor vencido
--   valor_a_receber      -> tudo o que está em aberto (vencido ou não)
--   pedidos_prontos      -> pedidos "Aguardando cliente" (prontos e não retirados)
--   ids_pedidos_prontos  -> números desses pedidos (lista)
--   pedidos_em_andamento -> pedidos Cadastrado, Em produção ou Aguardando conferência
--   inadimplente         -> true quando há valor vencido (novo pedido bloqueado - SPV-118)
--
-- "Hoje" é calculado no fuso de Brasília (o Back conecta ao banco em UTC).
-- Usada pela tela "Pendências por cliente" via GET /pendencias.
-- Pode rodar de novo sem erro (apaga e recria a View; não guarda dados).
-- =====================================================================
DROP VIEW IF EXISTS vw_pendencias_clientes;

CREATE VIEW vw_pendencias_clientes AS
WITH hoje AS (
	SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS dia
),
contas AS (
	SELECT cr."idCliente" AS id_cliente,
	       SUM(cr."total") FILTER (WHERE cr."dataRecebimento" IS NULL) AS a_receber,
	       SUM(cr."total") FILTER (
	           WHERE cr."dataRecebimento" IS NULL
	             AND cr."dataPrevisao" < (SELECT dia FROM hoje)
	             AND (cr."idPedido" IS NULL OR p.status = 5)
	       ) AS vencido,
	       COUNT(*) FILTER (
	           WHERE cr."dataRecebimento" IS NULL
	             AND cr."dataPrevisao" < (SELECT dia FROM hoje)
	             AND (cr."idPedido" IS NULL OR p.status = 5)
	       ) AS qtd_vencidas
	  FROM "contasReceber" cr
	  LEFT JOIN pedidos p ON p.id = cr."idPedido"
	 WHERE cr."idCliente" IS NOT NULL
	 GROUP BY cr."idCliente"
),
peds AS (
	SELECT id_cliente,
	       COUNT(*) FILTER (WHERE status = 4) AS prontos,
	       array_agg(id ORDER BY id) FILTER (WHERE status = 4) AS ids_prontos,
	       COUNT(*) FILTER (WHERE status BETWEEN 1 AND 3) AS em_andamento
	  FROM pedidos
	 GROUP BY id_cliente
)
SELECT c.id                                 AS id_cliente,
       c.nome,
       c.telefone,
       c.fator_confianca,
       c.status                             AS cliente_ativo,
       COALESCE(ct.vencido, 0)::numeric(10,2)   AS valor_vencido,
       COALESCE(ct.qtd_vencidas, 0)::integer    AS contas_vencidas,
       COALESCE(ct.a_receber, 0)::numeric(10,2) AS valor_a_receber,
       COALESCE(pd.prontos, 0)::integer         AS pedidos_prontos,
       COALESCE(pd.ids_prontos, '{}')           AS ids_pedidos_prontos,
       COALESCE(pd.em_andamento, 0)::integer    AS pedidos_em_andamento,
       COALESCE(ct.vencido, 0) > 0              AS inadimplente
  FROM clientes c
  LEFT JOIN contas ct ON ct.id_cliente = c.id
  LEFT JOIN peds   pd ON pd.id_cliente = c.id
 WHERE COALESCE(ct.a_receber, 0) > 0
    OR COALESCE(pd.prontos, 0) > 0
    OR COALESCE(pd.em_andamento, 0) > 0;
