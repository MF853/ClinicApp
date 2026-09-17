# Rastreabilidade

## Contraste e calendário — 2026-09-16

| Item | Implementação | Evidência |
|---|---|---|
| Contraste dos componentes compartilhados | Tokens, painéis, campos, bordas e navegação ativa | Nove cenários Chromium e nove Firefox passaram; axe sem violações nos cenários cobertos; capturas inspecionadas |
| Grade padronizada e alinhada | `Agenda.tsx`: tabela por dia/horário local; CSS com divisórias e altura mínima de cartões | `calendar.spec.ts`: medidas de células, horários ausentes, consultas simultâneas, nomes longos e conversão de fuso; desktop 1440, tablet 768 e celular 390 |
| Preservação de acesso e fluxos | Backend e regras inalterados; mesmos controles de consulta | Foco/Escape, navegação de pacientes e profissionais e bloqueio da recepção revalidados com API/PostgreSQL reais |

Build/lint passaram. Grade revalidada no Chromium após corrigir sobreposição no Firefox. Detalhes e limites em `docs/ENTREGA.md`.

## UI neumórfica — 2026-09-16

| Item | Implementação | Evidência |
|---|---|---|
| Direção visual solicitada e paleta de referência | `tokens.css`, `app.module.css`, `DESIGN.md` | Capturas de login, agendas, formulários e navegação desktop/mobile inspecionadas |
| Responsividade, contraste e componentes compartilhados | Neumorfismo com contornos, foco e estados clínicos preservados | 8 cenários Playwright em Chromium + 8 em Firefox; larguras 320/390/768/1440; axe sem violações detectadas |
| Regressão visual do login | Referências por navegador em `local.spec.ts-snapshots` | 2 comparações passaram após inspeção das primeiras capturas |
| Navegação por teclado no diálogo | `ui.tsx`: restauração explícita do foco ao acionador conectado | 2 testes adicionais passaram em Chromium/Firefox a 320px, via Escape e botão Fechar |
| Autorização e regras clínicas | Sem mudanças no backend ou fluxos | Recepção continua bloqueada nos documentos; testes de navegação usam API/PostgreSQL reais sem mutações clínicas |

Build/lint do frontend passaram. WebKit limitado por bibliotecas de sistema ausentes; sem alegação de compatibilidade Safari/iOS nesta rodada. Detalhes em `docs/ENTREGA.md`.

## Login local e CSRF — correção de 2026-09-16

| Item | Implementação | Evidência |
|---|---|---|
| Login pelos endereços locais anunciados | `identity.ts`: equivalência explícita entre localhost e 127.0.0.1 na porta 5173 somente em desenvolvimento com origem local configurada | `identity.test.ts`: CSRF e HTTP real com PostgreSQL; login/sessão/logout em ambas as origens passaram |
| RF-ADM-03/04/05/06, RNF-46 — proteção da sessão | Validação de token e autorização mantidas | Origens externas, token inválido e troca para vínculo alheio retornam 403; sessão encerrada retorna 401; produção não recebe a origem adicional |

Build/lint e 15 testes backend passaram, além do teste de inicialização. Evidência HTTP direta; fluxo via navegador/proxy não validado nesta rodada.

## Inicialização local — correção de 2026-09-16

| Item | Implementação | Evidência |
|---|---|---|
| Preparar dependências antes da aplicação | `package.json`: `predev` aguarda infraestrutura, gera Prisma, migra e executa seed | `scripts/dev.test.mjs`: lifecycle npm com comandos simulados; verifica ordem e bloqueio em cada falha; passou |
| Preservar regras e integridade | Nenhuma alteração nos casos de uso, autorização ou transações | Build/lint passaram; 13 testes backend passaram em PostgreSQL real, incluindo isolamento e concorrência |

Correção operacional sem alteração de requisito clínico. Aplicação não iniciada; PostgreSQL usado na validação parado ao finalizar. Detalhes em `docs/ENTREGA.md`.

Matriz em construção. Nenhum requisito é integralmente aceito antes das verificações.

| IDs | Implementação | Verificação | Situação |
|---|---|---|---|
| RF-ADM-03/04/05/06, RNF-46 | identity.ts, access.ts, schema.prisma | build TypeScript; domain.test.ts: isolamento e acesso; HTTP pendente | parcial |
| RN-08..15 | confirmation.ts | domain.test.ts: confirmação e cancelamento | parcial |
| RN-16..34, RF-FAL-14 | absences.ts, time.ts | time.test.ts; domain.test.ts: faltas, decisão, janela | parcial |
| RF-ENC-02..09, RN-38..42 | fitting.ts | domain.test.ts: disputa, idempotência, restrições | parcial |
| Demais requisitos | ainda não entregue | não executada | pendente |
