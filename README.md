# Trilha — Habit Tracker

Site de controle de hábitos diários. Projeto individual com Node.js/Express no back-end, SQL Server no banco de dados e HTML/CSS/JS puro no front-end.

## Estrutura

```
habit-tracker/
├── server.js          → ponto de entrada do servidor Express
├── db.js              → configuração de conexão com o SQL Server
├── middleware/
│   └── auth.js         → valida o token JWT nas rotas protegidas
├── routes/
│   ├── auth.js          → cadastro, login e dados do usuário logado
│   ├── habitos.js       → CRUD de hábitos (BD2) + paginação/filtros (DBE2) + estatísticas
│   └── registros.js     → CRUD de registros diários + paginação/filtros
├── sql/
│   └── schema.sql      → script de criação do banco, tabelas e usuário de teste
├── public/
│   ├── login.html       → tela de login
│   ├── cadastro.html    → tela de criação de conta
│   ├── index.html       → dashboard de hábitos (protegido por login)
│   ├── perfil.html       → perfil do usuário com estatísticas de frequência
│   ├── api.js            → helper de autenticação e chamadas à API (token JWT)
│   ├── app.js            → lógica do dashboard de hábitos
│   ├── perfil.js          → lógica da página de perfil
│   └── style.css
├── package.json
└── .env.example
```

## Como funciona o login

- Senhas nunca são salvas em texto puro: usamos `bcryptjs` para gerar um hash antes de gravar no banco.
- No login bem-sucedido, o servidor gera um **token JWT** (válido por 7 dias) e devolve para o front-end.
- O front-end guarda o token no `localStorage` e envia em todas as chamadas como `Authorization: Bearer <token>`.
- Todas as rotas de hábitos e registros passam pelo middleware `autenticar`, que valida o token e injeta `req.usuarioId` — assim cada usuário só vê e edita os próprios hábitos.

## Como rodar

### 1. Banco de dados

Abra o SQL Server Management Studio (ou `sqlcmd`) e execute o script:

```
sql/schema.sql
```

Isso cria o banco `HabitTrackerDB`, as tabelas `Habito` e `RegistroHabito`, e já insere alguns hábitos de exemplo.

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e ajuste com seus dados de conexão:

```bash
cp .env.example .env
```

Edite o `.env`:

```
DB_USER=sa
DB_PASSWORD=SuaSenhaForte123
DB_SERVER=localhost
DB_DATABASE=HabitTrackerDB
DB_PORT=1433
DB_ENCRYPT=false
PORT=3000
JWT_SECRET=troque-essa-chave-por-algo-aleatorio-e-secreto
```

> Troque o `JWT_SECRET` por uma string aleatória só sua — é o que garante que ninguém forje um token de login.

> Se você habilitou autenticação SQL no seu SQL Server local (modo mixed), use o usuário `sa` e a senha definida na instalação. Se estiver usando Azure SQL, mude `DB_ENCRYPT` para `true`.

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar o servidor

```bash
npm start
```

Acesse no navegador: **http://localhost:3000**

Para desenvolvimento com reinício automático (precisa do `nodemon`, já incluso em devDependencies):

```bash
npm run dev
```

## Como cada entregável é atendido

| Entregável | Onde está |
|---|---|
| **DBE2** — paginação, filtros e ordenação | `GET /api/habitos` e `GET /api/registros` usam `OFFSET/FETCH`, filtros por categoria/data e ordenação dinâmica (com whitelist de colunas) |
| **BD2** — inclusão, alteração, exclusão | `POST`, `PUT`, `DELETE` em `/api/habitos` e `/api/registros`. O registro diário usa `MERGE` (upsert) no SQL Server |
| **GAS1** — Scrum | Organize um board (Trello/GitHub Projects) com colunas To Do / In Progress / Done. Sugestão de sprints: Sprint 1 = modelagem + autenticação; Sprint 2 = CRUD de hábitos + paginação/filtros; Sprint 3 = registros + perfil/estatísticas; Sprint 4 = ajustes finais. Use branches por funcionalidade (`feature/autenticacao`, `feature/perfil`) e Pull Requests para a branch principal |
| **QSS** — SonarQube | Suba o projeto num repositório público no GitHub e conecte ao [SonarCloud](https://sonarcloud.io) (gratuito). Rode a análise, corrija os principais code smells e vulnerabilidades apontados (atenção especial a segredos como `JWT_SECRET` não devem ir pro repositório — use só o `.env.example`), e tire um print do relatório final |

## Login de teste

O `schema.sql` já cria um usuário de exemplo:
- Email: `teste@trilha.com`
- Senha: `123456`

## Testando a API rapidamente

```bash
# Criar conta
curl -X POST http://localhost:3000/api/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Silva","email":"maria@email.com","senha":"123456"}'

# Login (copie o "token" da resposta)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@email.com","senha":"123456"}'

# Listar hábitos (substitua SEU_TOKEN)
curl "http://localhost:3000/api/habitos?page=1&pageSize=5" \
  -H "Authorization: Bearer SEU_TOKEN"

# Ver estatísticas de frequência (usado na página de perfil)
curl "http://localhost:3000/api/habitos/resumo/estatisticas" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Próximos passos sugeridos antes da apresentação

1. Subir o código no GitHub (com README e histórico de commits/branches visível)
2. Rodar a análise no SonarCloud e corrigir os principais pontos
3. Montar o board do Scrum com as sprints já "concluídas"
4. Preparar slides curtos: tema, modelagem do banco, demonstração em tela, board do Scrum, relatório do SonarCloud
5. Testar a apresentação end-to-end (banco + servidor + navegador) antes do dia da apresentação
