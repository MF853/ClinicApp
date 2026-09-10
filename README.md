# ClinicApp

Aplicação clínica em desenvolvimento, com API NestJS e regras transacionais testadas. O frontend e os processos assíncronos ainda não estão disponíveis neste primeiro marco. Estado verificável e limitações em [docs/ENTREGA.md](docs/ENTREGA.md).

## Preparar o backend local

Requisitos: Node 24 LTS, npm 11, Docker/Compose. Não use dados reais.

```sh
npm ci --ignore-scripts
cp .env.example .env
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run build -w @clinic/backend
npm run start -w @clinic/backend
```

API: http://127.0.0.1:3000/api/v1 · OpenAPI: /api/v1/docs · readiness: /api/v1/health/ready. O login exigirá cadastro/seed, ainda em implementação.

```sh
npm run db:test:prepare
npm test
npm run test:coverage
npm run lint -w @clinic/backend
```

Testes usam banco clinicapp_test separado. PostgreSQL 55432; MinIO 59000 (console 59001); Mailpit 58025 (SMTP 51025); ClamAV 53310. Consulte `docker compose ps` e `docker compose logs SERVICO`. Nenhum serviço externo foi contratado ou publicado.

Scripts de frontend, seed e worker foram definidos como alvo de execução e ainda não funcionam neste marco. Não confundir configuração com integração pronta.

## Antes de dados reais

Resolver pendências de produto/jurídicas, dependências vulneráveis da auditoria inicial, anexos privados e antimalware, gestão dedicada de chaves, HTTPS, observabilidade, backups/PITR e testes de restauração para RPO ≤ 1h/RTO ≤ 4h. Chaves e credenciais de .env.example são exclusivamente demonstrativas. Não existe validação operacional, de usabilidade com pessoas ou conformidade integral.
