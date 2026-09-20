# Validação do planejamento — 20/09/2026

Base analisada: commit `9afa254`. Comparação de `PLANEJAMENTO.md`, requisitos v2, decisões, matriz de rastreabilidade, código e testes. O documento original de requisitos não foi alterado. Esta rodada valida implementação e lacunas; não implementa novas funcionalidades.

## Resultado

O núcleo web está implementado e os testes existentes passam, mas o planejamento ainda não está concluído. Os incrementos 2 a 6 continuam parciais. Não atribuímos percentual de conclusão: requisitos implementados, cobertura de código e aceitação do produto são medidas diferentes.

O planejamento de 10/09 estava desatualizado: cadastros internos, desvinculação/reativação de vínculo, parâmetros individuais, edição básica da grade, exceção etária, liberação manual e avisos por público foram entregues em 17/09. Reativar vínculo de uma pessoa não equivale a reativar uma sessão bloqueada por faltas.

## Verificação executada agora

| Verificação | Resultado |
|---|---|
| `npm run build` e `npm run lint` | Passaram nos dois workspaces |
| `npm run db:test:prepare` | PostgreSQL real em `clinicapp_test`; migration atual aplicada, nenhuma pendente |
| `npm test` | 1 teste de lifecycle e 26 testes backend passaram |
| `npm run test:coverage` | 26 testes passaram; 79,21% de linhas nos arquivos selecionados pelo script |
| `npm audit --json` | 9 pacotes reportados: 6 altos, 3 moderados, nenhum crítico; não equivalem a 9 explorações demonstradas |
| Navegador, worker, scanner e armazenamento | Não reexecutados nesta rodada; evidências de Chromium/Firefox de 17/09 permanecem históricas |

Cobertura de linhas: `absences.ts` 95,65%; `confirmation.ts` 89,74%; `fitting.ts` 100%; `certificates.ts` 22,03%, com 0% de funções. A pasta de faltas fica em 67,54%. Portanto, não declarar RNF-49 atendido para o módulo completo de faltas. O relatório do controller de anexos não comprova execução dos endpoints: ele registra 0% de funções. O script não inclui todo o backend nem impõe limiar de aprovação.

Auditoria atual registrada em `npm-audit-current.json`. Cadeias afetadas: Nest/platform-express/multer, Prisma/config/deepmerge-ts/mysql2 e Capacitor/xcode/uuid. Algumas sugestões do npm envolvem troca de versão principal ou retrocesso; revisar compatibilidade antes de aplicar correções. Nenhuma dependência foi alterada nesta validação.

## Situação por incremento

| Incremento | Já implementado | Ainda falta |
|---|---|---|
| 1. Inspeção e decisões | Documentação, stack, referências e decisões registradas | Resolver decisões de produto/jurídico ainda abertas; não confundir com trabalho de código |
| 2. Persistência e identidade | PostgreSQL, sessão, CSRF, Argon2id, recuperação, troca de perfil, cadastro interno e gestão básica de vínculo | Convite/autocadastro, vínculo de conta já existente, administrador do sistema, consentimentos e direitos do titular completos; 2FA |
| 3. Agenda e encaixe | Grade própria, restrições/capacidade, alocação, exceção etária, confirmação, reserva e aprovação transacionais | Exceções recorrentes, pedido de alteração pela clínica, liberação de pendência RN-15, ciclo de sessão bloqueada e reativação; prioridade de reposição/pool |
| 4. Faltas, atestados e worker | Contador, prazos úteis, decisões, contestação, consequências humanas, anexos em quarentena e worker | Pré-validação real, informação complementar, alertas clínicos, testes integrais do pipeline e de falhas/concorrência |
| 5. Interfaces, comunicação e mobile | Web por perfil, New Zen, SSE, avisos por público, e-mail local | Comunicação direta, canais externos, preferências/silêncio, histórico de notificações na UI, projetos nativos e testes em dispositivos |
| 6. Verificação e entrega | Build/lint, testes de domínio/HTTP e cenários Playwright | Cobertura de fluxos completos, CI, testes de segurança/carga/usabilidade, observabilidade, backup/restauração e entrega operacional |

