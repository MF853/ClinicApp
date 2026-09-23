# Rastreabilidade

## Etapa 3 · Jornada básica de privacidade — 2026-09-23

| Requisitos | Implementação / evidência | Limite |
|---|---|---|
| RF-ADM-09 | Pedidos autenticados de exportação/exclusão com protocolo, clínica, prazo, acompanhamento e resposta administrativa | Execução da exportação/exclusão ainda pendente |
| RNF-44 | Inclui acesso, correção e revogação; prazo de 15 dias, destaque de atraso, estados e resposta | Não comprova atendimento efetivo do direito; canal sem vínculo ativo pendente |
| RF-ADM-12, RNF-46 | Transação, auditoria mínima, idempotência, isolamento e resposta concorrente testados em PostgreSQL | Descrição/resposta ficam no pedido, não duplicadas na auditoria |
| RF-ADM-08, D07 | Informações sobre dados com versão identificada, sem aceite jurídico presumido | Termos/política aprovados, consentimentos e base legal ainda pendentes |
| Interface / RNF-49 | 53 testes backend passam; 4 cenários Chromium/Firefox, axe e capturas 390/1440 revisados | Recorte de cobertura existente exclui privacidade; não é certificação LGPD ou WCAG |

## Etapa 2 · Configurações — 2026-09-23

| Requisitos | Implementação / evidência | Limite |
|---|---|---|
| RF-CLI-02/04, RN-09/24/26, RNF-48 | Parâmetros existentes ampliados com janela e calendário de dias úteis; validação HTTP e prazos preservados | Feriados não são bloqueios de agenda; retenção jurídica pendente |
| RF-ENC-10, RN-45 | Limites por falta e janela editáveis e aplicados às reservas; integração PostgreSQL | Pedidos avulsos continuam fora do limite de reposição |
| RN-29 | Categorias obrigatórias configuráveis; exigência relida dentro do lock; texto do paciente acompanha configuração | Justificativas anteriores preservadas |
| RF-ADM-12, RNF-46/49 | Auditoria antes/depois, isolamento/CSRF/perfis; 51 testes backend passam, 99,27% linhas / 89,79% ramos no recorte | Não é cobertura integral da aplicação |
| Interface de parâmetros e justificativas | 2 cenários Chromium/Firefox passam; axe, persistência, recusa de acesso e capturas 390/1440 inspecionadas | Sem teste WebKit/dispositivos reais |

## Etapa 1 · Atendimento avulso — 2026-09-22

| Requisitos | Implementação / evidência | Limite |
|---|---|---|
| RN-22 | Pedido sem consulta de origem para sessão bloqueada; recepção aprova/recusa; consulta STANDALONE sem reativação | Sem novas integrações de e-mail/SMS |
| RF-ENC, RN-09, RNF-46 | Elegibilidade compartilhada, reserva idempotente, isolamento, CSRF e revalidação sob lock; disputa da última vaga testada | Sem expiração de reserva inventada (D06) |
| RF-ADM-12, RNF-49 | Auditoria de pedido/decisão/criação; 50 testes backend e lifecycle passam; 99,27% linhas / 89,37% ramos no recorte | Não representa cobertura integral |
| Interface de encaixes | 4 cenários Chromium/Firefox passam; busca, recusa, nova solicitação, aprovação, agenda e regressão; axe e capturas 390/1440 inspecionadas | WebKit e dispositivos reais não exercitados |

## Notificações e auditoria — 2026-09-21

| Requisitos | Implementação / evidência | Limite |
|---|---|---|
| RN-23, RF-NOT-02/03/04 | Limiares em consolidação e rejeição avisam paciente/terapeutas; atestado e contestação avisam responsável; criação/reativação pendente abre aviso | SMTP local genérico; provedores externos e push pendentes |
| RF-ADM-12 | Transições automáticas e decisão de atestado auditam antes/depois; testes verificam ator SYSTEM e idempotência | Seed demonstrativa não representa jornada clínica real |
| RNF-38 | Emissão de URL, tentativa e conclusão de download registram origem observada pelo servidor | Endereço do proxy em instalações com proxy; não há política de proxies confiáveis inventada |
| RNF-49 | 46 testes backend passam; recorte 99,44% linhas / 88% branches; confirmação/encaixe 100% linhas | Não equivale à cobertura integral; agenda fora do recorte |


