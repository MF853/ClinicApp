# Rastreabilidade

## Revisão consolidada — 2026-09-20

Situação atual por incremento e requisitos: [VALIDACAO-2026-09-20.md](VALIDACAO-2026-09-20.md). Registros abaixo são históricos; a tabela inicial ao final não representa o estado completo atual.

| Grupo | Situação verificada |
|---|---|
| Cadastros, grade, parâmetros individuais, avisos | Entregas de 17/09 confirmadas no código; suíte atual com 26 testes backend aprovada |
| RF-CLI-10, RN-15/19/22/25 | Liberação fixa existe; faltam ciclo de bloqueio terapêutico, liberação pontual, reset na UI e reativação completa |
| RF-FAL-08/09, RF-NOT-01/02/03 | Pré-validação inconclusiva, canais externos e parte dos destinatários/gatilhos pendentes |
| RF-ADM-08/09/12, RNF-38/44 | Registro inicial de aceites/solicitações; jornadas de direitos e detalhamento da auditoria incompletos |
| RNF-49 | Recorte 79,21% linhas; pasta de faltas 67,54%; upload/processamento/contestação sem cobertura funcional; não aceito integralmente |
| RNF-34/40/51/52/53 | Gestão de chaves, CI/segurança, observabilidade, operação e mobile ainda parciais ou pendentes |


## Avisos — 2026-09-17

| Requisitos | Implementação | Evidência / limite |
|---|---|---|
| RF-CLI-08, RF-COM-02 | `alerts.ts`, `Alerts.tsx`: publicar por público e término, exibir avisos vigentes | `alerts.test.ts`, `alerts.spec.ts`; início imediato, sem agendamento futuro ou canais externos |
| RNF-46 | Público e clínica filtrados no servidor; criação apenas por administrador; CSRF e auditoria | Integração HTTP real e expiração no limite exato; 26 testes backend passaram |


## Grade semanal — 2026-09-17

| Requisitos | Implementação | Evidência / limite |
|---|---|---|
| RF-TER-01/02/03/06/08 | `schedule.ts`, `Slots.tsx`: edição própria, restrições inline, alocação e exceção auditada | `schedule.test.ts`, `slots.spec.ts`; horários ocupados não são movidos |
| RF-CLI-10, RN-21 | Liberação manual de horário fixo preserva confirmadas e reposições | Idempotência e preservação testadas; reativação de sessão bloqueada pendente |
| RNF-46, integridade de vagas | Lock comum em edição, alocação e reserva; conflitos de paciente | PostgreSQL real: disputas redução/alocação e redução/reserva; 24 testes backend passaram |


## Cadastros e acompanhamento — 2026-09-17

| Requisitos | Implementação | Evidência / limite |
|---|---|---|
| RF-ADM-01/02/07/11 | `members.ts`, `Members.tsx`: cadastro, alocação inicial pelo terapeuta, desvinculação e reativação | `members.test.ts` + `members.spec.ts`; convites/contas externas pendentes |
| RF-CLI-03, RN-17/26 | Parâmetros individuais anuláveis para herdar padrão, auditados | Teste de valores efetivos, prazo futuro e preservação de prazos concedidos |
| RF-TER-11 | Histórico com status, prazo e contador na interface | Testes de superfícies e inspeção visual |
| RNF-46, RN-21 | Isolamento, lock compartilhado e preservação de confirmadas | HTTP e concorrência desvincular/alocar em PostgreSQL real |

## Organização e tipografia — 2026-09-17

| Item | Implementação | Evidência |
|---|---|---|
| Estrutura solicitada do GitHub | `backend/`, `frontend/`, workspaces e caminhos atualizados; histórico original integrado | Prisma, migrations, seed, build, lint e inicialização de API/worker/web passaram |
| Fonte padrão New Zen | `frontend/src/styles/tokens.css`, quatro arquivos locais e licença original | Teste de navegador verifica carregamento dos quatro pesos; capturas desktop/mobile inspecionadas |
| Preservação funcional | Nenhuma regra clínica alterada pela reorganização | Teste de lifecycle e 15 testes backend em PostgreSQL real; 18 cenários Chromium/Firefox passaram na primeira execução; dois cenários ignorados por janela de confirmação indisponível |

Caminhos `apps/backend` e `apps/web` em registros históricos abaixo correspondem agora a `backend` e `frontend`. Limites e resultados de revalidação em `docs/ENTREGA.md`.

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
