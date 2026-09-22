# Planejamento do ClinicApp

Atualizado em 21/09/2026. Projeto pessoal, sem vínculo com outros projetos empresariais. Este arquivo registra o plano e a situação da entrega; não substitui nem altera o [documento de requisitos](Documento-de-Requisitos-ClinicApp-v2.md).

## Validação atual

Comparação do código com requisitos e planejamento: [validação de 20/09/2026](VALIDACAO-2026-09-20.md). Na validação de 20/09 havia lacunas de cobertura e 9 pacotes com alertas. Atualização de 21/09: dependências corrigidas (auditoria sem alertas), build/lint aprovados e 37 testes backend, incluindo anexos e worker reais. Cobertura de faltas: 98,39% das linhas. Limites atuais em ENTREGA.md; não há aceite integral do produto.

Entregues em 17/09: cadastros internos, desvinculação/reativação de vínculo, parâmetros individuais, edição básica da grade, alocação com exceção etária, liberação de horário fixo e avisos por público/prazo. Sessão terapêutica bloqueada, reativação e liberação pontual entregues em 21/09; pedido avulso sem consulta anterior entregue em 22/09 (etapa 1). Convites e exceções recorrentes continuam pendentes. Etapas 2 (configurações) e 3 (privacidade) aguardam confirmação; e-mail/SMS adiados.

## Objetivo e escopo combinado

Entregar uma aplicação web e móvel de gestão de clínicas terapêuticas e atendimento particular: grade semanal recorrente, horário fixo, consultas individuais inclusive em grupos, confirmação na véspera, faltas/atestados, reposição e encaixe com aprovação, notificações e auditoria. Perfis: paciente, terapeuta, administrador e recepção.

Priorizar Must e fluxos completos. Fora do escopo: prontuário, pagamentos, videochamadas, marketplace e inferência clínica. Não publicar nem contratar serviços externos sem autorização.

Stack: React/Vite/TypeScript, React Router e TanStack Query, CSS Modules e componentes compartilhados; NestJS REST /api/v1 e OpenAPI; Prisma/PostgreSQL; pg-boss com worker separado; SSE; Capacitor; Docker Compose, S3 privado, capturador de e-mail e antimalware. Monólito modular, sem microsserviços, Redis ou filas adicionais.

## Plano de execução e situação

| Incremento | Objetivo | Situação real |
|---|---|---|
| 1. Inspeção e decisões | Ler requisitos, preservar projeto, consultar ferramentas e definir decisões | Concluído. Só havia o documento; nenhum protótipo reaproveitado. Referências e commits locais em references/. |
| 2. Persistência e identidade | Modelo, migrations, autenticação, vínculos, clínica/perfil ativo | Base implementada. PostgreSQL real, sessões persistidas, Argon2id, CSRF, cadastro interno por API e interface, recuperação de senha e alternância. Faltam convites, associação de contas existentes, privacidade, administrador do sistema e testes completos. |
| 3. Agenda e encaixe | Recorrência, ocorrência, confirmação e reserva transacional | Núcleo implementado e testado em PostgreSQL, incluindo disputa pela última vaga. Interfaces de agenda, confirmação e solicitação/decisão conectadas. Edição completa da grade e exceções ainda parciais. |
| 4. Faltas, atestados e worker | Contador, justificativa, decisões, anexos e processamento persistente | Núcleo de faltas testado; upload, quarentena, cifragem local, antimalware, decisões e worker implementados. Validação ponta a ponta e robustez operacional ainda incompletas. |
| 5. Interfaces, comunicação e mobile | Telas por perfil, SSE, notificações e Capacitor | Web React conectada; SSE, avisos por público/prazo e e-mail local implementados. Capacitor apenas dependências/configuração, sem projeto nativo compilado. Comunicação direta, push e SMS pendentes. |
| 6. Verificação e entrega | Testes funcionais/visuais, acessibilidade, CI, execução reproduzível | Build/lint e suíte de domínio executados. Testes Playwright locais em evolução; limitações e resultados finais em ENTREGA.md. Não há aceite integral do produto. |

## O que já pode ser experimentado na versão web

- Entrar com contas fictícias, sair e selecionar clínica/perfil disponível.
- Ver a agenda semanal da equipe e a linha do tempo diária no smartphone. Paciente vê suas consultas com data, sala e terapeuta.
- Abrir consulta, confirmar dentro da janela ou cancelar com aviso explícito. Registrar presença/falta como terapeuta após início.
- Consultar faltas e seu prazo, enviar justificativa e acompanhar documentos; avaliador designado decide. Recepção é bloqueada também por acesso direto à API de atestados.
- Declarar disponibilidade, buscar reposição em 7/14 dias, solicitar reserva e aprovar/recusar como equipe.
- Cadastrar pessoas, gerir vínculos, consultar pacientes e alterar parâmetros globais básicos e individuais.
- Criar/editar grade própria, alocar com exceção etária explícita e liberar horário fixo preservando consultas confirmadas.
- Registrar decisão humana de aplicar/suspender consequência e publicar avisos por público com término definido.

Esses pontos descrevem código conectado, não uma declaração de cobertura completa. Testes de domínio e de navegador têm escopos diferentes; consulte a matriz de rastreabilidade.

## O que falta desenvolver ou completar

