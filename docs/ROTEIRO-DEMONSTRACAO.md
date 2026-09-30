# ClinicApp · roteiro de demonstração após o pitch

Roteiro para o `ClinicApp-Pitch-Academico.pptx`, especialmente os slides 4–6 e 8. Duração sugerida: **8–10 minutos**, além do pitch. Todos os personagens e dados são fictícios.

Objetivo: mostrar que uma ação do paciente altera a agenda da equipe e que a decisão da equipe volta para o paciente. O roteiro foi conferido com o código, a seed e os registros de validação existentes em 30/09/2026; não houve novo ensaio ao vivo nesta entrega.

## 1. Preparação antes da apresentação

### Primeira preparação da máquina

Requisitos: Node 24 LTS, npm 11 e Docker com Compose e daemon iniciado. Execute na raiz do projeto:

```sh
cd /home/mario/Desktop/Faculdade/ClinicApp
node --version
npm --version
docker compose version
npm ci --ignore-scripts
cp -n .env.example .env
npm run infra:up
npm run db:generate
npm run db:migrate
```

`cp -n` preserva um `.env` existente. Confira localmente se ele aponta para o ambiente demonstrativo esperado, sem projetar seu conteúdo. A infraestrutura inclui PostgreSQL, armazenamento MinIO, Mailpit e ClamAV; prepare-a com antecedência, pois a primeira inicialização pode demorar.

### Preparar uma demonstração limpa

**Atenção: `npm run db:seed` apaga todos os dados do banco local configurado**, incluindo cadastros, alterações do ensaio, sessões e jobs. Use somente o banco fictício destinado à demonstração. Não execute se precisar preservar seu conteúdo.

Com a aplicação parada por Ctrl+C e sem outras conexões ao banco:

```sh
npm run db:seed
npm run dev
```

Mantenha esse terminal aberto. `npm run dev` prepara infraestrutura, Prisma e migrations e inicia API, worker e frontend. Ele não executa a seed. Não é necessário abrir esses três processos manualmente.

Para iniciar novamente **preservando os dados**, basta:

```sh
cd /home/mario/Desktop/Faculdade/ClinicApp
npm run dev
```

Em outro terminal, faça a checagem:

```sh
docker compose ps
curl --fail http://127.0.0.1:3000/api/v1/health/ready
```

