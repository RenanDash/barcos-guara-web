# Táxi Náutico

Site de apresentação e agendamento de viagens náuticas, com rotas dinâmicas
por cliente. A aplicação usa uma API Node.js e o banco MySQL `taxi_nautico`
para persistir clientes, empresas, embarcações, horários, reservas e gastos.

## Configuração local do MySQL

O MySQL deve estar ativo localmente (a conexão padrão é `127.0.0.1:3306`).
No PowerShell, copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

Edite `.env` e configure:

- `DB_ADMIN_USER` e `DB_ADMIN_PASSWORD`: uma conta MySQL com permissão para
  criar banco e usuário (por exemplo, a conta administrativa usada no HeidiSQL).
- `DB_USER` e `DB_PASSWORD`: a conta restrita usada pela API. `db:setup`
  cria essa conta, limitada a leitura e gravação no banco `taxi_nautico`.
- `MANAGER_PASSWORD_CLIENTE1`, `MANAGER_PASSWORD_CLIENTE2` e
  `MANAGER_PASSWORD_CLIENTE3`: senha individual de gerenciamento, com pelo
  menos 12 caracteres, para cada cliente.

Não compartilhe nem versione o arquivo `.env`.

No terminal do projeto, rode uma vez:

```sh
npm run db:setup
npm run db:seed
```

`db:setup` cria o banco, as tabelas e a conta restrita da aplicação. `db:seed` importa clientes e empresas de
`src/data/clients.json` e `src/data/companies.json`, além dos horários iniciais.
Ele não substitui horários já existentes.

Inicie a API e o Vite em terminais separados:

```sh
npm run api
npm run dev
```

Abra `http://localhost:5173`. O login usa o slug do cliente como usuário e a
senha individual configurada no `.env`. A API escuta apenas em loopback e o
Vite encaminha `/api` para ela.

Ao entrar no gerenciamento pela primeira vez em um navegador, os dados antigos
desse cliente no `localStorage` são importados para o MySQL. Os dados não são
removidos do navegador durante a importação.

## Dados de demonstração

Os indicadores e gráficos em `src/data/demoReports.json` são demonstrativos.
Reservas, barcos, horários e gastos são persistidos no MySQL, mas ainda não há
processamento real de pagamento por Pix. O endpoint de reservas é público para
permitir o agendamento e valida a viagem antes de gravá-la.

## Cadastro das empresas

Os registros de `src/data/companies.json` relacionam-se a `clients` pelo slug.
Campos desconhecidos permanecem como `null`; datas seguem o formato ISO
`AAAA-MM-DD`. Receita, despesas acumuladas, lucro, viagens concluídas e última
viagem devem ser calculados a partir dos dados operacionais, não preenchidos
manualmente nem inferidos dos relatórios demonstrativos.