## Pendências funcionais prioritárias

| Prioridade | Requisitos | Pendência e evidência no código |
|---|---|---|
| 1 | RF-CLI-10, RN-19/20/21/22/25 | Completar estado de sessão bloqueada, solicitação com aprovação da recepção e reativação com verificação de vagas. `consequence()` desativa alocações e cancela futuras não confirmadas, mas não persiste um estado de bloqueio da sessão terapêutica; `reactivate` só limpa `suspendedUntil`. A UI de Members oferece aplicar/suspender, sem fluxo de reset do contador ou reativação terapêutica. `Membership.active` representa vínculo, e `Session` representa autenticação. |
| 1 | RF-TER-04, RN-11/15 | Liberação pontual de consulta pendente sem penalidade quando efetivamente reocupada ainda não tem caso de uso. Bloquear uma ocorrência livre e liberar toda a alocação fixa não substituem esse fluxo. |
| 1 | RF-FAL-08, RF-NOT-02/03, RN-23 | Completar destinatários e gatilhos. `consolidate()` avisa somente o paciente ao aproximar/atingir limite; o terapeuta também é exigido. Rejeição de atestado consolida a falta em outro caminho sem disparar esses avisos de limite. `submitCertificate()` notifica administradores avaliadores, sem o aviso ao terapeuta previsto. |
| 1 | RF-ADM-12, RNF-38 | Auditoria parcial: abertura automática SCHEDULED→PENDING e atualização de consulta na decisão de atestado não recebem evento próprio de status; consequência usa atualização em lote sem detalhar cada consulta afetada. Download tem eventos, mas não registra a origem requerida. Completar rastreabilidade e testes. |
| 1 | RF-PAC-05/06/14, RF-FAL-09/10/13, RN-30..36 | Pré-validação é explicitamente inconclusiva; data declarada não foi extraída/comparada ao documento. Upload, scanner, HEIC, download, contestação e expurgo precisam de testes completos. Alerta configurável por excesso de atestados aprovados (RN-36) não está implementado. Não remover a decisão humana. |
| 2 | RF-ADM-02/04/07 | Convites/autocadastro e associação de conta existente a nova clínica. Cadastro interno já funciona. `Role` só contém PATIENT, THERAPIST, ADMIN e RECEPTION; administrador do sistema não está modelado. Cadastro público de terapeuta consta do planejamento, sem estar concluído. |
| 2 | RF-ADM-08/09, RNF-41..45 | APIs registram aceite e pedido de exportação/exclusão, mas não há jornada de termos, revogação, tratamento/entrega da solicitação ou exclusão efetiva. Definições legais e de retenção precedem aceite de produção. |
| 2 | RNF-48, RN-26/29/36/45 | Tela e DTO globais só expõem limite de faltas, dias de justificativa, hora da confirmação e antecedência do fechamento. Feriados, janela de avaliação, retenção, categorias obrigatórias e limites de reposição já têm parte da estrutura no banco, mas faltam gestão pela aplicação e validação integral. Parâmetros individuais de faltas/prazo estão entregues. |
| 2 | RF-TER-01/04, RF-CLI-09, RN-06 | Férias/feriados e exceções recorrentes; solicitação de mudança pela clínica com aceite do terapeuta. Edição atual preserva atendimentos: recusa mover horários ocupados ou com histórico futuro. |
| 2 | RF-NOT-01/05/06/07, RF-PAC-03/15 | Push e demais provedores, link para consulta com poucas interações, preferências, silêncio e histórico acessível. Worker envia e-mail genérico para a página inicial; tentativas/falha final existem, mas não histórico detalhado de cada tentativa. Entrega externa e reprocessamento não estão comprovados. |
| 3 | RN-37/43/46..51, RF-PAC-13, RF-ENC-08/11 | Prioridade de 15 dias, adesão ao pool, ofertas com prazo, reputação explicável e lista de espera. Não confundir com a busca 7/14 dias e reserva já funcionais. Reputação depende de QA-07. |
| 3 | RF-COM-01/03, RF-FAL-12 | Mensagens diretas com histórico/aviso de registro e solicitação de informação complementar do atestado. Avisos gerais já estão implementados, com início imediato e término definido. |
| 3 | RF-CLI-11/12, RF-TER-13, RF-ADM-10 | Indicadores, exportação de relatórios, calendário externo e 2FA. São complementares à conclusão dos fluxos Must; prioridades S/C permanecem as dos requisitos. |
| 3 | RF-PAC-07, RNF-53 | Captura assistida pela câmera e aplicativos Android/iOS. Capacitor tem configuração/dependências; não existem projetos nativos validados. Compatibilidade com Safari/Edge e dispositivos reais permanece pendente. |

