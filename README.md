# SPV — Sistema de Pedidos e Vendas

Sistema web de gestão empresarial voltado para pequenas e médias empresas (PMEs) que trabalham com **produção sob encomenda** (confecções, prestadores de serviço, pequenas indústrias e comércios em geral). O SPV centraliza todo o ciclo do negócio — do cadastro do pedido ao fechamento do caixa — substituindo cadernos, planilhas soltas e conversas de WhatsApp por um sistema único, acessível e intuitivo.

> Projeto desenvolvido pela equipe *SPV* como trabalho acadêmico do curso de Bacharelado em Engenharia de Software (Centro Universitário UGV).

---

## Sobre o projeto

O SPV nasce da constatação de que a maioria das PMEs brasileiras (99% dos estabelecimentos formais do país) ainda opera sem um sistema de gestão adequado, recorrendo a planilhas, cadernos ou soluções genéricas que não acompanham o fluxo real do negócio. Ao mesmo tempo, ERPs tradicionais (SAP, TOTVS) são caros, complexos e pouco aderentes à rotina de um pequeno negócio sob encomenda.

O SPV se posiciona como uma alternativa **enxuta, modular e acessível**, cobrindo o ciclo completo:

```
Pedido → Produção (M.E.S.) → Conferência de Qualidade → Entrega → Financeiro → Indicadores (BI)
```

## Problema que o sistema resolve

- Pedidos perdidos ou esquecidos por falta de controle centralizado
- Ausência de rastreabilidade da produção (quem fez, quando, quanto tempo levou)
- Entregas sem conferência de qualidade formal
- Fechamento de caixa impreciso e sem histórico auditável
- Falta de controle de contas a pagar/receber e inadimplência não identificada
- Gestores sem visão consolidada do negócio (sem indicadores gerenciais)

## Principais funcionalidades

| Módulo                       | Descrição                                                                      |
|------------------------------|--------------------------------------------------------------------------------|
| **Usuários e permissões**    | Cadastro de usuários, perfis de acesso e autenticação (login)                  |
| **Pedidos**                  | Criação, edição, alteração de status e impressão (papel/etiqueta)              |
| **Produtos e Serviços**      | Cadastro de itens vendáveis, de confecção ou de estoque                        |
| **Produção (M.E.S.)**        | Apontamento de tempo e quantidade produzida por operador                       |
| **Conferência de Qualidade** | Validação do pedido antes da liberação ao cliente                              |
| **Financeiro**               | Fechamento de caixa diário, contas a pagar e a receber, pendências por cliente |
| **Estoque**                  | Controle de entradas, saídas e saldo de produtos para venda                    |
| **BI / Indicadores**         | Painel gerencial com faturamento, produtividade e volume de pedidos            |
| **Relatórios**               | Exportação em PDF e Excel                                                      |

Cada funcionalidade corresponde a um requisito documentado (REQ001 a REQ040) no Documento de Visão do projeto, cobrindo tanto requisitos funcionais quanto não funcionais (desempenho, segurança, usabilidade, LGPD, etc.).

## Arquitetura

O SPV segue o padrão **MVC (Model - Controller - Routes)** no back-end, com ORM **Sequelize** para abstração do banco de dados relacional **PostgreSQL**. A arquitetura é cliente-servidor:

- **Front-end**: interface web responsiva (React + Vite), consumindo a API via requisições HTTP
- **Back-end**: Node.js + Express, com autenticação, controle de sessão e regras de negócio
- **Banco de Dados**: PostgreSQL, com backup automático diário
- **BI**: integração dos dados com ferramentas de visualização (Power BI)

## Tecnologias utilizadas

**Back-end**
- Node.js / Express
- Sequelize ORM
- PostgreSQL
- dotenv (variáveis de ambiente)

**Front-end**
- React
- Vite

**Ferramentas de apoio**
- pgAdmin (administração do banco)
- Insomnia (testes de API)
- Git / GitHub (versionamento)

## Estrutura do repositório

Este README fica **na raiz do repositório**, junto das pastas principais, e é o **único arquivo desse tipo em todo o projeto** — não existe um README separado dentro de `Back/`, `Front/` ou `DATABASE/` (E se existir, está incorreto). Toda documentação, contexto e histórico de mudanças ficam concentrados aqui.

```
├── Back/         # API REST (models, controllers, routes, middlewares)
├── Front/        # Aplicação React (Vite)
├── DATABASE/     # Scripts SQL, dump do banco e documentação do modelo de dados
└── README.md     # Documento único: visão do projeto + log de alterações
```

## Colaboradores e fluxo de trabalho no Git

O projeto é desenvolvido em equipe, e cada colaborador trabalha em sua **própria branch** dentro do repositório, evitando conflitos diretos na branch principal e mantendo um histórico organizado de commits por autor.

**Fluxo adotado:**

1. Cada integrante cria e trabalha em uma branch pessoal, seguindo o padrão:
   ```
   nome-do-colaborador/nome-da-feature
   ```
   Exemplo: `diego/cadastro-usuarios`, `matheus/modulo-financeiro`

2. Os commits são feitos de forma incremental e descritiva na branch individual.

3. Ao concluir uma funcionalidade, o colaborador (Product Ower) abre um **Pull Request** para a branch principal (`main` ou `develop`), permitindo revisão do código antes da integração.

4. A branch principal reúne apenas o código já revisado e testado por toda a equipe.

**Equipe:**

| Colaborador                  | Área de atuação      | Tabelas atribuídas                                                                   |
|------------------------------|----------------------|--------------------------------------------------------------------------------------|
| Diego José dos Santos        | Desenvolvimento / TI | Product Owner                                                                        |
| Matheus Dalanhol Finger      | Desenvolvimento / TI | Produtos, Estoque, Serviços, Clientes (PF/PJ), Pedidos, ItensPedido, Caixa           |
| Carlos Eduardo Borges        | Desenvolvimento / TI | contasPagar, contasReceber, movimentacoes                                            |

## Segurança e conformidade