Abra [a aplicação](http://localhost:5173). O [Mailpit](http://localhost:58025) é opcional para mostrar mensagens capturadas localmente; não representa entrega de e-mail externo.

### Organizar acessos simultâneos

Use sessões de navegador independentes, todas em `http://localhost:5173`:

| Janela | Conta | Tela preparada |
|---|---|---|
| A · Chrome normal | Paciente | Minhas consultas |
| B · Firefox normal | Terapeuta | Agenda, na semana da consulta escolhida |
| C · janela privada | Recepção | Encaixes |
| D · outro perfil de navegador, se disponível | Administrador | Justificativas |

Abas comuns do mesmo perfil compartilham cookies: não servem para manter usuários diferentes. Janelas privadas do mesmo navegador também podem compartilhar a mesma sessão privada. Com apenas duas sessões, mantenha o paciente em A e use **Sair** em B para alternar terapeuta, recepção e administrador.

Para a banca, duas janelas lado a lado ou alternância por Alt+Tab bastam. Confira o nome do usuário, perfil e clínica no cabeçalho antes de cada ação.

## 2. Contas disponíveis

**Senha inicial de todas as contas abaixo: `ClinicApp!2026`.** É a senha da seed fictícia; uma senha alterada só volta ao padrão após recriar a seed.

| Login | Perfil / clínica | O que demonstrar |
|---|---|---|
| `paciente@example.test` | Beatriz · paciente · Horizonte | Consultas, confirmação, desmarcação, reposição, justificativa e disponibilidade |
| `terapeuta@example.test` | Ana · terapeuta · Horizonte | Agenda profissional, ocupação, grade e registro de presença/falta quando o horário permitir |
| `recepcao@example.test` | Joana · recepção · Horizonte | Aprovar/recusar encaixes e acompanhar a agenda; sem acesso a documentos clínicos |
| `admin@example.test` | Marina · administrador · Horizonte | Analisar justificativas, publicar avisos, parâmetros e pedidos de privacidade |
| `paciente-extra@example.test` | Rafael · paciente · Horizonte | Ocupar, por reposição aprovada, a vaga liberada por Beatriz |
| `admin2@example.test`, `terapeuta2@example.test`, `recepcao2@example.test`, `paciente2@example.test`, `paciente-extra2@example.test` | Mesmos perfis · Clínica Ipê | Comparar o isolamento entre clínicas |
| `ana@example.test` | Terapeuta **e** administrador · Atendimento particular · Ana | Trocar o perfil em “Clínica e perfil ativos” |
| `paciente3@example.test`, `paciente-extra3@example.test`, `recepcao3@example.test` | Pacientes e recepção · Atendimento particular · Ana | Acessos complementares do cenário particular |

Mantenha o fluxo principal na **Clínica Horizonte**. Nomes fictícios se repetem em outras clínicas: identifique a conta pelo e-mail e pelo cabeçalho.

### O que a seed prepara

- Grade diária às **09h, 11h, 14h e 16h**, com duração padrão de 50 minutos.
- Beatriz em horários fixos de 09h; Rafael em horários fixos de 14h.
- 11h com capacidade individual; 16h com capacidade 3. Oferta de grupos para encaixe desativada por padrão.
- Disponibilidade dos pacientes todos os dias, das 08h às 18h.
- Uma falta de ontem para cada paciente principal de clínica, ainda com prazo calculado para justificativa.
- Uma consulta futura da paciente principal com confirmação aberta e outra cancelada mais adiante.

As datas são relativas à execução da seed. Use datas exibidas pela aplicação; não fixe no roteiro uma data de setembro. A consulta cancelada mais distante pode não aparecer no seletor de reposição, que busca origens dos últimos 30 dias até aproximadamente amanhã. Por isso o fluxo abaixo cria seu próprio cancelamento próximo.

## 3. Roteiro principal · 8–10 minutos

### Cena 1 · Agenda de paciente e profissional · 1 minuto

**Fala:** “Vamos acompanhar Beatriz e a equipe da clínica. O que ela fizer aqui será refletido na agenda da equipe.”

1. Em A, entre como `paciente@example.test` e mostre **Minhas consultas**.
2. Localize a consulta futura com status **Pendente**, preparada pela seed. Anote data e horário.
3. Em B, entre como `terapeuta@example.test`. Em **Agenda**, ajuste **Data de referência** para a mesma data, se necessário.
4. Mostre a consulta de Beatriz, sala, faixa etária e ocupação. Explique que o profissional vê a semana e os pacientes; o paciente vê seus próprios atendimentos.

**Conexão com o pitch:** slides 4 e 5. Não prometa demonstrar “Sem horário” com a seed padrão: ela tem os mesmos quatro horários todos os dias.

### Cena 2 · Paciente confirma; terapeuta recebe a mudança · 1 minuto

1. Em A, na consulta pendente, clique em **Ver consulta → Confirmar presença**.
2. Mostre o status **Confirmada**.
3. Volte a B e observe a mesma consulta mudar para **Confirmada**, sem atualizar manualmente a página.

**Fala:** “A equipe passa a saber que Beatriz confirmou. Os acessos consultam o mesmo estado da clínica.”

**Resultado esperado:** o status e o total de confirmadas da agenda são atualizados. Aguarde cerca de 5–10 segundos; a conexão de eventos verifica alterações a cada 5 segundos, além do tempo de rede. Deixe o diálogo da consulta fechado na janela observadora, pois o cartão da agenda recebe os dados atualizados.

### Cena 3 · Paciente desmarca; a equipe vê a vaga liberada · 1 minuto

**Fala:** “Agora vamos simular que Beatriz avisou uma mudança de planos dentro do prazo.”

1. Em A, reabra a mesma consulta em **Ver consulta**.
2. Clique em **Desmarcar consulta**.
3. Leia o aviso: prossiga somente se disser que o aviso está dentro do prazo e não será contabilizado como falta.
4. Clique em **Confirmar desmarcação**.
5. Em B, observe **Cancelada** e a ocupação reduzida naquele horário.

**Resultado esperado:** o cancelamento permanece no histórico; a ocupação individual cai de 1/1 para 0/1. O cartão pode continuar exibindo a consulta cancelada, em vez de apenas “Livre”. A desmarcação pontual não remove os horários fixos das próximas semanas.

Se a janela tiver terminado durante a apresentação, use outra consulta futura com aviso dentro do prazo. Para manter a origem facilmente selecionável, prefira uma consulta próxima ou siga o link **Buscar reposição** no próprio detalhe da consulta cancelada.

### Cena 4 · Reserva e aprovação de reposição · 2–3 minutos

1. Em A, reabra a consulta cancelada e clique em **Buscar reposição**. Isso leva o identificador da consulta automaticamente para **Encaixes**.
2. Mantenha **Tipo de solicitação: Reposição de consulta** e clique em **Buscar nos próximos 7 dias**.
3. Escolha um horário das **11h**, preferencialmente amanhã ou depois de amanhã, e anote a data. Se necessário, use **Ampliar para 14 dias**.
4. Clique uma vez em **Solicitar este horário**. Mostre o pedido **Pendente** em **Acompanhamento**.
5. Em B, mostre o horário escolhido na agenda: a ocupação inclui a **reserva**. Ainda não há uma nova consulta aprovada para Beatriz nesse horário.
6. Em C, como `recepcao@example.test`, abra **Encaixes**. Localize o pedido de Beatriz pelo nome e horário e clique em **Aprovar encaixe**.
7. Volte a A: o pedido passa a **Aprovado**. Clique em **Ver consulta na agenda** e localize a nova consulta.
8. Em B, mostre Beatriz no novo horário, com a reserva convertida em atendimento.

**Fala:** “A escolha segura a vaga durante a análise. A recepção decide e só então nasce o novo atendimento. A decisão também chega ao paciente.”

**Resultado esperado:** a nova consulta fica **Agendada** ou **Pendente**, conforme sua janela de confirmação. **Aprovar o encaixe não confirma a presença do paciente.** Não tente confirmar imediatamente um atendimento cuja janela ainda não abriu. O horário cancelado de 09h continua disponível para outra pessoa.

**Conexão com o pitch:** o ciclo do slide 6 aparece com decisões reais de paciente e recepção. Para mostrar recusa, use outro pedido em um ensaio ou roteiro estendido: informe motivo com ao menos 5 caracteres e clique em **Recusar com motivo**. A reserva é liberada e o paciente vê a orientação.

### Cena 5 · Falta, justificativa e decisão humana · 2 minutos

Use a falta de ontem já criada pela seed, sem esperar que uma consulta termine ao vivo.

1. Em A, abra **Justificativas**, localize a falta e confira o prazo de envio.
2. Clique em **Enviar justificativa**.
3. Selecione **Outro** e escreva: `Justificativa fictícia para demonstração acadêmica.`
4. Na configuração padrão, essa categoria permite envio sem arquivo. Deixe data declarada e documentos vazios e clique em **Enviar para análise**.
5. Em D, entre como `admin@example.test` e abra **Justificativas**. Localize o envio pela descrição.
6. Clique em **Acompanhar documento → Aprovar justificativa**. Se desejar, registre antes uma orientação como `Justificativa aceita neste cenário fictício de demonstração.`
7. Volte a A e mostre a justificativa aprovada. A consulta correspondente passa a falta abonada e pode servir de origem para reposição, respeitados os limites.

**Fala:** “O paciente acompanha a análise. Neste exemplo, a administração decide abonar a falta. A recepção cuida dos encaixes, mas não acessa documentos clínicos.”

No acesso da recepção, o menu **Justificativas** não aparece. O terapeuta padrão de Horizonte não é o avaliador usado neste roteiro; use o administrador para a aprovação.

O roteiro sem arquivo demonstra o fluxo de justificativa. Para demonstrar também um anexo, prepare previamente um PDF ou imagem fictícia, envie-o nessa etapa e aguarde a liberação pelo worker antes de baixar. O tempo de varredura não é garantido; não dependa dele no roteiro curto. A data declarada não comprova validação automática do documento.

### Encerramento · 30 segundos

**Fala:** “Vimos o paciente alterar a agenda da equipe, uma reserva virar atendimento após aprovação e uma justificativa receber decisão. O próximo passo é observar esses fluxos num piloto com dados fictícios e medir as hipóteses apresentadas.”

Se houver só **5 minutos**, faça as cenas 1–4 e encerre. Reserve justificativas e extensões para perguntas.

## 4. Variante: Rafael ocupa exatamente a vaga liberada por Beatriz

Esta variante adiciona cerca de 2–3 minutos e torna o reaproveitamento da vaga especialmente claro. Execute após a cena 3 ou depois da cena 4, enquanto o horário de 09h ainda estiver disponível e houver tempo hábil para confirmação.

1. Anote a **data exata do horário de 09h** cancelado por Beatriz.
2. Em outra sessão independente, ou após sair de A, entre como `paciente-extra@example.test` (Rafael).
3. Abra uma consulta futura de Rafael às **14h**, preferencialmente na mesma data, e desmarque-a dentro do prazo. Confirme o aviso antes de concluir.
4. Reabra essa consulta cancelada e clique em **Buscar reposição → Buscar nos próximos 7 dias**.
5. Localize **09h na data anotada**, a vaga de Beatriz, e clique em **Solicitar este horário**. Rafael não tem consulta às 09h nessa ocorrência e sua disponibilidade padrão inclui esse horário.
6. Na agenda do terapeuta, mostre a reserva às 09h. O registro de Beatriz continua cancelado.
7. Na recepção, aprove o pedido de **Rafael**, conferindo nome e data.
8. Na agenda do terapeuta, mostre Rafael ocupando a vaga e Beatriz com o histórico cancelado. No acesso de Rafael, mostre a nova consulta.

**Fala:** “O aviso de Beatriz abriu uma vaga que Rafael conseguiu usar. O sistema considerou disponibilidade e capacidade, e a equipe aprovou a mudança.”

Se o horário das 09h já estiver perto demais ou ocupado, não force o cenário: repita a variante num ensaio com uma consulta futura desmarcada por Beatriz, e escolha esse mesmo horário para Rafael. Não use a própria conta de Beatriz para ocupar novamente a mesma ocorrência cancelada: o sistema impede duplicar o atendimento que já está no histórico dela.

## 5. Extensões opcionais

| Fluxo | Ação em um acesso | Efeito no outro / limite |
|---|---|---|
| Aviso da clínica · 1 min | Administrador: **Avisos da clínica → Publicar aviso**. Público **Pacientes**, mensagem `Demonstração acadêmica: confira sua agenda.` e término amanhã. **Confirmar publicação** | Paciente, na tela **Avisos da clínica**, recebe o comunicado. Um terapeuta não recebe aviso destinado somente a pacientes |
| Isolamento · 1 min | Após publicar o aviso em Horizonte, entrar como `paciente2@example.test` | Na Clínica Ipê, o aviso de Horizonte não aparece; a agenda pertence à outra clínica |
| Privacidade · 2 min | Paciente: **Privacidade**, tipo **Acesso aos meus dados**, descrição `Pedido fictício para demonstração do acompanhamento.` → **Enviar pedido** | Admin: **Privacidade → Pedidos da clínica → Iniciar análise → Responder pedido**. Registrar resposta demonstrativa com ao menos 10 caracteres. Paciente vê protocolo, estado e resposta; isso não executa exportação/exclusão |
| Atendimento particular · 1 min | Entrar como `ana@example.test` e trocar **Clínica e perfil ativos** | A mesma conta alterna entre terapeuta e administrador do atendimento particular, com menus correspondentes |

Disponibilidade, cadastros, grade, configurações e atendimento avulso também existem. Não os inclua todos no pitch: desviam do fluxo principal. Atendimento avulso exige uma sessão previamente bloqueada e aprovação da recepção; esse estado não vem pronto na seed padrão. Registro de presença/falta exige que a consulta tenha começado. Bloqueios por faltas e decisões clínicas não devem ser improvisados para preencher tempo.

## 6. Checklist do ensaio e recuperação

- [ ] Instalação e download de infraestrutura concluídos antes da aula.
- [ ] Seed renovada somente no banco fictício que pode ser apagado; aplicação iniciada depois dela.
- [ ] Readiness responde com sucesso e frontend abre.
- [ ] Sessões independentes; todos no ambiente/clínica corretos.
- [ ] Consulta pendente com margem suficiente antes do encerramento; data anotada na janela profissional.
- [ ] Falta com prazo de justificativa ainda aberto e categoria Outro sem comprovante obrigatório.
- [ ] Horário individual compatível às 11h identificado para reposição.
- [ ] Ensaio completo feito com esses acessos; se for repetir do início, seed recriada com aplicação parada e novos logins.
- [ ] Janelas observadoras sem diálogo aberto; aguardar 5–10 segundos após cada alteração.

| Situação | Como continuar |
|---|---|
| Outro acesso não mudou | Confira clínica, semana e ocorrência. Feche o diálogo e aguarde. Se necessário, recarregue a página e diga que está consultando o estado atualizado; não apresente isso como atualização automática bem-sucedida |
| Login falha após ensaio | Confira a conta e se a senha foi alterada. A seed recria a senha inicial, mas é destrutiva; não a execute durante a demonstração sem necessidade |
| Confirmação recusada | A janela pode ter terminado ou ainda não aberto. Use a pendente preparada no ensaio; não altere o relógio nem as regras para contornar |
| Nenhuma sugestão | Use 14 dias; confira disponibilidade, idade, mesma terapeuta, prazo de confirmação, limites e reservas já feitas. O horário de grupo às 16h não é ofertado por padrão |
| Consulta cancelada não aparece no seletor | Abra-a em **Minhas consultas → Ver consulta → Buscar reposição** para levar a origem diretamente |
| Falta sem botão de envio | Confira o prazo ou se já houve envio. Use o acompanhamento existente; renove o cenário antes de outro ensaio, com aplicação parada |
| Seed informa banco em uso | Pare API/worker com Ctrl+C e feche clientes conectados ao banco. Não apague volumes Docker |
| Infraestrutura não fica pronta | Consulte `docker compose ps` e `docker compose logs`; resolva antes da apresentação |

Para encerrar, Ctrl+C no terminal de `npm run dev`. Opcionalmente, pare a infraestrutura sem apagar os dados:

```sh
docker compose stop
```

## 7. Limites e referências de conferência

Apresente os efeitos observados no ambiente demonstrativo. O fluxo não mede redução de faltas ou tempo administrativo, não comprova entrega de mensagens externas nem prontidão para dados reais. Reserva não é aprovação, aprovação não é confirmação de presença, e justificativa sem arquivo não demonstra varredura de anexos.

Fontes internas: pitch de dez slides; `README.md`; `package.json`; `backend/src/seed.ts`; `backend/prisma/schema.prisma`; páginas em `frontend/src/pages/`; `frontend/src/main.tsx`; módulos `confirmation`, `fitting`, `absences` e `api/events.controller.ts`; `docs/DECISOES.md`, `docs/RASTREABILIDADE.md` e `docs/ENTREGA.md`. Os registros de 28/09 documentam execução anterior de confirmação, desmarcação, solicitação e aprovação pela interface. Os registros de 21–23/09 documentam validações dos fluxos complementares; não são um novo ensaio deste roteiro.
