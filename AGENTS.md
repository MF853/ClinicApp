# ClinicApp

Aplicação pessoal de gestão clínica. Fonte funcional: `docs/Documento-de-Requisitos-ClinicApp-v2.md` (não alterar). Stack: React/Vite/TypeScript, Router, TanStack Query; NestJS, Prisma/PostgreSQL; pg-boss em worker separado; SSE; Capacitor. Nenhum deploy/push sem pedido.

## Trabalho e verificações
- Leia `docs/DECISOES.md` e a matriz de rastreabilidade antes de alterar regras. Não inferir decisões clínicas/jurídicas.
- Antes de criar/alterar UI, leia `DESIGN.md` e `references/taste/SKILL.md` (design-taste-frontend-v1). Para revisão de interface existente, consulte a documentação `references/taste-README.md` e confirme a skill pertinente antes de carregá-la. Backend puro não requer instruções de design.
- Mudança em componentes compartilhados exige verificar telas consumidoras. Mudança visual exige revisar `references/cal-DESIGN.md`, tokens e DESIGN.md.
- Playwright persistente: `npm run test:e2e`; CLI disponível: `npx --no-install playwright`. Exploração via CLI/Node Playwright complementa a suíte, não é MCP. Inspecione screenshots nos layouts relevantes, corrija e revalide; nunca adote baselines cegamente.
- Ponytail instalado: `/home/mario/.codex/plugins/cache/ponytail/ponytail/4.9.0/skills/ponytail/SKILL.md`; revisão: `ponytail-review/SKILL.md` na mesma pasta skills. Cópias reproduzíveis em `references/ponytail/`. Leia e aplique full antes de dependências/abstrações; reutilize código, linguagem e plataforma. Simplicidade não reduz garantias ou testes exigidos.
- Antes de concluir: revisão de complexidade e revisão separada de correção, autorização, integridade/concorrência e testes. Registre evidências reais em `docs/ENTREGA.md` e `docs/RASTREABILIDADE.md`.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`, `npm run build`, `npm run lint`, `npm test`, `npm run test:coverage`. Execute integração em PostgreSQL real.
- Faça commits locais em marcos verificáveis conforme pedido do usuário. Não inclua .env, auth storage, tokens, relatórios sensíveis ou artefatos de runtime.

## Limites
HTTP valida entradas; casos de uso em `backend/src/modules`; infraestrutura compartilhada em `infrastructure`. API não consome filas. Toda escrita que disputa vagas passa pela mesma transação/lock. Vínculo/perfil/clínica vêm da sessão validada, nunca do cliente. Autorização também em downloads, SSE e worker. Não remover auditoria, CSRF, isolamento, idempotência, quarentena, prazos em dias úteis ou confirmação humana.

AGENTS.md não instala plugins nem registra ferramentas. Taste foi copiada como instrução local, não instalada como plugin; Ponytail já estava disponível. Não confiar/aprovar hooks automaticamente. Commits das referências: `references/*-commit.txt`; versões executáveis: package-lock.json.