- Autenticação obrigatória em todos os módulos, sem acesso sem sessão válida
- Senhas armazenadas com hashing seguro (nunca em texto puro)
- Comunicação via HTTPS/SSL/TLS
- Encerramento automático de sessão por inatividade
- Conformidade com a **LGPD** (Lei nº 13.709/2018) na proteção de dados pessoais de clientes e colaboradores

## Como rodar o sistema do zero (front + Back + banco)

> Os caminhos abaixo são **relativos à pasta do projeto**, onde fica este README. Cada integrante pode ter o projeto em um lugar diferente (`C:\Projetos\Sistema_Vendas`, `Downloads\Sistema_Vendas-main`, etc.) e a pasta do front pode ter outro nome no seu computador. Use sempre: **pasta do Back** = a que tem o `index.js`; **pasta do front** = a que tem o `vite.config.js`.

### 0. O que precisa estar instalado (uma vez só)

| Programa | Para quê | Como conferir no terminal |
|---|---|---|
| [Node.js](https://nodejs.org) (versão LTS) | Rodar o Back e o front | `node -v` |
| [PostgreSQL](https://www.postgresql.org/download/) + pgAdmin | Banco de dados | Abrir o pgAdmin e conectar no servidor |
| [Git](https://git-scm.com) | Baixar o projeto e enviar alterações | `git --version` |

Anote a **senha do usuário `postgres`** definida na instalação do PostgreSQL (não confundir com a senha mestra do pgAdmin).

### Como abrir o terminal dentro de uma pasta (Windows)

- **Pelo Explorador de Arquivos:** abra a pasta, clique na barra de endereço, digite `cmd` e aperte Enter.
- **Pelo VS Code:** botão direito na pasta > *Open in Integrated Terminal*.
- **Pelo CMD:** `cd /d "caminho da pasta"` (o caminho entre aspas, por causa dos espaços).

### 1. Baixar o projeto (uma vez só)

```
git clone https://github.com/d1egosantos/Sistema_Vendas.git
```
Ou baixe o ZIP pelo GitHub (*Code* > *Download ZIP*) e extraia.

### 2. Banco de dados (uma vez só) — no pgAdmin

1. Conecte no servidor PostgreSQL.
2. Botão direito em **Databases** > **Create** > **Database...** > nome `sistemaVendas` > **Save**.
3. Clique no banco `sistemaVendas` > menu **Tools** > **Query Tool**.
4. Abra (ícone de pasta) e execute (**F5**) os arquivos da pasta `DATABASE/`, **nesta ordem**:
   1. `instalarBanco.sql` — cria as tabelas
   2. `triggers.sql` — regras automáticas do banco
   3. `dadosIniciais.sql` — usuário `admin` (deve aparecer `admin | 14` no final)

Os três podem ser rodados de novo sem erro (não duplicam nada).

### 3. Back — terminal na pasta `Back/`

1. Crie o arquivo de configuração do banco: copie `.env.example` e renomeie a cópia para `.env` (mantenha o `.env.example`). No `.env`, troque `DB_PASSWORD` pela senha do **seu** PostgreSQL.
   ```
   copy .env.example .env
   notepad .env
   ```
2. Instale e ligue:
   ```
   npm install
   npm start
   ```
3. Deu certo quando aparecer: `Conexão com o PostgreSQL estabelecida com sucesso.`
   **Deixe esse terminal aberto** — se fechar, o Back desliga.

O `.env` tem a sua senha e **não vai para o GitHub** (confira se `.env` está no `.gitignore`).

### 4. Front — outro terminal, na pasta do front (a que tem o `vite.config.js`)

```
npm install
npm run dev
```
Abra **http://localhost:5173** e entre com **admin** / **123**. Troque a senha em **Meu usuário**.

O front chama o Back pela rota `/api`, que o Vite redireciona para `http://localhost:3000` (configurado no `vite.config.js`). Por isso o Back precisa estar rodando na porta 3000.

### Problemas comuns

| Mensagem | Causa | Solução |
|---|---|---|
| `password authentication failed` (no terminal do Back) | Senha errada no `Back/.env` | Corrija `DB_PASSWORD` e rode `npm start` de novo |
| `database "sistemaVendas" does not exist` | Banco não criado | Passo 2 |
| `relation "..." does not exist` | Tabelas não criadas | Rode `instalarBanco.sql` (passo 2) |
| "Usuário ou senha inválidos" no login | `dadosIniciais.sql` não rodado | Passo 2, arquivo 3 |
| "Sem conexão com o servidor" no front | Back desligado | Volte ao terminal do Back e rode `npm start` |
| `EADDRINUSE` / porta em uso | Já tem um Back aberto | Feche o outro terminal (Ctrl + C) |
| `'npm' não é reconhecido` | Node.js não instalado | Passo 0 |

### Modo de teste (só o front, sem Back e sem banco)

Na pasta do front, crie o arquivo `.env.local` com a linha `VITE_USE_MOCK=true` e rode `npm run dev` de novo. O sistema usa dados de exemplo salvos no navegador. Apague o `.env.local` para voltar ao banco de verdade.

## Status do projeto

Projeto acadêmico em desenvolvimento, com Documento de Visão (2ª entrega) já validado, cobrindo requisitos, diagramas UML (casos de uso, classes, objetos, componentes, máquina de estados, atividades e sequência) e prototipagem de interface.

---

## Log de Alterações

Como este é o **único README do projeto** (fica só na raiz, não existe um por pasta), ele também funciona como um **canal de comunicação entre os integrantes** — e entre as IAs que cada um usa como apoio no código. Antes de perguntar "o que mudou no Back?" ou "alguém mexeu no banco?", basta consultar esta seção.

**Regra simples:** toda vez que você (ou sua IA) fizer uma alteração relevante em qualquer pasta (`Back/`, `Front/`, `DATABASE/`), adicione uma linha nova na tabela abaixo **antes de dar push/PR/atualizar a branch**, descrevendo:

- **Data** da alteração
- **Colaborador** responsável
- **Pasta/Área** afetada (`Back`, `Front`, `DATABASE`, `README`)
- **Arquivo(s)** alterado(s)
- **Tipo**: `Adição` (arquivo novo), `Alteração` (arquivo existente modificado) ou `Remoção` (arquivo/trecho removido)
- **Descrição** curta e objetiva do que foi feito

> Isso evita retrabalho, conflitos de merge e permite que qualquer IA que outro integrante esteja usando entenda rapidamente o contexto do que já foi feito, sem precisar vasculhar o histórico de commits.

### Formato do registro

```
| DD/MM/AAAA | Nome do colaborador | Pasta | arquivo.ext | Tipo | Descrição breve |
```

### Histórico

| Data | Colaborador | Pasta    | Arquivo              | Tipo      | Descrição                                |
|------|-------------|----------|----------------------|-----------|------------------------------------------|
| —    | Matheus     | Back     | Estrutura MVC geral  | Alteração | Reestruturação da MVC do back-end        |
| —    | Matheus     | DATABASE | Tabela usuários      | Adição    | Criação/ajuste da tabela de usuários     |
| —    | Matheus     | Front    | Sistema Vendas (MVC) | Alteração | Nova estrutura MVC aplicada ao front-end |
| —    | Matheus     | README   | `README.md`          | Alteração | Adição de comandos úteis                 |
| 01/10/2026 | Matheus | Front | `package.json`, `vite.config.js`, `.prettierrc`, `.env.example`, `index.html` | Alteração | Fase 0: Bootstrap, React-Bootstrap, Bootstrap Icons, React Router, Axios e Prettier; proxy `/api` → Back (porta 3000) |
| 01/10/2026 | Matheus | Front | `src/styles/theme.css`, `public/favicon.svg` | Adição | Tema com a paleta oficial (Cool Sky, Tropical Mint, Emerald) sobre o Bootstrap |
| 01/10/2026 | Matheus | Front | `src/` (routes, layouts, context, hooks, components, modules, mocks, utils, services) | Adição | Fase 1: layout com menu lateral, rotas de todas as telas (placeholder), login mock, permissão por tela (REQ002/003) e logout por inatividade (REQ030) |
| 01/10/2026 | Matheus | Front | `src/App.css`, `src/index.css`, `src/assets/*`, `public/icons.svg`, `README.md` do template | Remoção | Arquivos padrão do template Vite |
| 05/10/2026 | Matheus | Front | `src/modules/pedidos/*` | Adição/Alteração | Módulo de pedidos: novo pedido (cliente, itens, estoque, entrega), pendentes com contadores por status, todos os pedidos, detalhe com mudança de status, cancelamento, edição e impressão A4/etiqueta (REQ004, 005, 008, 009, 020, 038, 040) |
| 05/10/2026 | Matheus | Front | `src/modules/usuarios/*`, `src/modules/conta/MeuUsuarioPage.jsx` | Adição/Alteração | Gerenciamento de usuários com permissões por tela (usuarioTela) e tela "Meu usuário" com troca de senha (REQ001, 002) |
| 05/10/2026 | Matheus | Front | `src/services/*`, `src/mocks/*` | Adição | Services que chamam as rotas reais do Back + Back falso no navegador (modo de teste, `VITE_USE_MOCK`) com o mesmo formato de JSON |
| 05/10/2026 | Matheus | Front | `src/components/*`, `src/context/*`, `src/hooks/*`, `src/layouts/Sidebar.jsx`, `src/routes/*`, `src/utils/*` | Adição/Alteração | Modal de confirmação, selo de status, avisos (toasts), carregamento; link "Meu usuário" na sidebar; login pelo service |
| 05/10/2026 | Matheus | Back (pendente) | `index.js` + rotas novas | — | **O front precisa que o Back tenha:** `POST /login` (devolve o usuário com `UsuarioTelas`, sem a senha), `PUT /usuarios/:id/senha` (`{ senhaAtual, novaSenha }`) e o registro de `/usuario-tela` no `index.js` (o arquivo de rotas já existe). As chaves da coluna `tela` estão em `Front/Sistema Vendas/src/utils/constants.js` |
| 15/10/2026 | Matheus | Front | `src/index.css`, `src/components/*/`, `src/layouts/*/`, `src/modules/**/*.css` | Alteração | Organização do CSS por responsabilidade: `index.css` só com estilos globais e cada componente em pasta própria com o seu `.css` (ex.: `components/StatusBadge/StatusBadge.jsx` + `StatusBadge.css`). Removido `src/styles/theme.css`. Visual sem alteração |
| 15/10/2026 | Matheus | DATABASE | `triggers.sql` | Adição | Triggers do PostgreSQL: total do pedido = soma dos itens; valor unitário do item preenchido pelo preço atual; regras do pedido (status 1 a 6, cancelado é final, data de entrega ao finalizar, pedido não pode ser apagado); estoque nunca negativo e mín/máx coerentes; cliente é PF ou PJ, nunca os dois. Baixa de estoque continua no Back (para não descontar duas vezes). Rodar depois de criar as tabelas |
| 19/10/2026 | Matheus | DATABASE | `instalarBanco.sql`, `dadosIniciais.sql` | Adição | Script único que cria todas as tabelas na ordem certa (cópia dos arquivos `tabela*.sql`/`usuarios.sql` — se mudar uma tabela, mude lá e aqui) e script com o usuário `admin` (senha `123`, hash MD5) com acesso a todas as telas |
| 19/10/2026 | Matheus | Back | `index.js`, `controllers/authControllers.js`, `routes/authRoutes.js`, `controllers/usuariosControllers.js`, `routes/usuariosRoutes.js` | Adição/Alteração | Resolve o pendente de 05/10: `POST /login`, `PUT /usuarios/:id/senha` e registro de `/usuario-tela` no `index.js`. `POST`/`PUT /usuarios` não devolvem mais o hash da senha |
| 19/10/2026 | Matheus | Back | `config/database.js`, `.env.example`, `package.json` | Alteração | Conexão com o banco lida do `Back/.env` (padrão continua `postgres`/`nova_senha`); scripts `npm start` e `npm run dev` |
| 19/10/2026 | Matheus | Front | `src/services/api.js`, `.env.example` | Alteração | Front passa a usar o Back + PostgreSQL por padrão. O modo de teste (mock) só liga com `VITE_USE_MOCK=true` no `.env.local` |
| 19/10/2026 | Matheus | README | `README.md` | Alteração | Seção "Como rodar o sistema do zero": programas necessários, clone, banco, Back (`.env`), front, problemas comuns e modo de teste — com caminhos relativos (cada integrante tem o projeto em uma pasta diferente) |
| 20/10/2026 | Matheus | Front | `src/modules/pedidos/filtros.js`, `components/PrazoPedido/*`, `PedidosTabela`, `PedidoDetalhePage`, `PedidosPendentesPage`, `FiltroPedidos` | Adição/Alteração | SPV-115: alerta proporcional de prazo — selo "Vence em X dias / Vence amanhã / Vence hoje / Atrasado há X dias" com barra de % do prazo consumido (amarelo a partir de 75% ou na véspera, laranja no dia, vermelho atrasado); contador e filtro "Vencendo" nos pendentes |
| 20/10/2026 | Matheus | Front | `components/ImpressaoPedido/*` | Alteração | SPV-69: etiqueta passou de 100 x 70 mm para 100 x 100 mm, com lista dos itens (até 5) e observação no rodapé |
| 20/10/2026 | Matheus | Front | `src/modules/produtos/*`, `src/services/produtosService.js` | Adição | SPV-61/62/64: tela de Produtos — lista com busca e filtro (pronta entrega, sob encomenda, estoque em alerta), cadastro/edição com ou sem controle de estoque (saldo inicial, mínimo e máximo), selo "Abaixo do mínimo"/"Sem estoque" e exclusão com confirmação |
| 20/10/2026 | Matheus | Front | `src/modules/servicos/*`, `src/services/servicosService.js` | Adição | SPV-63: tela de Serviços — lista com busca, cadastro/edição (valor e duração estimada em minutos, mostrada como "1h 30min") e exclusão com confirmação |
| 20/10/2026 | Matheus | Front | `src/utils/validacoes.js`, `src/utils/formatters.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | Validações reaproveitáveis dos cadastros (valor > 0 com 2 casas, inteiros, nome repetido sem diferenciar acento/maiúscula — SPV-107); `formatarDuracao`; rotas de produtos, serviços e estoque no modo de teste |
| 20/10/2026 | Matheus | Back | `controllers/produtosControllers.js`, `controllers/servicosControllers.js` | Alteração | Exclusão de produto/serviço já usado em pedido agora devolve 409 com mensagem clara (antes dava erro do banco) |
| 21/10/2026 | Matheus | Front | `src/modules/pedidos/PedidosPorClientePage.jsx`, `components/ResumoCliente/*`, `SeletorCliente`, `PedidoNovoPage`, `PedidoDetalhePage`, `src/routes/rotas.js` | Adição/Alteração | SPV-59: tela "Pedidos por cliente" (menu Pedidos > Por cliente) — escolhe o cliente (inclusive inativo, só para consulta), mostra resumo (em aberto e valor, atrasados, total comprado, último pedido) e a lista dos pedidos dele; botão "Novo pedido para este cliente" abre o Novo pedido já com o cliente; link "Ver todos os pedidos deste cliente" no detalhe do pedido |
| 21/10/2026 | Matheus | Front | `src/utils/validacoes.js`, `src/utils/constants.js`, `ItensEditor`, `PedidoNovoPage`, `PedidoDetalhePage` | Alteração | SPV-107: data de entrega limitada a 1 ano (pega ano digitado errado), quantidade de item limitada a 9.999, cliente inativo não entra em pedido novo e aviso do navegador ao fechar/recarregar com pedido começado |
| 21/10/2026 | Matheus | DATABASE | `tabelaAnexosPedido.sql`, `tabelaApontamentosProducao.sql`, `instalarBanco.sql` | Adição/Alteração | Tabelas `anexos_pedido` (SPV-91) e `apontamentos_producao` (SPV-93/94/95, com trava de 1 apontamento aberto por operador/pedido). **Rode o `instalarBanco.sql` de novo** para criar as tabelas novas (as existentes não mudam) |
| 21/10/2026 | Matheus | Back | `models/anexosPedidoModels.js`, `controllers/anexosControllers.js`, `routes/anexosRoutes.js`, `package.json`, `.gitignore` | Adição | SPV-91: upload de fotos e arquivos (multer) — `POST/GET /pedidos/:id/anexos`, `GET /anexos/:id/arquivo`, `DELETE /anexos/:id`; aceita foto, PDF, Word, Excel e texto até 10 MB; arquivos ficam em `Back/uploads/` (fora do Git). **Rode `npm install` no Back** (pacote novo: multer) |
| 21/10/2026 | Matheus | Back | `models/apontamentosProducaoModels.js`, `controllers/apontamentosControllers.js`, `routes/apontamentosRoutes.js`, `controllers/pedidosControllers.js`, `routes/pedidosRoutes.js`, `index.js` | Adição/Alteração | SPV-93/94/95: apontamento de produção — iniciar (`POST /pedidos/:id/apontamentos`, passa o pedido para "Em produção"), concluir com quantidade (`PUT /apontamentos/:id/concluir`), cancelar início, listar; pedido não avança para conferência com apontamento aberto e o cancelamento encerra os abertos |
| 21/10/2026 | Matheus | Front | `src/modules/producao/*`, `src/services/producaoService.js`, `components/ProducaoPedido/*` | Adição | Tela Produção (M.E.S.): meus apontamentos com tempo correndo, concluir com quantidade/observação (e opção de enviar para conferência), outros operadores trabalhando e fila por data de entrega; card "Produção" no detalhe do pedido com tempo total e quantidade |
| 21/10/2026 | Matheus | Front | `components/AnexosPedido/*`, `src/services/anexosService.js`, `PedidoNovoPage`, `PedidoDetalhePage`, `src/mocks/*` | Adição/Alteração | Anexos no detalhe do pedido (miniatura de foto, baixar, remover) e já no Novo pedido; campo antigo de link virou "Link externo"; anexos e apontamentos também no modo de teste |
| 21/10/2026 | Matheus | DATABASE | `tabelaMovimentacoesEstoque.sql`, `tabelaConferenciasPedido.sql`, `instalarBanco.sql` | Adição/Alteração | Tabelas `movimentacoes_estoque` (histórico de todo movimento de saldo, com saldo antes/depois) e `conferencias_pedido` (aprovação/devolução com motivo obrigatório na devolução). **Rode o `instalarBanco.sql` de novo** |
| 21/10/2026 | Matheus | Back | `models/movimentacoesEstoqueModels.js`, `controllers/estoqueControllers.js`, `routes/estoqueRoutes.js`, `controllers/itensPedidoControllers.js`, `controllers/pedidosControllers.js` | Adição/Alteração | SPV-65/109: `POST /estoque/:id/ajuste` (saldo contado + motivo) e `GET /estoque/:id/movimentacoes`; entrada/saída aceitam motivo e usuário; vendas, devoluções, cancelamentos e saldo inicial passam a gravar no histórico (função única `MovimentacoesEstoque.movimentar`) |
| 21/10/2026 | Matheus | Back | `models/conferenciasPedidoModels.js`, `controllers/conferenciasControllers.js`, `routes/conferenciasRoutes.js`, `routes/pedidosRoutes.js`, `controllers/pedidosControllers.js` | Adição/Alteração | SPV-96: `POST/GET /pedidos/:id/conferencias` — aprovar (vai para Aguardando cliente) ou devolver (volta para Em produção, motivo obrigatório); aprovar/devolver só pela conferência (fica registrado) |
| 21/10/2026 | Matheus | Front | `src/modules/estoque/*`, `src/services/estoqueService.js`, `src/hooks/useAlertasEstoque.js`, `src/layouts/Sidebar/Sidebar.jsx` | Adição/Alteração | SPV-65/108/109: tela Estoque (resumo, ocupação, entrada, saída, ajuste pelo inventário, histórico); aviso de estoque mínimo no topo da tela e número no menu lateral |
| 21/10/2026 | Matheus | Front | `src/modules/conferencia/*`, `src/services/conferenciaService.js`, `components/HistoricoConferencias/*`, `PedidoDetalhePage`, `ProducaoPage` | Adição/Alteração | SPV-96: tela Conferência (fila com histórico de devoluções), janela de aprovar/devolver com motivo (também no detalhe do pedido), card "Conferência" no detalhe e motivo da devolução na fila da Produção |
| 21/10/2026 | Matheus | Front | `package.json`, `src/utils/exportarExcel.js`, `src/components/BotaoExportar/*` | Adição | Biblioteca `write-excel-file` (rodar `npm install` no front) e exportador Excel reaproveitável: cada tela só descreve as colunas (texto, número, moeda, data, data e hora) |
| 21/10/2026 | Matheus | Front | `src/modules/pedidos/exportarPedidos.js`, `PedidosListaPage`, `PedidosPendentesPage`, `PedidosPorClientePage` | Adição/Alteração | SPV-104: botão "Exportar Excel" nas listas de pedidos — exporta exatamente o que está filtrado na tela (nº, cliente, CPF/CNPJ, vendedor, datas, status, prazo, total) |
| 21/10/2026 | Matheus | Front | `src/modules/pedidos/PedidosEntregasPage.jsx/.css`, `src/routes/rotas.js` | Adição | SPV-116: tela "Próximas entregas" (menu Pedidos) — pedidos em aberto dos próximos 30 dias agrupados por dia, atrasados no topo, resumo (atrasados, 7 dias, 30 dias, prontos p/ retirada) e exportação |
| 21/10/2026 | Matheus | Back | `controllers/apontamentosControllers.js` | Alteração | SPV-103: `GET /apontamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD` filtra pelo dia de início (valida formato e período) |
| 21/10/2026 | Matheus | Front | `src/modules/producao/ExportarProducaoModal.jsx`, `exportarProducao.js`, `ProducaoPage.jsx`, `src/services/producaoService.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | SPV-103: "Exportar Excel" na Produção (só para quem também acessa Pedidos) — escolhe o período e baixa a planilha com os apontamentos e a aba "Resumo por operador" (tempo, quantidade, média) |
| 21/10/2026 | Matheus | DATABASE | `tabelaClientes.sql`, `instalarBanco.sql` | Alteração | SPV-119: colunas `observacao` e `fator_confianca` (1 a 5, padrão 3) em `clientes`; e-mail passa a ser opcional. Inclui `ALTER TABLE` para banco já criado — basta rodar o `instalarBanco.sql` de novo |
| 21/10/2026 | Matheus | Back | `controllers/clientesControllers.js`, `models/clientesModels.js`, `utils/documentos.js` | Alteração/Adição | Cadastro de cliente PF/PJ numa chamada só (`POST/PUT /clientes` com `tipo` e `documento`, em transação): valida CPF/CNPJ pelos dígitos, telefone, e-mail, contato obrigatório, CPF/CNPJ repetido (409); troca PF↔PJ; excluir só cliente sem pedidos (409 sugere inativar). Rotas `/clientes-cpf` e `/clientes-cnpj` continuam funcionando |
| 21/10/2026 | Matheus | Front | `src/modules/clientes/*`, `src/services/clientesService.js`, `src/utils/validacoes.js`, `src/utils/formatters.js`, `src/mocks/*` | Adição/Alteração | Tela Clientes (saiu do "em construção"): lista com busca (nome, CPF/CNPJ, telefone, e-mail), filtros PF/PJ, ativos/inativos e confiança baixa, cadastro/edição com máscara e validação de CPF/CNPJ e telefone, inativar/reativar, excluir e resumo de pedidos por cliente |
| 21/10/2026 | Matheus | Front | `components/ConfiancaCliente/*`, `components/AvisoCliente/*`, `PedidoNovoPage`, `PedidosPorClientePage`, `SeletorCliente` | Adição/Alteração | SPV-119: fator de confiança em estrelas e observação do cliente; aviso amarelo ao abrir pedido para cliente com confiança 1–2 (e azul quando só há observação); "⚠ confiança baixa" na lista de escolha do cliente |
| 21/10/2026 | Matheus | Front | `src/modules/clientes/exportarClientes.js`, `resumoClientes.js` | Adição | SPV-105: "Exportar Excel" na tela Clientes — cadastro completo + confiança, observação, nº de pedidos, valor em aberto, total comprado e data do último pedido (respeita os filtros da tela) |
| 21/10/2026 | Matheus | Back | `config/database.js` | Alteração | Correção de fuso horário: colunas TIMESTAMP (gravadas em UTC pelo Sequelize) eram lidas como horário de Brasília e as horas apareciam 3h adiantadas (ex.: início/fim dos apontamentos de produção). Agora são lidas como UTC e a tela mostra a hora certa |
| 22/10/2026 | Matheus | DATABASE | `tabelaContasPagar.sql`, `tabelaContasReceber.sql`, `instalarBanco.sql` | Alteração | SPV-85/86: colunas novas (com `ALTER TABLE`, roda de novo sem perder dados). contasPagar: `fornecedor`, `dataVencimento`, `formaPagamento` (`item` ganhou padrão 1). contasReceber: `idCliente`, `descricao`, `dataRecebimento`, `formaPagamento`, `dataCriacao` |
| 22/10/2026 | Matheus | DATABASE | `triggers.sql` | Adição | Trigger 6 `trg_pedidos_conta_receber`: cada pedido em andamento tem UMA conta a receber em aberto = total do pedido − já recebido, vencendo na data de entrega; atualiza sozinha ao mudar itens/data/status e sai quando o pedido é cancelado ou quitado. Cria as contas dos pedidos que já existiam (status 1 a 4) |
| 22/10/2026 | Matheus | Back | `models/contasPagarModels.js`, `controllers/contasPagarControllers.js`, `routes/contasPagarRoutes.js`, `utils/financeiro.js` | Alteração/Adição | SPV-86: `POST /contas-pagar`, `PUT /:id`, `POST /:id/pagar`, `POST /:id/estornar`, `DELETE /:id` com validação (descrição, categoria, valor, vencimento, forma de pagamento; conta paga não edita nem exclui). |
| 22/10/2026 | Matheus | Back | `models/contasReceberModels.js`, `controllers/contasReceberControllers.js`, `routes/contasReceberRoutes.js` | Alteração/Adição | SPV-85: `GET` traz cliente e pedido; `POST /contas-receber` (avulsa), `PUT /:id`, `POST /:id/receber` (aceita recebimento parcial, ex.: sinal), `POST /:id/estornar`, `DELETE /:id`. Conta de pedido não se edita/exclui à mão. |
| 22/10/2026 | Matheus | Front | `src/modules/financeiro/*`, `src/services/financeiroService.js`, `src/routes/rotas.js` | Adição/Alteração | SPV-82 tela "Visão geral" do financeiro; SPV-86 tela Contas a pagar; SPV-85 tela Contas a receber; SPV-99/100 previsão a pagar/receber dos próximos 15 dias, dia a dia, com saldo previsto |
| 22/10/2026 | Matheus | Front | `layouts/Sidebar/Sidebar.jsx`, `hooks/useContadorMenu.js`, `hooks/useAlertasContasPagar.js`, `hooks/useAlertasEstoque.js`, `context/AuthProvider.jsx`, `src/mocks/*` | Alteração/Adição | SPV-98: número vermelho em "Contas a pagar" (e no grupo Financeiro fechado) com as contas vencidas ou vencendo em até 3 dias + alerta no topo das telas. Permissão de rota pode ser uma lista de telas (libera com qualquer uma). Mock com as mesmas regras |
| 22/10/2026 | Matheus | Back | `controllers/contasPagarControllers.js`, `controllers/contasReceberControllers.js`, `models/contas*`, `routes/contas*` | Remoção | Rotas antigas de contas que gravavam sem validação (`/contas-pagar/criar`, `/editar`, `/cancelar`, `/excluir`; `/contas-receber/pago`, `/cancela`, `/adiantar`) removidas: ficam só as rotas novas (REST) usadas pelas telas |
| 22/10/2026 | Matheus | DATABASE | `tabelaFechamentosCaixa.sql`, `instalarBanco.sql` (seção 18) | Adição | SPV-84/97: caixa aceita boleto/transferência e guarda de qual conta veio o lançamento (`id_conta_receber`, `id_conta_pagar`); tabela `fechamentos_caixa` (um por dia: totais por forma, dinheiro esperado, contado, diferença — diferença exige observação) |
| 22/10/2026 | Matheus | Back | `controllers/caixaControllers.js`, `routes/caixaRoutes.js`, `models/caixaModels.js`, `models/fechamentosCaixaModels.js`, `utils/caixa.js` | Alteração/Adição | SPV-84/97: `GET /caixa?data=` (lançamentos + totais por forma + fechamento), `/caixa/periodo`, `/caixa/fechamentos`, `POST /caixa` (lançamento manual), `POST /caixa/fechar`, `DELETE /caixa/:id`. Recebimento/pagamento de conta entra sozinho no caixa (e sai ao desfazer); dia fechado não aceita lançamento; saída em dinheiro só até o que há na gaveta |
| 22/10/2026 | Matheus | DATABASE/Back | `tabelaPedidos.sql`, `instalarBanco.sql`, `utils/inadimplencia.js`, `controllers/pedidosControllers.js`, `models/pedidosModels.js`, `controllers/clientesControllers.js`, `routes/clientesRoutes.js` | Alteração/Adição | SPV-118: `GET /clientes/inadimplentes`; `POST /pedidos` responde 409 para cliente com conta vencida (avulsa ou de pedido entregue), a não ser com `liberacao: { idUsuario, motivo }` de quem tem a tela "contas-receber". Colunas `id_liberado_por` e `motivo_liberacao` em `pedidos` |
| 22/10/2026 | Matheus | Front | `src/modules/financeiro/CaixaPage.jsx`, `caixa/*`, `src/services/caixaService.js` | Adição | SPV-84/97: tela Fechamento de caixa — entradas do dia por forma (dinheiro, PIX, cartão), lançamentos com origem, dinheiro esperado na gaveta, lançamento manual, fechamento com conferência do dinheiro e histórico de fechamentos |
| 22/10/2026 | Matheus | Front | `PedidoNovoPage.jsx`, `components/BloqueioInadimplente/*`, `SeletorCliente.jsx`, `PedidoDetalhePage.jsx`, `services/clientesService.js`, `services/pedidosService.js` | Adição/Alteração | SPV-118: aviso de bloqueio no novo pedido com as contas vencidas; quem tem acesso a Contas a receber pode liberar com motivo; "⛔ pagamento vencido" na escolha do cliente; detalhe do pedido mostra quem liberou e por quê |
| 22/10/2026 | Matheus | Front | `src/modules/financeiro/PendenciasPage.jsx` | Adição | SPV-58: tela Pendências por cliente (REQ016) — valor vencido, a receber, pedidos prontos não retirados e em andamento de cada cliente, com filtros e exportação |
| 22/10/2026 | Matheus | Front | `src/modules/financeiro/exportarFinanceiro.js`, `ContasPagarPage.jsx`, `ContasReceberPage.jsx`, `components/BaixaContaModal.jsx`, `services/financeiroService.js`, `src/mocks/*` | Adição/Alteração | SPV-102: Excel de contas a pagar, contas a receber, caixa do dia (lançamentos + resumo por forma) e histórico de fechamentos. Pagar/receber enviam quem fez (vai para o caixa). Mock com as mesmas regras |
| 22/10/2026 | Matheus | DATABASE | `viewPendenciasClientes.sql`, `instalarBanco.sql` (seção 19) | Adição | Dinâmica 01 / SPV-58: VIEW `vw_pendencias_clientes` — uma linha por cliente com pendência (valor vencido, contas vencidas, a receber, pedidos prontos não retirados e seus números, em andamento, inadimplente), calculada pelo banco a partir de clientes, pedidos e contasReceber |
| 22/10/2026 | Matheus | Back | `models/pendenciasClientesModels.js`, `controllers/pendenciasControllers.js`, `routes/pendenciasRoutes.js`, `index.js` | Adição | Model Sequelize só de leitura apontando para a VIEW e rota `GET /pendencias?filtro=devendo|receber|retirada` |
| 22/10/2026 | Matheus | Front | `src/services/pendenciasService.js`, `src/modules/financeiro/PendenciasPage.jsx`, `src/mocks/fakeBackend.js` | Alteração/Adição | Tela "Pendências por cliente" passa a consumir só `GET /pendencias` (dados da VIEW) em vez de juntar 4 listas no Front; rodapé indica a origem dos dados. Mock com o mesmo resultado |
| 26/10/2026 | Matheus | Back | `controllers/dashboardControllers.js`, `routes/dashboardRoutes.js`, `index.js` | Adição | SPV-101: `GET /dashboard?mes=AAAA-MM` — faturamento do mês (pedidos sem cancelados), pedidos, ticket médio, variação vs. mês anterior, caixa do mês (entradas/saídas), faturamento por mês (6 meses) e por dia, clientes que mais compraram, pedidos em andamento/atrasados e produtividade por operador |
| 26/10/2026 | Matheus | Front | `src/modules/dashboard/*` (DashboardPage, components/GraficoBarras, components/PainelPowerBI, exportarDashboard, Dashboard.css), `src/services/dashboardService.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | SPV-101 + SPV-79: Dashboard com 2 abas — "Visão geral" (cartões, gráficos e Excel, dados do banco) e "Power BI" (painel publicado do grupo em iframe, proporção 1024x1060; link em `VITE_POWERBI_URL` ou padrão no service) |
| 26/10/2026 | Matheus | Back | `controllers/caixaControllers.js`, `routes/caixaRoutes.js`, `models/caixaModels.js` | Adição/Alteração | SPV-81: `GET /caixa/fluxo?de=&ate=` — saldo anterior, entradas/saídas dia a dia com saldo acumulado, por forma de pagamento, por origem e saídas por categoria (liga caixa → conta a pagar) |
| 26/10/2026 | Matheus | Front | `src/modules/financeiro/FluxoCaixaPage.jsx`, `exportarFinanceiro.js`, `Financeiro.css`, `src/services/caixaService.js`, `src/routes/rotas.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | SPV-81: tela Financeiro → Fluxo de caixa (atalhos de período, cartões, tabela dia a dia, divisões por forma/origem/categoria, lançamentos), Excel e Imprimir/PDF |
| 26/10/2026 | Matheus | DATABASE | `descontosMultas.sql` (novo), `instalarBanco.sql` (seção 20), `triggers.sql` (trigger 1 alterada, trigger 6 com mais colunas, trigger 7 nova) | Adição/Alteração | SPV-73: pedidos ganham `subtotal`, `desconto_tipo`, `desconto_informado`, `valor_desconto`, `motivo_desconto`, `id_desconto_por` (total = subtotal − desconto, calculado pela trigger `trg_pedidos_desconto`); contasReceber ganha `valorMulta`, `valorJuros`, `diasAtraso`. **Rodar descontosMultas.sql e depois triggers.sql** |
| 26/10/2026 | Matheus | Back | `utils/descontos.js`, `utils/encargos.js` (novos), `controllers/pedidosControllers.js`, `routes/pedidosRoutes.js`, `controllers/itensPedidoControllers.js`, `models/pedidosModels.js`, `controllers/contasReceberControllers.js`, `routes/contasReceberRoutes.js`, `models/contasReceberModels.js` | Adição/Alteração | SPV-73: `PUT /pedidos/:id/desconto` (R$ ou %, motivo, quem deu; não fica abaixo do já pago; finalizado/cancelado não muda). Recebimento de conta vencida (avulsa ou de pedido entregue) cobra multa 2% + juros 1% a.m. proporcional; `cobrarEncargos:false` dispensa; parcial divide entre principal e encargos; `GET /contas-receber/:id/encargos` mostra a prévia |
| 26/10/2026 | Matheus | Front | `src/modules/pedidos/components/DescontoPedido/DescontoPedido.jsx` (novo), `PedidoDetalhePage.jsx`, `ItensEditor.jsx`, `ImpressaoPedido.jsx`, `src/services/pedidosService.js`, `src/modules/financeiro/components/BaixaContaModal.jsx`, `ContasReceberPage.jsx`, `src/services/financeiroService.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | SPV-73: desconto no detalhe do pedido (janela com prévia, motivos rápidos, tirar desconto) e na impressão; recebimento mostra multa/juros com opção de dispensar; lista de contas a receber mostra o valor atualizado das vencidas |
| 26/10/2026 | Matheus | DATABASE | `tabelaLogs.sql` (novo), `instalarBanco.sql` (seção 21) | Adição | SPV-111 / REQ028: tabela `logs` (data/hora, usuário, módulo, ação, descrição, entidade, IP, detalhes) |
| 26/10/2026 | Matheus | Back | `utils/logs.js`, `models/logsModels.js`, `controllers/logsControllers.js`, `routes/logsRoutes.js` (novos), `index.js`, `controllers/authControllers.js`, `routes/authRoutes.js` | Adição/Alteração | SPV-111: middleware `auditoria` grava as operações que alteram dados (pedidos, status/produção, conferência, descontos, contas, caixa, estoque, cadastros) só quando dão certo; login certo/errado/bloqueado e `POST /login/sair` (manual ou inatividade); `GET /logs` com filtros (período, módulo, usuário, busca, entidade) |
| 26/10/2026 | Matheus | Front | `src/modules/logs/LogsPage.jsx`, `Logs.css`, `src/services/logsService.js` (novos), `src/services/api.js`, `src/services/authService.js`, `src/context/AuthProvider.jsx`, `src/routes/rotas.js`, `src/mocks/fakeBackend.js` | Adição/Alteração | SPV-111: tela Cadastros → Logs do sistema (mesma permissão de Usuários) com filtros, destaque de tentativas negadas e Excel; toda requisição manda o cabeçalho `X-Usuario-Id` de quem está logado; saída registrada |
| 26/10/2026 | Matheus | Front | `index.html`, `src/main.jsx` | Alteração | Tela de carregamento (splash) ao abrir o sistema: logo do SPV com círculo girando, nome e "Carregando…", no fundo da cor do sistema (sem tela branca). Fica no HTML (aparece antes do React) e o `main.jsx` tira com fade depois que o sistema monta (mínimo ~0,7 s) |
| 26/10/2026 | Matheus | Front | `src/modules/retirada/RetiradaPage.jsx`, `RetiradaPage.css` | Alteração/Adição | REQ012: tela "Aguardando cliente" (saiu do "em construção") — pedidos prontos para retirada com nº, cliente/telefone, pronto desde (data da conferência aprovada) e há quantos dias, retirada prevista, valor e quanto falta receber; cartões-filtro (parados 7+ dias, previsto até hoje, a receber), busca, ordenação, aviso pelo WhatsApp, "Registrar entrega" (finaliza o pedido e avisa se ainda há saldo) e Excel |
| 26/10/2026 | Matheus | Front | `src/modules/pedidos/filtros.js`, `components/FiltroPedidos/FiltroPedidos.jsx`, `PedidosPendentesPage.jsx`, `PedidosListaPage.jsx` | Alteração | SPV-68: seletor "Ordenar" nas listas de pedidos — ordem de entrega (padrão em Pendentes), mais recentes (padrão em Todos), mais antigos e maior valor |
| 26/10/2026 | Matheus | README | `README.md` | Remoção (Jira) | Cards excluídos do Jira por duplicidade, com aval do orientador: SPV-54, SPV-56, SPV-57 e SPV-168 (já entregues pela tela/módulo de Clientes + SPV-119, SPV-105, SPV-59, SPV-118), SPV-68 (SPV-116 + ordenação por entrega), SPV-71 e SPV-92 (tela de detalhe/edição do pedido + SPV-107, SPV-73, SPV-91, SPV-96, SPV-115, SPV-69) |
| 26/10/2026 | Matheus | README / Back / Front | `README.md`, `Back/models/pedidosModels.js`, `src/utils/formatters.js` | Remoção | Retirados do projeto os ex-integrantes que saíram ou foram removidos do grupo (tabela da equipe e comentários no código). As tabelas que eram deles (Clientes, Pedidos, ItensPedido, Caixa) passaram para o Matheus |
| 29/10/2026 | Matheus | Back | `controllers/anexosControllers.js` | Alteração | Anexos: além do tipo informado pelo navegador, o Back confere o conteúdo do arquivo (assinatura dos primeiros bytes). Programa (.exe/.dll/ELF) renomeado para .pdf/.jpg, ou texto renomeado para foto, é recusado e apagado; continua o limite de 10 MB e 10 arquivos por envio |
| 03/11/2026 | Matheus | Front | `index.html`, `src/main.jsx`, `src/index.css`, `src/utils/temaImpressao.js` (novo), `src/layouts/*` (AppLayout, Sidebar, Topbar), `src/modules/auth/LoginPage.*`, `src/components/PageHeader/*` (+ `PageHeader.css` novo), `src/components/Logo/Logo.jsx`, CSS de módulos (dashboard, financeiro, estoque, clientes, logs, retirada, pedidos/PrazoPedido, SituacaoConta) e cores fixas em páginas JSX, `package.json` | Alteração/Adição | Visual v2 (tema escuro e moderno): modo escuro do Bootstrap 5.3 (`data-bs-theme="dark"`) com a paleta do SPV em variáveis `--spv-*`; fontes Plus Jakarta Sans e JetBrains Mono (`@fontsource`, funcionam offline); botões em degradê Sky→Mint; menu lateral flutuante que recolhe só para ícones (preferência salva no navegador); usuário/Sair foram para um menu na barra superior; login em tela dividida; cartões de indicador com linha e brilho na cor do indicador; abas em pílula. Impressão continua em tema claro (troca automática no `beforeprint`/`afterprint`). Nenhuma regra de negócio, rota ou chamada à API foi alterada |

> Preencha as datas exatas conforme o histórico de commits do GitHub e continue adicionando novas linhas conforme o projeto avançar. Cada colaborador é responsável por registrar **suas próprias** alterações.

---

**SPV** — *Simplicidade que entrega resultado real: sem complicação, sem excesso, sem custo proibitivo.*
