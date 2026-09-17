# ClinicApp

Aplicação clínica em desenvolvimento, com frontend React, API NestJS e worker separado. Estado verificável e limitações em [docs/ENTREGA.md](docs/ENTREGA.md).

## Executar localmente

Requisitos: Node 24 LTS, npm 11, Docker/Compose com o daemon iniciado. Não use dados reais.

```sh
npm ci --ignore-scripts
cp -n .env.example .env
npm run dev
```

`npm run dev` inicia a infraestrutura com `docker compose up -d --wait`, gera o cliente Prisma, aplica migrations e executa o seed fictício antes de iniciar API, worker e frontend. Uma falha na preparação interrompe a inicialização. O seed preserva usuários existentes e suas senhas.

Frontend: http://localhost:5173 · API: http://127.0.0.1:3000/api/v1 · OpenAPI: /api/v1/docs · readiness: /api/v1/health/ready.

Contas demonstrativas: `admin@example.test`, `terapeuta@example.test`, `recepcao@example.test` e `paciente@example.test`. Senha inicial: `ClinicApp!2026`.

Use Ctrl+C para encerrar a aplicação. A infraestrutura permanece disponível; para pará-la sem apagar dados, execute `docker compose stop`.

```sh
npm run db:test:prepare
npm test
npm run test:coverage
npm run lint -w @clinic/backend
```

Testes usam banco clinicapp_test separado. PostgreSQL 55432; MinIO 59000 (console 59001); Mailpit 58025 (SMTP 51025); ClamAV 53310. Consulte `docker compose ps` e `docker compose logs SERVICO`. Nenhum serviço externo foi contratado ou publicado.

Para verificar a ordem da preparação e a interrupção em caso de falha sem iniciar serviços: `node --test scripts/dev.test.mjs`.

## Antes de dados reais

Resolver pendências de produto/jurídicas, dependências vulneráveis da auditoria inicial, anexos privados e antimalware, gestão dedicada de chaves, HTTPS, observabilidade, backups/PITR e testes de restauração para RPO ≤ 1h/RTO ≤ 4h. Chaves e credenciais de .env.example são exclusivamente demonstrativas. Não existe validação operacional, de usabilidade com pessoas ou conformidade integral.

## Organização e tipografia

`backend/` contém API, worker, Prisma e testes de domínio; `frontend/` contém React/Vite/Capacitor; `scripts/` mantém a execução integrada; `tests/e2e/` contém Playwright. A organização na raiz acompanha o repositório original, cujo histórico foi preservado.

New Zen é a fonte padrão, servida localmente nos pesos usados pela interface. A licença incluída nos arquivos fornecidos é demo para uso pessoal; consulte `frontend/src/assets/fonts/LICENSE.txt`.
