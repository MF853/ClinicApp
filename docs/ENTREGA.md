# Entrega em andamento

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
