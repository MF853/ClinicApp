# Entrega em andamento

## Contraste e grade de calendário — 2026-09-16

- Painéis claros sobre fundo bege, textos secundários mais escuros, contornos visíveis, estados com borda e controles desabilitados sem transparência. Paleta e neumorfismo mantidos; destaque lilás usa texto #442369 após verificação de contraste.
- Agenda profissional em tabela nativa: dias nas colunas, horários locais ordenados nas linhas, células vazias explícitas e consultas simultâneas empilhadas. Larguras uniformes e altura mínima de 340px nos cartões mantêm os botões alinhados; conteúdo maior pode expandir sem recorte. Tablet tem rolagem interna; celular exibe horário e dia selecionado. Lista do paciente preservada.
- Build/lint do frontend passaram. Nove cenários passaram no Chromium e nove no Firefox, com navegação, foco, 403 esperado da recepção e axe. `calendar.spec.ts` mede posições/larguras/alturas das células, testa lacunas, simultaneidade, nome longo, horário noturno no fuso local e abertura de detalhes no celular. Esse teste simula apenas a resposta da agenda; os demais usam API/PostgreSQL reais.
- A inspeção no Firefox revelou sobreposição causada por altura percentual dentro de células. Removida em favor de fluxo normal e altura mínima. Grade/calendário revalidados no Chromium após essa correção; screenshots desktop, tablet e celular inspecionados. Referências do login atualizadas após inspeção para registrar o novo contraste.
- Revisão de complexidade: tabela HTML, Intl, Map e CSS existentes; nenhuma biblioteca de calendário ou abstração nova. Revisão separada de correção/autorização/integridade: nenhum endpoint, permissão, transação ou regra clínica alterado; vazio não é apresentado como vaga disponível; todos os atendimentos simultâneos permanecem visíveis.
- Uma rodada de Firefox foi interrompida no login pelo PostgreSQL desligado entre turnos; repetição com o banco ativo passou. API, frontend e PostgreSQL usados temporariamente foram encerrados ao concluir. WebKit continua limitado por bibliotecas ausentes no sistema, conforme registro anterior.

## UI neumórfica — 2026-09-16

- Direção solicitada: Highlight Palette `#845EC2`, `#C493FF`, `#FEFEDF`, `#D5CABD`. Tokens e CSS compartilhados aplicam superfícies bege, ações roxas, destaques creme/lilás, sombras duplas e campos em baixo-relevo em todas as telas. DESIGN.md atualizado. Sem dependências de aplicação novas.
- Build e lint do frontend passaram. Playwright com API e PostgreSQL reais: 8 cenários passaram no Chromium e os mesmos 8 no Firefox (login, agenda 320/390/768/1440px, diálogo/Escape, autorização da recepção, agenda do terapeuta e superfícies de justificativas, encaixes, disponibilidade, pacientes e configurações). Axe sem violações detectadas nos cenários exercitados. Recuperação de acesso também inspecionada pelo teste de superfícies.
- Referências do login em Chromium/Firefox geradas pela primeira vez, inspecionadas visualmente antes de aceitas e revalidadas: 2 testes de screenshot passaram. Capturas desktop/mobile em `test-results/` inspecionadas; referências estáveis sem dados pessoais em `tests/e2e/local.spec.ts-snapshots/`.
- A verificação adicional de foco revelou uma falha preexistente no Modal: o desmontar não restaurava o foco. O componente agora devolve o foco ao acionador ainda conectado. Dois testes adicionais (Chromium/Firefox a 320px) passaram com Escape e botão Fechar; capturas do diálogo e viewport inspecionadas. Build/lint repetidos após a correção passaram.
- Revisão de complexidade: alteração de apresentação concentrada em dois CSS, reutilizando componentes nativos e sem abstrações. Revisão separada de correção/autorização/integridade: nenhuma regra ou chamada de API alterada; rótulos/cores clínicos preservados, decisões humanas mantêm igual destaque, controles conservam contorno e foco, 403 da recepção continua esperado. Nenhuma mutação clínica executada nesta validação visual.
- Limitação: WebKit baixado, mas não executado por ausência de bibliotecas do sistema (`libevent`, `libavif16`, `libmanette`). Não equivale a teste Safari/iOS real. A primeira tentativa de E2E encontrou a aplicação fechada; API e frontend foram iniciados temporariamente para validação e encerrados ao concluir. Infraestrutura Docker preexistente preservada.

## Correção de 403 no login local — 2026-09-16

