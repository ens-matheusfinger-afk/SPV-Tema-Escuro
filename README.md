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

| Colaborador                  | Área de atuação      |Tabelas atríbuidas                                  |
|------------------------------|----------------------|----------------------------------------------------|
| Diego José dos Santos        | Desenvolvimento / TI |Product Ower                                        |
| Matheus Dalanhol Finger      | Desenvolvimento / TI |Produtos, Estoque, Serviços                         |
| Felipe Joel                  | Desenvolvimento / TI |Clientes (PJ e CPF - Esquema de tabela pai e filho) |
| Maria Paula Medeiros da Rosa | Desenvolvimento / TI |Pedidos, caixa                                      |
| Mariana Weiwanko da Silva    | Desenvolvimento / TI |ItensPedido                                         |
| Carlos Eduardo Borges        | Desenvolvimento / TI |contasPagar, contasReceber, movimentacoes           |

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

> Preencha as datas exatas conforme o histórico de commits do GitHub e continue adicionando novas linhas conforme o projeto avançar. Cada colaborador é responsável por registrar **suas próprias** alterações.

---

**SPV** — *Simplicidade que entrega resultado real: sem complicação, sem excesso, sem custo proibitivo.*