## Continuidade — 2026-09-21

| Requisitos | Implementação/evidência | Limite |
|---|---|---|
| RF-CLI-10, RN-19/20/21/25 | Bloqueio por sessão, reset e reativação com justificativa; PostgreSQL real, rollback, concorrência; interface Chromium/Firefox | Contador por clínica permanece D03; confirmadas preservadas |
| RN-11/15 | Liberação pontual, cancelamento apenas na ocupação efetiva, aviso sem falta; reserva recusada e corrida com confirmação testadas | Novos encaixes respeitam a janela mínima RN-09 |
| RN-22 | Reposição de sessão bloqueada exige recepção no servidor; UI desabilita aprovação de outros perfis | Pedido sem origem entregue em 22/09, conforme etapa 1 acima |
| RF-ADM-12, RNF-46 | Auditoria por consulta nos novos fluxos; isolamento, roles e lock comum | Complementos de avisos/auditoria no próximo incremento |


## Anexos e worker — 2026-09-21

| Requisitos | Evidência atual | Limite |
|---|---|---|
| RF-PAC-05/06/14, RN-29/35 | Integração HTTP de envio, limites, categorias, decisão e contestação única | HEIC real positivo não validado |
| RNF-34/35/37/46/47 | Cifragem, URL curta vinculada ao usuário, ClamAV real, EXIF removido, sessão e isolamento verificados | KMS/rotação e segurança integral pendentes |
| RNF-43 | Expurgo revalida retenção e decisão sob locks compartilhados; concorrência não recria objeto | Recuperação de falha conjunta S3/DB requer reconciliação adicional |
| RNF-49 | 37 testes backend; linhas: faltas 98,39%, confirmação 89,74%, encaixe 100% | Recorte definido em scripts/test-backend.mjs; não é cobertura integral do produto |
| Worker/outbox | Processo separado: job falha com scanner inacessível, repete e conclui após recuperação | Não comprova entrega externa exatamente uma vez |


## Dependências — 2026-09-20

RNF-40: dependências reportadas corrigidas; `npm-audit-current.json` sem alertas. Prisma/migrations/build/lint validados. CI e segurança integral continuam pendentes; ver ENTREGA.md.

## Execução e seed — 2026-09-20

| Item | Implementação | Verificação |
|---|---|---|
| Inicializar sem popular | `package.json`: predev sem db:seed | `scripts/dev.test.mjs`: lifecycle, ordem e ausência de seed |
| Recriar demonstração limpa | `seed.ts`: limpeza de dados/jobs e população transacional | `seed.test.ts`: repetição sem acumular, rollback e bloqueio de destino/banco em uso |
| Datas coerentes, RN-26 | Materialização relativa à execução, falta no slot correto, prazo útil | Helper de prazo existente; cenários demonstrativos recriados |


## Revisão consolidada — 2026-09-20

Situação atual por incremento e requisitos: [VALIDACAO-2026-09-20.md](VALIDACAO-2026-09-20.md). Registros abaixo são históricos; a tabela inicial ao final não representa o estado completo atual.

| Grupo | Situação verificada |
|---|---|
| Cadastros, grade, parâmetros individuais, avisos | Entregas de 17/09 confirmadas no código; suíte atual com 26 testes backend aprovada |
| RF-CLI-10, RN-15/19/22/25 | Liberação fixa existe; faltam ciclo de bloqueio terapêutico, liberação pontual, reset na UI e reativação completa |
| RF-FAL-08/09, RF-NOT-01/02/03 | Pré-validação inconclusiva, canais externos e parte dos destinatários/gatilhos pendentes |
| RF-ADM-08/09/12, RNF-38/44 | Jornada básica de solicitações/análise/resposta entregue em 23/09; execução dos direitos e termos/consentimentos aprovados ainda incompletos |
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