### Domínio e administração
- Cadastro público de terapeuta, convite/autocadastro de paciente e vinculação de contas já existentes (RF-ADM-01/02/07).
- Termos/consentimentos versionados em fluxo de produto; exportação/exclusão efetiva de dados e gestão de solicitações (RF-ADM-08/09). A API inicial apenas registra solicitações/aceites. 2FA pendente.
- Edição integral da grade, férias/feriados/bloqueios recorrentes, alterações solicitadas pela clínica, reativação terapêutica e liberação pontual de pendência sem penalidade (RF-TER-01/04, RF-CLI-10, RN-15/22).
- Configuração completa de calendário, janela, retenção, reposições e alertas clínicos, com telas e validações; parâmetros individuais básicos já entregues. Reativação precisa reavaliar vagas explicitamente.
- Informação complementar em atestados e cobertura completa dos estados/contestação. RF-FAL-09 permanece parcial: não há extração confiável de data de PDF/imagem.
- Reputação explicável por paciente/terapeuta, pesos configuráveis, recuperação, consentimento e ordenação do pool. Não foi implementada uma pontuação alternativa.
- Pool de encaixe, prioridade de 15 dias, ofertas temporizadas e lista de espera conforme prioridade MoSCoW; indicadores agregados/exportação de relatórios.

### Integrações e segurança
- Ampliar a validação de jobs para notificações, falhas conjuntas de armazenamento/banco e reconciliação SSE; reprocessamento de anexos após falha de scanner e expurgo concorrente já testados. Definir monitoramento da fila e alertas.
- Completar robustez operacional de anexos, manter auditoria de dependências, implementar gestão dedicada/rotação de chaves e reconciliação de objetos órfãos; locks de processamento/expurgo e correções de dependências entregues. Chave em .env é somente para desenvolvimento.
- Mensagens diretas, preferências/janela de silêncio, lembretes e provedores reais de push/SMS/e-mail. E-mail local capturado não comprova entrega externa.
- Revisar autorização de todos os recursos, RLS como defesa adicional, privilégios mínimos de banco, limites de taxa por operação, cifragem de dados sensíveis além dos anexos e resposta a incidentes.
- Capacitor: projetos Android/iOS, autenticação móvel testada, plugins, Android 10/iOS 15 e dispositivos reais. Não há build nativo validado.

### Qualidade e operação
- Ampliar Playwright aos ciclos completos de confirmação/cancelamento, anexos e decisões, encaixe, faltas, troca de perfil, recuperação, erros, sessão expirada e duplicidade de envio.
- Baselines de telas/componentes críticos e matriz por risco em 320/390/768/1440. Ampliar os cenários Chromium/Firefox já executados e validar WebKit, Edge e Safari/iOS reais.
- Corrigir e revalidar toda falha de acessibilidade; testar teclado, foco e compreensão com pessoas. Axe não prova WCAG integral; duração do teste não mede usabilidade de novatos.
- Integrar todos os testes à CI; observabilidade, métricas, rastreamento, testes de carga e segurança, backup/PITR, restauração, HTTPS e gestão de segredos. Validar RPO ≤1h, RTO ≤4h e disponibilidade, sem assumir metas por compilação.

## Decisões provisórias que devem ser preservadas

- RN-20/RF-FAL-14 prevalecem sobre liberação automática: detectar e recomendar, exigir humano; aplicar e suspender com destaque equivalente. Consultas confirmadas preservadas.
- Contador por paciente/clínica (por terapeuta no particular), mantendo QA-01 aberta; prazo em dias úteis com calendário e fuso, sem atalho de 72 horas.
- Aprovação RN-34 por decurso distinguida do mérito humano. Marco provisório: envio válido; revisar ambiguidades com produto.
- Nenhuma expiração automática inventada para reserva pendente. Grupos modelados, oferta automática desativada por padrão enquanto QA-06 não for resolvida.
- Data declarada não é data extraída. Sem OCR/IA inferidos. Não ativar confirmação anônima enquanto QA-08 estiver aberta.
- Menores, consentimento, base legal e retenção dependem de produto/jurídico/clínico. Desenvolvimento apenas com dados fictícios.

Detalhamento em [DECISOES.md](DECISOES.md).

## Processo obrigatório e próximos passos

Antes de UI: DESIGN.md e Taste pertinente. Awesome DESIGN.md como referência real, sem copiar marca. Ponytail full na implementação e revisão de complexidade, mais revisão independente de correção/segurança. Executar aplicação, Playwright, inspeção visual, corrigir e revalidar. Commits locais em marcos testados; não versionar .env, tokens, sessões e documentos reais.

Próximo incremento após a entrega local: concluir testes HTTP/web dos fluxos já presentes e corrigir as lacunas de segurança/concorrência antes de expandir funcionalidades. Em seguida completar grade/cadastros/parâmetros; depois comunicação/reputação/mobile; finalizar validação operacional.

O usuário pediu pausa numa versão utilizável quando aparecer o aviso de menos de 50% do limite de 5 horas. Não inferir esse aviso por contagem de tokens; registrar quando recebido e entregar instruções/resultados/pendências.

- Execução e contas: [README](../README.md).
- Resultados e limitações verificadas: [ENTREGA.md](ENTREGA.md).
- Mapeamento de requisitos: [RASTREABILIDADE.md](RASTREABILIDADE.md).
