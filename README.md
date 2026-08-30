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

> Preencha as datas exatas conforme o histórico de commits do GitHub e continue adicionando novas linhas conforme o projeto avançar. Cada colaborador é responsável por registrar **suas próprias** alterações.

---

**SPV** — *Simplicidade que entrega resultado real: sem complicação, sem excesso, sem custo proibitivo.*