As prioridades acima organizam execução por risco e dependência; não alteram o MoSCoW do documento. RN-20/RF-FAL-14 continuam prevalecendo sobre a formulação de liberação automática em RF-FAL-07.

## Segurança, qualidade e operação antes de produção

- Corrigir os alertas de dependências e testar as rotas afetadas, especialmente upload. `npm audit` não substitui revisão de autorização nem teste de segurança.
- Testar worker/outbox com falhas de envio, autorização revogada, duplicidade e processamento concorrente; reconciliar processamento de anexos com expurgo para impedir recriação de objetos já eliminados.
- Adotar gestão dedicada e rotação de chaves. Cifragem AES-GCM dos anexos existe; chave em ambiente local não entrega a gestão dedicada de RNF-34.
- Completar limites de taxa de confirmação/upload por conta e IP: hoje usam o vínculo nesses endpoints; autenticação tem os dois controles.
- Implantar pipeline CI com testes, verificação de segurança e cobertura; não há workflow de CI versionado encontrado. Ampliar HTTP/E2E para recuperação, troca de perfil, anexos, decisões, encaixe completo e sessões expiradas. O teste de confirmação pode ser ignorado quando o seed não fornece janela aberta: criar cenário determinístico.
- Validar desempenho, carga, HTTPS/HSTS em ambiente de entrega, métricas/tracing, alertas, backup/PITR, restauração, disponibilidade e rollback. Os objetivos RNF-20..29/51/52 não foram demonstrados.
- Realizar testes de acessibilidade e usabilidade com pessoas. Capturas/axe prévios não provam WCAG integral, SUS ou tempo de tarefa.

## Decisões ainda necessárias

QA-03/04/05: base legal, retenção e menores/consentimento parental. QA-06: política de encaixe em grupos. QA-07: pesos de reputação. QA-08: confirmação sem autenticação plena. QA-09: resolução de mudança de grade recusada. D02: marco da aprovação por decurso de prazo. Manter padrões conservadores atuais até decisão; não inventar critérios clínicos.

## Próxima sequência recomendada

1. Corrigir dependências e fechar testes do pipeline de anexos/worker e lacunas de auditoria/notificações.
2. Completar sessão bloqueada, reset/reativação e liberação pontual de pendência.
3. Concluir convites/vínculos, configuração e exceções de agenda.
4. Entregar jornadas de privacidade e notificações reais conforme decisões aprovadas.
5. Seguir para comunicação complementar, pool/reputação, indicadores e mobile; validar operação e usabilidade para aceite.

Sem alterações de lógica, novas dependências, deploy ou push nesta rodada. Revisão de complexidade: nenhuma abstração adicionada. Revisão de correção/autorização/integridade registrada nas lacunas acima e nos resultados da suíte, sem alegar auditoria de segurança exaustiva.