- Inconsistência encontrada: Vite inicia em `127.0.0.1:5173`, mas `WEB_ORIGIN` configura `localhost:5173`; o CSRF rejeitava o endereço anunciado pelo servidor. A validação central agora aceita ambos apenas em `NODE_ENV=development` e quando a origem configurada é um desses dois endereços locais. Produção e origens personalizadas mantêm a lista explícita.
- Evidências: build e lint passaram; `npm run db:test:prepare && npm test` passou (1 teste de inicialização e 15 de backend). `identity.test.ts` verifica origens, tokens e restrição em produção; integração HTTP com PostgreSQL real em `clinicapp_test` verifica login, sessão, logout, invalidação da sessão e bloqueio de troca para vínculo de outro usuário nos dois endereços locais.
- Revisão de complexidade: duas linhas na validação existente, sem dependências ou abstrações novas. Revisão separada de correção/autorização: CSRF continua exigindo token válido, portas e origens externas seguem bloqueadas, permissões não foram ampliadas; a suíte de integridade e concorrência passou.
- API de teste em porta aleatória encerrada automaticamente. Serviços previamente iniciados pelo usuário preservados. Nenhuma mudança visual; navegador e proxy Vite não foram exercitados nesta rodada. O usuário confirmou o erro no login, mas não informou a URL nem a mensagem exata da resposta.

## Correção da inicialização local — 2026-09-16

- Causa confirmada: containers parados e `npm run dev` iniciando o worker sem preparar PostgreSQL (`ECONNREFUSED 127.0.0.1:55432`).
- Correção: `predev` inicia e aguarda a infraestrutura, gera Prisma, aplica migrations e executa o seed antes da aplicação. Falhas interrompem a sequência. README atualizado com comando e contas demonstrativas.
- Evidências: `node --test scripts/dev.test.mjs` passou (sucesso e falha em cada etapa, com comandos simulados); `npm run db:generate`, `npm run build` e `npm run lint` passaram; `npm run db:test:prepare && npm test` passou com 13 testes de backend em PostgreSQL real. O teste de inicialização foi incorporado ao `npm test` após essa execução.
- Revisão de complexidade: reutilizados scripts existentes e lifecycle npm; nenhuma dependência adicionada. Revisão separada de correção, autorização e integridade: preparação bloqueia a inicialização em caso de erro; seed existente preserva usuários; regras, autorização e locks não foram alterados; testes de isolamento, auditoria e concorrência passaram.
- API, worker e frontend não foram iniciados nesta correção. PostgreSQL foi iniciado apenas para testes e parado ao finalizar. Inicialização completa e navegação não foram exercitadas nesta rodada.

Inspeção: somente documento Markdown encontrado; sem protótipo e sem Git preexistente. Git inicializado a pedido do usuário. Documento original preservado.

Ponytail 4.9.0 lida e aplicada (full). Taste v1 lida, copiada localmente por mecanismo suportado; ainda não aplicada a UI. Cal DESIGN.md consultado: somente espaçamento/campos/abas como inspiração; marketing não define agenda clínica. Playwright instalado na suíte, ainda não executado. Nenhum MCP Playwright disponível. Commits upstream registrados em references.

Backend parcial compila. API, worker e UI ainda não constituem entrega funcional. Auditoria npm inicial registrou 35 alertas; não aprovar uso real antes de correção e revalidação.

## Marco 1 · API e regras transacionais

- Migration aplicada no PostgreSQL 17 local e em clinicapp_test separado. FKs compostas por clínica, unicidades, checks de parâmetros e proteção contra UPDATE/DELETE da auditoria. O proprietário do banco ainda pode alterar essa proteção; não é inviolável.
- `npm run build -w @clinic/backend` e `npm run lint -w @clinic/backend`: passaram.
- `npm test`: 13 testes passaram, incluindo PostgreSQL real, concorrência na última vaga e entre decisões humana/automática, isolamento, recusa da recepção, idempotência, preservação de confirmadas e dias úteis.
- `npm run test:coverage`: resumo gravado em coverage-summary.json. Faltas 95,65% linhas / 81,94% ramos; confirmação 89,74% / 88,46%; encaixe 100% / 81,96%. Apenas código implementado desses três módulos, não toda a aplicação nem requisitos ainda ausentes.
- Ponytail-review aplicado ao código relacionado: remoção de import e argumento sem uso; sem novas camadas genéricas. Revisão separada de correção/segurança corrigiu atualização do contexto dentro do lock, validação hexadecimal de CSRF, cifragem do token de recuperação na outbox e cálculo de idade a partir da data civil.
- API HTTP ainda precisa de testes reais de sessão e rotas. Frontend, worker, upload seguro, SSE, seed e integração Capacitor permanecem em construção. Não houve validação visual neste marco exclusivamente backend.
