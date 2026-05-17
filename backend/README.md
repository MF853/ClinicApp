<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---

Atualizações específicas deste repositório (Sistema de Gerenciamento de Horários)
================================================================================

Resumo do que foi feito hoje
- O schema do Prisma foi criado/atualizado em [prisma/schema.prisma](prisma/schema.prisma) para uso com SQLite.
- O datasource do Prisma foi configurado para `sqlite` e usa o arquivo local `prisma/dev.db` por padrão.
- As entidades principais modeladas incluem: `Clinica`, `Administrador`, `Terapeuta`, `Paciente`, `SessaoPaciente`, `HorarioGradeTerapeuta`, `GradePacienteHorario`, `Agendamento`, `Ausencia` e `Atestado`.

Instruções para rodar o projeto localmente
=========================================

Pré-requisitos
- Node.js (>= 18 recomendado)
- npm

1) Backend

 - Instale dependências:

```bash
cd backend
npm install
```

 - Gerar o client do Prisma e sincronizar esquema com o banco SQLite (criará `prisma/dev.db`):

```bash
npx prisma generate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
```

Observação: usamos `db push` para sincronizar o esquema com o arquivo SQLite local sem criar migrations obrigatórias. Se preferir trabalhar com migrations, use `npx prisma migrate dev`.

 - Rodar a aplicação (modo desenvolvimento do NestJS):

```bash
npm run start:dev
```

 - Variáveis de ambiente
   - O schema está apontando para `file:./dev.db` dentro da pasta `prisma`. Se quiser usar uma URL diferente via `.env`, atualize `prisma/schema.prisma` ou configure `DATABASE_URL` adequadamente.

2) Frontend (aplicação cliente)

 - Instale dependências e rode:

```bash
cd frontend
npm install
# comando específico do frontend pode variar (ex.: npm run dev ou npm start)
npm run dev || npm start
```

Verificações rápidas
- Arquivo do schema: [prisma/schema.prisma](prisma/schema.prisma)
- Geração do client Prisma: `../generated/prisma` (diretório configurado no schema)

Boas práticas durante desenvolvimento
- Faça commits pequenos e claros após mudanças de schema.
- Ao alterar o schema Prisma, rode `npx prisma generate` e em seguida `npx prisma db push` ou `npx prisma migrate dev` conforme fluxo escolhido.

Se quiser, eu posso:
- Rodar `npx prisma generate` agora e confirmar que o client foi gerado.
- Adicionar um `README` no `frontend/` com instruções específicas caso prefira.
