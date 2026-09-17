# ClinicApp · sistema visual

## Direção
Neumorfismo suave, profissional e acolhedor, solicitado pelo usuário com a paleta Highlight Palette (#845EC2, #C493FF, #FEFEDF, #D5CABD). Pacientes recebem uma ação principal com consulta, terapeuta e sala juntos; profissionais usam agenda semanal mais densa e filas de trabalho. Perfil e clínica permanecem visíveis. Relevo e cavidades são feitos com sombras CSS; a navegação permanece previsível.

Taste v1 (`references/taste/SKILL.md`) aplicada: variação 2, movimento 1, densidade 4 paciente/7 equipe. Labels acima dos campos, hierarquia sóbria, estados completos, superfícies táteis. A paleta roxa e o neumorfismo pedidos pelo usuário prevalecem sobre as restrições cromáticas genéricas da referência. Stack React/Vite/CSS Modules prevalece sobre exemplos Tailwind/Framer.

Referência consultada: `references/cal-DESIGN.md`, Awesome DESIGN.md no commit `8147538b4226ae41e2487a9179e3bcc1f68e8554`. Aproveitados ritmo de 4px, campos nativos contornados e abas claras. Referência descreve sobretudo marketing; nenhuma composição promocional, identidade ou ativo copiado. Airtable foi baixada para comparação, não adotada como segunda linguagem.

## Tokens reais
Arquivo: `apps/web/src/styles/tokens.css`. Fonte local do sistema (sans-serif), corpo 16px/1,5; secundário 14px; títulos 28px/1,2 e 20px/1,3. Numerais tabulares na agenda. Espaçamentos 4, 8, 12, 16, 24, 32px. Layout máximo 1440px; barra lateral 232px em desktop; campos e botões mínimo 44px; bordas 1px; raio campo 12px, painel 20px e login 28px.

| Semântica | Fundo | Texto/borda |
|---|---|---|
| Confirmado/aprovado/sucesso | #E6F4ED | #1A7A4A |
| Pendente/análise | #FFF8E1 | #8A6800 |
| Cancelado/rejeitado/erro | #FDECEB | #B53A2F |
| Enviado/informação | #E8EFF8 | #1F4E79 |
| Vago/bloqueado | #F8F7F4 | texto #554D5C |

Conflito de acessibilidade registrado: #CCCCCC não oferece contraste suficiente como texto no fundo #F8F7F4. A interface usa texto #554D5C e separadores #A99B8B; controles têm bordas #786A5D. Estados têm rótulo, além de cor. Foco usa contorno roxo escuro (#442369) de 3px e afastamento de 4px. Botão principal #845EC2 com texto branco; decisões aplicar/suspender têm mesmo tamanho e peso visual.

## Paleta e relevo

- Roxo `#845EC2`: ação principal e detalhes ativos; roxo escuro derivado `#442369`: links, foco e títulos auxiliares.
- Lilás `#C493FF`: borda superior da agenda e dia selecionado, sempre com texto escuro.
- Creme `#FEFEDF`: resumo da agenda e nota de acesso pessoal no login.
- Bege `#D5CABD`: cabeçalho da grade e controles desabilitados; superfície derivada `#F2EDE7` com sombras `#D6CDC2` e luz `#FFFDF9`.
- Painéis claros `#FFFDF9` contrastam com o fundo bege; contornos `#A99B8B` definem os limites sem depender de sombras. Textos secundários usam `#554D5C`.
- Painéis e botões secundários têm sombras duplas externas; campos usam sombras internas; navegação ativa usa lilás e texto roxo escuro. Campos/botões preservam contornos para não depender apenas da sombra. Estados clínicos mantêm suas cores e rótulos.
- Movimento restrito ao pressionamento; preferência de movimento reduzido e modo de cores forçadas respeitados. Sem imagens, fontes remotas ou dependências novas.

## Componentes e interação
`components/ui.tsx`: Button, Field, Badge, Message, Modal. Campos nativos com label, required e ajuda quando necessário. Mensagens distinguem erro, sucesso e informação e indicam próximo passo. Cards de slot exibem horário, sala, terapeuta, faixa etária e ocupação/reserva; consulta individual conserva seu estado em grupos. Modal nativo dialog mantém foco, fecha com Escape e devolve foco ao acionador.

Agenda profissional: tabela nativa com dias em colunas e horários locais em linhas, ordenados pelo fuso da clínica. Cabeçalhos de linha/coluna e divisórias delimitam cada célula; horários ausentes mostram “Sem horário”, sem confundir com vaga disponível. Consultas simultâneas são empilhadas na mesma célula. A altura de cada linha é compartilhada pelos sete dias. A partir de 768px, a grade tem largura mínima de 1080px com rolagem interna; no celular, exibe apenas o dia selecionado e a coluna de horários. Cartões têm altura mínima de 340px, ampliável pelo conteúdo, e botões na base; nomes longos quebram sem recorte. Pacientes mantêm a lista de consultas.

Carregamento: texto específico e blocos estáticos; controles desabilitados durante envio. Vazio: orientação contextual. Erro/API: mensagem com repetição da consulta, sem apagar dados do formulário. Sessão expirada: acesso ao login; 403: falta de permissão; 409: conflito com orientação para atualizar. Upload em quarentena nunca apresentado como validado.

Teclado: ordem DOM, links e botões nativos, foco visível, label em todo campo. Preferência de movimento reduzido elimina transições; não há animação contínua. Inspeção visual e axe complementam testes de teclado, sem declaração automática de WCAG integral.
