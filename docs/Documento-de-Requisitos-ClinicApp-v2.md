**UNIVERSIDADE DE PERNAMBUCO**

**ESCOLA POLITÉCNICA DE PERNAMBUCO**

**GRADUAÇÃO EM ENGENHARIA DA COMPUTAÇÃO**

# DOCUMENTO DE REQUISITOS DE SOFTWARE

**Sistema de Gestão de Clínicas — ClinicApp**

Gestão de Agenda, Confirmação de Presença, Faltas e Reposição Inteligente

Versão 2.0 — consolidada com a Entrega I, a Entrega II,

as Especificações do Projeto e o protótipo executável ClinicApp

**Grupo:**

Guilherme Santos Carrazzoni de Carvalho

José Mário da Silva Filho

Vinícius Moura de Oliveira

**RECIFE**

**2026**

## Sumário

- [1. Introdução](#1-introdução)
- [2. Descrição do problema](#2-descrição-do-problema)
- [3. Justificativa](#3-justificativa)
- [4. Objetivos](#4-objetivos)
- [5. Escopo](#5-escopo)
- [6. Contexto de uso, atores e perfis](#6-contexto-de-uso-atores-e-perfis)
- [7. Glossário](#7-glossário)
- [8. Visão geral da solução](#8-visão-geral-da-solução)
- [9. Requisitos funcionais](#9-requisitos-funcionais)
- [10. Requisitos não funcionais](#10-requisitos-não-funcionais)
- [11. Regras de negócio](#11-regras-de-negócio)
- [12. Modelo de faltas e reputação](#12-modelo-de-faltas-e-reputação)
- [13. Máquinas de estados](#13-máquinas-de-estados)
- [14. Fluxos principais](#14-fluxos-principais)
- [15. Especificação de mensagens ao usuário](#15-especificação-de-mensagens-ao-usuário)
- [16. Considerações éticas e clínicas](#16-considerações-éticas-e-clínicas)
- [17. Restrições, premissas e dependências](#17-restrições-premissas-e-dependências)
- [18. Riscos](#18-riscos)
- [19. Métricas de sucesso](#19-métricas-de-sucesso)
- [20. Rastreabilidade com o protótipo executável](#20-rastreabilidade-com-o-protótipo-executável)
- [21. Roadmap sugerido](#21-roadmap-sugerido)
- [22. Questões em aberto](#22-questões-em-aberto)
- [23. Referências](#23-referências)

## 1. Introdução

### 1.1 Propósito do documento

Este documento especifica os requisitos funcionais, não funcionais e as regras de negócio do Sistema de Gestão de Clínicas (ClinicApp), plataforma web e mobile destinada a reduzir a ociosidade de agenda em clínicas terapêuticas por meio de confirmação ativa de presença, gestão transparente de faltas, justificativa por atestado e reposição inteligente de horários.

A especificação consolida quatro fontes: o Relatório de Planejamento e Análise de Usabilidade (Entrega I), o Relatório Consolidado de Design e Pré-Protótipo (Entrega II), o documento de Especificações do Projeto e o protótipo executável ClinicApp já implementado em React. O documento é o artefato de engenharia de requisitos que dá suporte às decisões de arquitetura e de codificação das próximas iterações.

### 1.2 Público-alvo

Equipe de desenvolvimento, professores avaliadores da disciplina, terapeutas e administradores de clínicas parceiras que participarão das sessões de design participatório e dos testes de usabilidade, e o responsável pelo tratamento de dados pessoais do projeto.

### 1.3 Escopo do produto

O ClinicApp gerencia a grade de horários semanal de terapeutas em clínicas, automatiza a comunicação de confirmação de presença na véspera das consultas, controla o ciclo de faltas e justificativas por atestado, e gera automaticamente sugestões de reposição por cruzamento entre a grade do paciente e a do terapeuta. O sistema atua em três camadas complementares: prevenção, gestão de consequências e recuperação.

### 1.4 O que mudou em relação à versão 1.0

A versão 1.0 deste documento foi elaborada antes do acesso às entregas anteriores e ao protótipo. Ela partia de um modelo de consultas avulsas entre um terapeuta autônomo e seus pacientes. A leitura dos artefatos do grupo revelou um domínio diferente e mais rico. As alterações estruturais estão registradas abaixo para preservar a rastreabilidade das decisões.

| **Versão 1.0 (descartada)** | **Versão 2.0 (esta versão)** |
| --- | --- |
| Apenas dois atores: terapeuta e paciente. | Quatro entidades: Terapeuta, Paciente, Clínica/Administrador e o próprio Sistema como agente proativo. |
| Consultas avulsas, agendadas caso a caso. | Grade de Horário Semanal com slots fixos e recorrentes, que é o modelo real de operação de clínicas terapêuticas. |
| Sem restrições por horário. | Restrições por slot: faixa etária atendida e limite de pacientes simultâneos, o que traz atendimento em grupo para dentro do escopo. |
| Justificativa genérica, analisada pelo terapeuta. | Atestado como artefato central, com pré-validação automática pelo Sistema e aprovação pela Clínica (ou pelo terapeuta, em atendimento particular). |
| Índice de reputação de 0 a 100 como mecanismo punitivo principal. | Contador de faltas não justificadas (regra 3/3, configurável) como regra normativa. O índice de reputação foi rebaixado a camada complementar, não punitiva, usada apenas para ordenar a fila de encaixe. |
| Janela de confirmação de 48h a 12h antes. | Confirmação na véspera, em horário configurável pelo administrador, conforme requisito organizacional da Entrega I. |
| Prazo de justificativa de 48 horas. | Prazo de 3 dias úteis após a falta, configurável globalmente e por paciente. |
| Remarcação inteligente com ranqueamento por pesos. | Encaixe inteligente por cruzamento de grades, com aprovação da recepção, alinhado ao algoritmo já prototipado. |
| Usabilidade tratada como um bloco genérico de requisitos não funcionais. | Requisitos de usabilidade com metas mensuráveis por perfil, sistema de cores semânticas especificado e catálogo de mensagens de erro normatizado. |
| Sem vínculo com implementação. | Capítulo de rastreabilidade que mapeia cada requisito ao que já está implementado no protótipo executável. |

### 1.5 Convenções de identificação

| **Prefixo** | **Significado** |
| --- | --- |
| RF-ADM | Requisito funcional — conta, perfis e administração |
| RF-TER | Requisito funcional — módulo Terapeuta e grade de horários |
| RF-CLI | Requisito funcional — módulo Clínica / Administrador |
| RF-PAC | Requisito funcional — módulo Paciente |
| RF-FAL | Requisito funcional — confirmação, faltas e atestados |
| RF-ENC | Requisito funcional — reposição e encaixe inteligente |
| RF-COM | Requisito funcional — comunicação e alertas |
| RF-NOT | Requisito funcional — notificações |
| RNF | Requisito não funcional |
| RN | Regra de negócio |

**Prioridade (MoSCoW):** M = obrigatório (Must have) · S = importante (Should have) · C = desejável (Could have) · W = fora desta versão (Won't have).

## 2. Descrição do problema

Terapeutas que atuam em clínicas, credenciadas ou não a planos de saúde, operam com uma grade de horários semanal de slots fixos. Cada slot é reservado nominalmente a um paciente, tem duração fechada de cinquenta minutos a uma hora e não pode ser fracionado nem recuperado depois de decorrido.

O problema central é o furo de agenda: o paciente não comparece e não avisa com antecedência suficiente para que o horário seja reaproveitado. Como as sessões têm duração fixa e a relação terapêutica é contínua, um horário vago raramente é preenchido de última hora.

### 2.1 Impactos

**Sobre o terapeuta.** Perda direta de receita, já que o slot reservado não é remunerado nem realocado. Instabilidade financeira severa, dada a variação dos rendimentos mensais. E, sobretudo, sobrecarga administrativa: embora a reposição de horários seja permitida, a responsabilidade pelo reagendamento recai exclusivamente sobre o profissional, porque as clínicas raramente assumem essa gestão. O resultado é um desvio sistemático da função clínica essencial para tarefas de secretaria, frequentemente executadas durante o próprio período de atendimento.

**Sobre o paciente.** A descontinuidade compromete o resultado terapêutico. Além disso, o paciente que falta sem justificar costuma ser desligado sem que exista qualquer registro de contexto: não há distinção documentada entre quem faltou por descuido e quem faltou por intercorrência de saúde, emergência familiar ou agravamento do próprio quadro clínico.

**Sobre a clínica.** Ociosidade de infraestrutura, imprevisibilidade de faturamento e ausência de visão consolidada da ocupação. A gestão é reativa: o problema só é tratado depois de ocorrido.

**Sobre outros pacientes.** Existe demanda reprimida. Enquanto um paciente falta, outro aguarda vaga. O horário desperdiçado é um atendimento que não aconteceu para ninguém.

### 2.2 Limitações da gestão atual

- A maioria das clínicas gerencia agendas por planilhas ou sistemas genéricos, sem automação de confirmação.
- Lembretes são enviados manualmente pelo terapeuta ou pela recepção, por canais informais de mensagem.
- Não há registro estruturado de faltas nem critério objetivo e auditável de reincidência.
- Não há canal formal para o paciente enviar atestado e acompanhar o status da análise, o que gera contatos repetidos à recepção perguntando se o documento foi recebido.
- A reposição depende de cruzamento manual de disponibilidades, tarefa cognitivamente cara e propensa a erro.

Recomenda-se coletar a linha de base real de absenteísmo das clínicas parceiras antes do início da próxima iteração, de modo a permitir a medição posterior do impacto do sistema conforme o capítulo 19.

## 3. Justificativa

**Econômica.** O horário de terapia é um recurso perecível: uma vez decorrido, não pode ser vendido. Cada falta não avisada equivale à perda integral da receita daquele slot. Um sistema que converta parte dessas faltas em cancelamentos antecipados cria a janela necessária para o encaixe, transformando perda total em receita recuperada. Mesmo uma recuperação parcial dos horários tem retorno direto e mensurável.

**Operacional.** Ao automatizar o cruzamento de agendas e a comunicação de confirmação, o sistema elimina as interrupções administrativas durante o período clínico. Esse é o benefício mais citado nas Especificações do Projeto: devolver ao terapeuta o foco na função clínica.

**Clínica.** A adesão ao tratamento é preditora de desfecho terapêutico. A confirmação ativa funciona como microcompromisso: o paciente que confirma explicitamente tem maior probabilidade de comparecer do que aquele que apenas recebe um lembrete passivo. O histórico de faltas também tem valor clínico próprio, sinalizando ao terapeuta possíveis agravamentos ou resistências ao processo.

**De equidade.** O ponto que diferencia esta solução de um simples sistema de lembretes é a distinção formal entre falta injustificada e ausência legítima. Punir indiscriminadamente quem falta penaliza justamente os pacientes em situação mais vulnerável. O canal de atestado separa negligência de impossibilidade e reserva as consequências para o primeiro caso.

**De acesso.** O encaixe inteligente atende pacientes que precisam de reposição e pacientes com disponibilidade flexível. Um slot liberado às dez da manhã para uma sessão das três da tarde pode ser ocupado no mesmo dia. Isso aumenta o número absoluto de atendimentos realizados sem ampliar a jornada do terapeuta.

**De usabilidade.** A opção metodológica por um protótipo executável desde o início, fundamentada na Entrega I com base na ISO 13407 e no Rapid Application Development, permite validar a arquitetura real com usuários, e não apenas a aparência da interface. Isso reduz custo de refatoração, de treinamento e de suporte técnico. Falhas na lógica de cruzamento de agendas detectadas nesta fase custam uma fração do que custaria reescrevê-las em produção.

## 4. Objetivos

### 4.1 Objetivo geral

Reduzir a ociosidade de agenda em clínicas terapêuticas, transformando a gestão de faltas de um processo reativo em um processo proativo e automatizado, por meio de confirmação ativa de presença, controle transparente de faltas e justificativas, e reposição inteligente de horários liberados.

### 4.2 Objetivos específicos

| **ID** | **Objetivo** |
| --- | --- |
| OE-01 | Reduzir a taxa de faltas não comunicadas por meio de confirmação automática na véspera da consulta. |
| OE-02 | Garantir que faltas justificadas dentro do prazo não penalizem o paciente. |
| OE-03 | Automatizar a liberação do horário fixo na grade do terapeuta quando o paciente atinge o limite de faltas não justificadas. |
| OE-04 | Oferecer reposição inteligente cruzando automaticamente a grade do paciente e a do terapeuta para sugerir encaixes disponíveis. |
| OE-05 | Fornecer ao administrador visão consolidada da ocupação da clínica, com status em cores semânticas. |
| OE-06 | Permitir que o terapeuta defina restrições por slot (faixa etária e limite de pacientes) visíveis diretamente na grade. |
| OE-07 | Oferecer rastreamento visual do status do atestado, reduzindo contatos à recepção. |
| OE-08 | Permitir que o terapeuta em atendimento particular alterne entre o perfil profissional e o administrativo sem logoff. |
| OE-09 | Atingir as metas mensuráveis de usabilidade definidas no capítulo 10.1 para cada perfil de usuário. |
| OE-10 | Garantir o tratamento de dados de saúde em conformidade com a LGPD e com o sigilo profissional. |

## 5. Escopo

### 5.1 Dentro do escopo

- Cadastro, autenticação e controle de acesso por papel, com painel unificado de alternância de perfil.
- Grade de Horário Semanal do terapeuta, com edição, restrições por slot e bloqueio de horários.
- Grade de horários e disponibilidade declarada do paciente.
- Fluxo de confirmação de presença na véspera, com resposta processada em tempo real.
- Ciclo completo de falta: registro pelo terapeuta, contador por paciente, liberação automática do horário fixo ao atingir o limite.
- Envio de atestado pelo paciente, pré-validação automática pelo Sistema, análise e decisão pela Clínica, com rastreamento visual de status.
- Encaixe inteligente por cruzamento de grades, com solicitação do paciente e aprovação da recepção.
- Comunicação direta entre terapeuta e paciente e envio de alertas gerais pela clínica.
- Dashboard consolidado de ocupação com cores semânticas e indicadores de absenteísmo.
- Notificações multicanal e registro de auditoria dos eventos relevantes.
- Interface responsiva adaptativa: grade semanal em desktop e linha do tempo diária com abas em mobile.

### 5.2 Fora do escopo desta versão

| **Item excluído** | **Justificativa** |
| --- | --- |
| Prontuário eletrônico e registro de evolução clínica | Domínio distinto, com exigências regulatórias próprias. Integração prevista para versão futura. |
| Teleconsulta com videochamada integrada | Aumento significativo de complexidade e custo de infraestrutura. Prevista integração com plataformas de terceiros. |
| Processamento de pagamentos e emissão fiscal | Postergado. Esta versão apenas registra a política de cobrança acordada. |
| Validação automática de autenticidade do atestado | Não há infraestrutura pública consolidada de verificação. O Sistema pré-valida apenas coerência de datas; a decisão de mérito permanece humana. |
| Faturamento e glosas de planos de saúde | Domínio de complexidade elevada e regras específicas por operadora. |
| Marketplace de busca de terapeutas | O sistema atende relações terapêuticas já estabelecidas dentro de uma clínica. |
| Inferência clínica automatizada sobre motivos de falta | Risco ético elevado. Qualquer interpretação clínica cabe exclusivamente ao profissional. |

## 6. Contexto de uso, atores e perfis

O sistema opera em ambiente clínico terapêutico, caracterizado por alta sensibilidade emocional dos usuários, regras operacionais rígidas e perfis de acesso com necessidades radicalmente distintas. Foram identificadas quatro entidades, sendo uma delas o próprio Sistema, que atua de forma proativa.

### 6.1 Entidades do domínio

| **Entidade** | **Responsabilidades no sistema** |
| --- | --- |
| Terapeuta | Possui e edita ativamente a própria Grade de Horário Semanal. Define restrições por slot (faixa etária e limite de pacientes). Pode alocar paciente em horário incompatível com as restrições, mediante confirmação explícita de exceção. Registra o comparecimento e lança faltas. Recebe atestados e confirma solicitações de reposição. Comunica-se com o paciente. Em atendimento particular, acumula o papel de Clínica. |
| Paciente | Possui grade de horários atrelada às suas sessões, que podem estar ativas ou bloqueadas. Confirma ou cancela presença a partir da notificação da véspera. Envia atestado para justificar ausências. Escolhe horário de reposição dentro da grade livre do terapeuta. Comunica-se com o terapeuta. |
| Clínica / Administrador | Entidade não essencial: pode ser o próprio terapeuta em atendimento particular. Aprova atestados. Gerencia parâmetros de limite de faltas e prazos de justificativa, global e individualmente. Envia alertas gerais a terapeutas e pacientes. Pode solicitar mudanças na grade do terapeuta. Visualiza a ocupação consolidada. |
| Sistema | Agente proativo. Gera alertas de confirmação na véspera. Realiza o cruzamento de grades para sugerir encaixes. Pré-valida atestados quanto à coerência de datas. Bloqueia a sessão e libera o horário fixo do paciente ao atingir o limite de faltas não justificadas. Fornece feedback contínuo da interface e previne erros irreversíveis. |

### 6.2 Perfis de usabilidade e prioridade de design

A distinção entre categorias de usuários é a base das decisões de interface. O sistema apresenta dois perfis opostos no espectro de experiência e um terceiro intermediário.

| **Categoria** | **Características** | **Prioridade de design** |
| --- | --- | --- |
| Novato / intermitente (Paciente) | Acessa o sistema raramente, em geral apenas na véspera da consulta. Não retém modelo mental entre acessos. Contexto emocional sensível. | Learnability: tarefa concluída em até 2 minutos, sem treinamento. Linguagem acolhedora. Telas mínimas com ação única e clara. Todos os dados da consulta visíveis na mesma tela da ação. |
| Frequente / experiente (Administrador) | Opera o sistema diariamente. Executa tarefas repetitivas. Alta demanda por velocidade operacional. | Eficiência: operações rotineiras em até 3 minutos. Atalhos. Dashboard consolidado. Cores semânticas para decisão rápida sem leitura item a item. |
| Frequente / técnico (Terapeuta) | Usa regularmente para consultar a agenda e lançar faltas. Pode acumular o perfil administrativo em atendimento particular. | Visibilidade de status em tempo real. Restrições visíveis inline nos cards da grade, sem submenus. Alternância de perfil sem logoff. |

## 7. Glossário

| **Termo** | **Definição** |
| --- | --- |
| Grade de Horário Semanal | Estrutura recorrente de slots de atendimento de um terapeuta, organizada por dia da semana e faixa horária. |
| Slot | Bloco de horário da grade. Pode estar confirmado, pendente, cancelado, vago ou bloqueado. |
| Horário fixo | Slot recorrente reservado nominalmente a um paciente enquanto sua sessão estiver ativa. |
| Sessão do paciente | Vínculo do paciente com seu horário fixo. Pode estar ativa ou bloqueada. |
| Restrição de slot | Condição definida pelo terapeuta para um horário: faixa etária atendida e limite de pacientes simultâneos. |
| Furo de agenda | Horário reservado que fica ocioso porque o paciente faltou sem comunicar previamente. |
| Confirmação | Ato explícito do paciente declarando que comparecerá, em resposta à notificação enviada na véspera. |
| Cancelamento antecipado | Comunicação de ausência feita até o encerramento da janela de confirmação. Não é contabilizada como falta. |
| Falta não justificada | Ausência sem cancelamento antecipado e sem atestado aprovado dentro do prazo. |
| Atestado | Documento enviado pelo paciente para justificar uma ausência. Pode ser atestado médico, declaração de comparecimento, boletim de ocorrência ou comprovante equivalente. |
| Abono | Efeito da aprovação do atestado: a falta deixa de ser contabilizada no contador. |
| Contador de faltas | Número de faltas não justificadas acumuladas por um paciente na janela de avaliação vigente. |
| Bloqueio de sessão | Consequência de atingir o limite de faltas: o horário fixo é liberado na grade e o paciente passa a depender de aprovação para novo agendamento. |
| Reposição | Sessão remarcada em substituição a uma ausência. |
| Encaixe inteligente | Sugestão de horário de reposição gerada pelo cruzamento automático entre a grade livre do terapeuta e a disponibilidade declarada do paciente. |
| Pool de encaixe | Conjunto de pacientes que sinalizaram disponibilidade para ocupar slots liberados em cima da hora. |
| Índice de reputação | Indicador interno, de 0 a 100, do histórico recente de comparecimento. Usado apenas para ordenar a fila de encaixe. |
| Janela de avaliação | Período retroativo considerado no contador e no índice. Padrão: 180 dias. |
| Painel unificado | Recurso que permite ao terapeuta em atendimento particular alternar entre o perfil profissional e o administrativo sem logoff. |

## 8. Visão geral da solução

### 8.1 Módulos funcionais

| **Módulo** | **Responsabilidade** |
| --- | --- |
| Identidade e Perfis | Autenticação, papéis, permissões e alternância de perfil no painel unificado. |
| Grade e Agenda | Grade semanal do terapeuta, restrições por slot, exceções, bloqueios e visão consolidada da clínica. |
| Confirmação | Abertura da janela na véspera, disparo de lembretes, registro da resposta e atualização em tempo real da grade. |
| Faltas e Atestados | Registro de falta, contador por paciente, envio e pré-validação de atestado, fila de análise e decisão. |
| Encaixe | Cruzamento de grades, geração e ordenação de sugestões, solicitação do paciente e aprovação da recepção. |
| Reputação | Cálculo do índice, histórico de eventos e ordenação da fila de encaixe. |
| Comunicação | Mensagens diretas entre terapeuta e paciente e alertas gerais da clínica. |
| Notificação | Entrega multicanal, política de reenvio, janela de silêncio e histórico. |
| Auditoria | Registro imutável de alterações de status, decisões sobre atestados e acessos a documentos. |

### 8.2 Entidades de dados principais

| **Entidade** | **Atributos essenciais** |
| --- | --- |
| Usuario | id, nome, e-mail, telefone, papel, status, consentimentos, data de criação |
| Clinica | id, nome, CNPJ, parâmetros padrão de falta e prazo, indicador de modo particular |
| Terapeuta | id, usuario_id, clinica_id, registro profissional, especialidades, indicador de perfil administrativo acumulado |
| Paciente | id, usuario_id, clinica_id, data de nascimento, disponibilidade declarada, indicador de participação no pool de encaixe, status da sessão |
| SlotGrade | id, terapeuta_id, dia da semana, hora início, duração, faixa etária permitida, limite de pacientes, status |
| Consulta | id, slot_id, terapeuta_id, paciente_id, data, status, origem (fixa, reposição, encaixe) |
| Confirmacao | id, consulta_id, data e hora, canal, autor (paciente ou terapeuta) |
| Falta | id, consulta_id, paciente_id, data de registro, indicador de abono, atestado_id |
| Atestado | id, falta_id, paciente_id, categoria, descrição, anexo_id, resultado da pré-validação, status, avaliador_id, motivo da decisão |
| Anexo | id, hash, referência de armazenamento cifrado, tipo MIME, data de expurgo |
| SolicitacaoEncaixe | id, paciente_id, slot_id pretendido, status, data de solicitação, avaliador_id |
| EventoReputacao | id, paciente_id, consulta_id, tipo, delta, saldo resultante, data e hora |
| Mensagem | id, remetente_id, destinatario_id, conteúdo, data e hora, indicador de leitura |
| AlertaGeral | id, clinica_id, público-alvo, conteúdo, período de exibição |
| LogAuditoria | id, ator_id, ação, entidade, valor anterior, valor novo, data e hora, endereço de origem |

## 9. Requisitos funcionais

### 9.1 Conta, perfis e administração

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-ADM-01 | O sistema deve permitir o cadastro de terapeuta com nome, e-mail, telefone, número de registro no conselho profissional e senha. | M |
| RF-ADM-02 | O sistema deve permitir o cadastro de paciente pela clínica, pelo terapeuta ou por autocadastro mediante convite. | M |
| RF-ADM-03 | O sistema deve autenticar usuários por e-mail e senha, com recuperação por token de uso único e expiração. | M |
| RF-ADM-04 | O sistema deve implementar controle de acesso por papel: paciente, terapeuta, administrador de clínica e administrador do sistema. | M |
| RF-ADM-05 | O sistema deve permitir que um terapeuta em atendimento particular acumule o perfil administrativo e alterne entre os dois por meio de painel unificado, sem logoff e sem nova autenticação. | M |
| RF-ADM-06 | O sistema deve deixar visível, em todo momento, qual perfil está ativo quando houver acúmulo de papéis, evitando que o usuário execute uma ação administrativa acreditando estar no perfil clínico. | M |
| RF-ADM-07 | O sistema deve permitir que a clínica vincule e desvincule terapeutas e pacientes. | M |
| RF-ADM-08 | O sistema deve registrar, de forma versionada e com data e hora, o aceite dos termos de uso, da política de privacidade e do consentimento para tratamento de dados de saúde. | M |
| RF-ADM-09 | O sistema deve permitir que o titular solicite exportação e exclusão de seus dados pessoais. | M |
| RF-ADM-10 | O sistema deve oferecer autenticação em duas etapas para os perfis de terapeuta e administrador. | S |
| RF-ADM-11 | O sistema deve permitir a criação de perfil de recepção com acesso à agenda e sem acesso ao conteúdo clínico das justificativas. | S |
| RF-ADM-12 | O sistema deve registrar em log de auditoria toda alteração de status de consulta, decisão sobre atestado, alteração de parâmetros de falta e acesso a documento anexado. | M |

### 9.2 Módulo Terapeuta — grade de horários

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-TER-01 | O sistema deve permitir que o terapeuta visualize e edite sua própria Grade de Horário Semanal. | M |
| RF-TER-02 | O sistema deve permitir que o terapeuta defina, por slot, a faixa etária atendida e o limite de pacientes simultâneos. | M |
| RF-TER-03 | O sistema deve exibir as restrições de cada slot diretamente no card da grade, por meio de ícones e contadores inline (por exemplo, indicador de atendimento infantil e contador de ocupação no formato 2/3), sem exigir abertura de submenu. | M |
| RF-TER-04 | O sistema deve permitir que o terapeuta bloqueie horários e registre exceções à grade, como férias e feriados. | M |
| RF-TER-05 | O sistema deve exibir cada slot com status visual distinto: confirmado, pendente, cancelado, vago ou bloqueado. | M |
| RF-TER-06 | O sistema deve permitir que o terapeuta aloque um paciente em slot incompatível com as restrições definidas, mediante confirmação explícita de exceção, registrando a decisão em auditoria. | M |
| RF-TER-07 | O sistema deve permitir que o terapeuta registre o desfecho da sessão como realizada ou falta, diretamente no slot da grade. | M |
| RF-TER-08 | O sistema deve exibir ao terapeuta apenas a agenda dos seus próprios atendimentos, salvo quando acumular o perfil administrativo. | M |
| RF-TER-09 | O sistema deve destacar visualmente os slots ainda não confirmados cuja janela de confirmação esteja próxima do encerramento. | S |
| RF-TER-10 | O sistema deve permitir que o terapeuta confirme ou recuse solicitações de reposição feitas pelo paciente. | M |
| RF-TER-11 | O sistema deve permitir que o terapeuta consulte o histórico de faltas e o contador atual de cada paciente sob seu atendimento. | M |
| RF-TER-12 | O sistema deve apresentar a grade em formato de tabela semanal em telas grandes e em linha do tempo diária vertical, com abas horizontais de navegação por dia, em telas de smartphone. | M |
| RF-TER-13 | O sistema deve permitir a sincronização da grade com calendários externos. | C |

### 9.3 Módulo Clínica / Administrador

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-CLI-01 | O sistema deve apresentar dashboard consolidado da ocupação de todos os terapeutas da clínica, com status em cores semânticas. | M |
| RF-CLI-02 | O sistema deve permitir que o administrador configure globalmente o limite de faltas não justificadas e o prazo de envio de atestado. | M |
| RF-CLI-03 | O sistema deve permitir a configuração individual desses parâmetros por paciente, sobrepondo o valor global. | M |
| RF-CLI-04 | O sistema deve permitir que o administrador configure o horário de disparo da notificação de confirmação da véspera. | M |
| RF-CLI-05 | O sistema deve apresentar ao administrador a fila de atestados pendentes de análise, ordenada por data de envio. | M |
| RF-CLI-06 | O sistema deve permitir que o administrador aprove ou rejeite atestados, exigindo motivo no caso de rejeição. | M |
| RF-CLI-07 | O sistema deve permitir que o administrador aprove ou rejeite solicitações de encaixe feitas pelos pacientes. | M |
| RF-CLI-08 | O sistema deve permitir que a clínica envie alertas gerais a terapeutas, a pacientes ou a ambos, com período de exibição definido. | M |
| RF-CLI-09 | O sistema deve permitir que a clínica solicite mudanças na Grade de Horário Semanal de um terapeuta, sujeitas à aceitação do profissional. | S |
| RF-CLI-10 | O sistema deve permitir que o administrador libere manualmente um horário fixo e reative uma sessão bloqueada. | M |
| RF-CLI-11 | O sistema deve apresentar indicadores agregados de absenteísmo: taxa de comparecimento, taxa de falta não justificada, slots ociosos e taxa de reocupação. | S |
| RF-CLI-12 | O sistema deve permitir a exportação de relatórios de ocupação e absenteísmo. | C |

### 9.4 Módulo Paciente

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-PAC-01 | O sistema deve exibir ao paciente suas consultas futuras com data, horário, terapeuta e sala. | M |
| RF-PAC-02 | O sistema deve exibir todos os dados da consulta na mesma tela em que se encontra o botão de confirmação, sem exigir navegação para buscá-los. | M |
| RF-PAC-03 | O sistema deve permitir que o paciente confirme presença a partir da notificação recebida na véspera, com o mínimo de interações. | M |
| RF-PAC-04 | O sistema deve permitir que o paciente cancele antecipadamente a presença, exibindo previamente e de forma explícita que a ausência comunicada no prazo não será contabilizada como falta. | M |
| RF-PAC-05 | O sistema deve permitir que o paciente envie atestado para justificar uma falta registrada, dentro do prazo estabelecido. | M |
| RF-PAC-06 | O sistema deve aceitar anexos em PDF, JPG, PNG e HEIC, com limite de 10 MB por arquivo e até 3 arquivos por atestado. | M |
| RF-PAC-07 | O sistema deve permitir a captura do documento pela câmera do dispositivo. | S |
| RF-PAC-08 | O sistema deve exibir o status do atestado por meio de rastreamento visual em cores semânticas: enviado, em análise, aprovado ou rejeitado. | M |
| RF-PAC-09 | O sistema deve exibir ao paciente seu contador atual de faltas não justificadas em relação ao limite vigente, no formato de progresso. | M |
| RF-PAC-10 | O sistema deve permitir que o paciente declare sua disponibilidade de horários para fins de cruzamento de agenda. | M |
| RF-PAC-11 | O sistema deve permitir que o paciente solicite reposição e escolha um horário entre os encaixes sugeridos. | M |
| RF-PAC-12 | O sistema deve exibir ao paciente o status da solicitação de encaixe: pendente, aprovada ou recusada, com orientação de próximo passo em caso de recusa. | M |
| RF-PAC-13 | O sistema deve permitir que o paciente ative ou desative sua participação no pool de encaixe. | S |
| RF-PAC-14 | O sistema deve permitir que o paciente conteste uma rejeição de atestado uma única vez por ocorrência. | S |
| RF-PAC-15 | O sistema deve permitir que o paciente configure canais e antecedência dos lembretes, respeitando os limites definidos pela clínica. | C |

### 9.5 Confirmação, faltas e atestados

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-FAL-01 | O sistema deve abrir automaticamente a janela de confirmação na véspera de cada consulta, em horário configurável, alterando o status do slot para pendente. | M |
| RF-FAL-02 | O sistema deve processar a resposta do paciente em tempo real, atualizando imediatamente a grade do terapeuta. | M |
| RF-FAL-03 | O sistema deve encerrar a janela de confirmação no horário configurado e sinalizar ao terapeuta os slots que permaneceram pendentes. | M |
| RF-FAL-04 | O sistema não deve contabilizar como falta a ausência comunicada antecipadamente pelo paciente dentro da janela. | M |
| RF-FAL-05 | O sistema deve incrementar o contador de faltas não justificadas do paciente quando o terapeuta registrar a falta e não houver atestado aprovado dentro do prazo. | M |
| RF-FAL-06 | O sistema deve classificar automaticamente como não justificada a falta cujo prazo de envio de atestado tenha expirado. | M |
| RF-FAL-07 | O sistema deve liberar automaticamente o horário fixo do paciente na grade do terapeuta e bloquear sua sessão ao atingir o limite de faltas não justificadas. | M |
| RF-FAL-08 | O sistema deve notificar previamente o paciente e o terapeuta quando o contador atingir a penúltima falta antes do limite. | M |
| RF-FAL-09 | O sistema deve pré-validar automaticamente o atestado antes de encaminhá-lo à análise humana, verificando no mínimo se a data do documento coincide com a data da falta, e apresentar o resultado dessa verificação ao avaliador. | M |
| RF-FAL-10 | O sistema não deve rejeitar automaticamente um atestado com base na pré-validação; o resultado é apresentado como alerta informativo ao avaliador humano. | M |
| RF-FAL-11 | O sistema deve abonar a falta e decrementar o contador quando o atestado for aprovado. | M |
| RF-FAL-12 | O sistema deve permitir que o avaliador solicite informação complementar ao paciente, mantendo o atestado em análise. | S |
| RF-FAL-13 | O sistema deve notificar o paciente sobre o resultado da análise, incluindo o motivo em caso de rejeição. | M |
| RF-FAL-14 | O sistema deve exigir confirmação humana explícita antes de liberar o horário fixo por atingimento do limite, apresentando na mesma tela a opção de suspender a consequência. | M |

### 9.6 Reposição e encaixe inteligente

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-ENC-01 | O sistema deve marcar como disponível para reposição todo slot liberado por cancelamento antecipado, falta abonada ou liberação de horário fixo. | M |
| RF-ENC-02 | O sistema deve gerar sugestões de encaixe cruzando automaticamente a grade livre do terapeuta com a disponibilidade declarada do paciente. | M |
| RF-ENC-03 | O sistema deve respeitar as restrições do slot (faixa etária e limite de pacientes) ao gerar sugestões, descartando os horários incompatíveis. | M |
| RF-ENC-04 | O sistema deve destacar entre as sugestões o slot mais próximo da data original. | M |
| RF-ENC-05 | O sistema deve exibir estado de carregamento com texto descritivo durante o processamento do cruzamento de agendas, desabilitando o botão de ação para impedir duplo clique. | M |
| RF-ENC-06 | O sistema deve registrar a escolha do paciente como solicitação de encaixe pendente de aprovação pela recepção ou pelo terapeuta. | M |
| RF-ENC-07 | O sistema deve reservar transacionalmente o slot durante a análise da solicitação, impedindo que dois pacientes ocupem o mesmo horário. | M |
| RF-ENC-08 | O sistema deve oferecer slots liberados em cima da hora aos pacientes do pool de encaixe, em ordem de prioridade e com prazo de resposta configurável. | S |
| RF-ENC-09 | O sistema deve permitir ampliar o intervalo de busca quando nenhuma sugestão for encontrada no período padrão. | M |
| RF-ENC-10 | O sistema deve limitar a quantidade de reposições por paciente e por período, conforme parametrização da clínica. | S |
| RF-ENC-11 | O sistema deve manter lista de espera por terapeuta, com notificação automática quando surgir vaga compatível. | C |

### 9.7 Comunicação, alertas e notificações

| **ID** | **Requisito** | **Prior.** |
| --- | --- | --- |
| RF-COM-01 | O sistema deve permitir troca de mensagens diretas entre terapeuta e paciente, com histórico preservado. | S |
| RF-COM-02 | O sistema deve permitir que a clínica publique alertas gerais visíveis a terapeutas, pacientes ou ambos. | M |
| RF-COM-03 | O sistema não deve permitir o envio de conteúdo clínico sensível pelo canal de mensagens sem aviso prévio sobre o registro da conversa. | S |
| RF-NOT-01 | O sistema deve enviar notificações por push e e-mail e, quando configurado, por SMS ou canal de mensageria. | M |
| RF-NOT-02 | O sistema deve notificar o paciente sobre: abertura da janela de confirmação, resultado da análise do atestado, aproximação e atingimento do limite de faltas, resultado da solicitação de encaixe e alterações na agenda. | M |
| RF-NOT-03 | O sistema deve notificar o terapeuta sobre: confirmações e cancelamentos recebidos, slots que permaneceram pendentes, atestados enviados e solicitações de reposição. | M |
| RF-NOT-04 | O conteúdo das notificações não deve expor informação clínica, limitando-se a dados de agendamento. | M |
| RF-NOT-05 | O sistema deve implementar reenvio com repetição exponencial em caso de falha de entrega e registrar o resultado de cada tentativa. | S |
| RF-NOT-06 | O sistema deve respeitar janela de silêncio noturno configurável, postergando notificações não urgentes. | S |
| RF-NOT-07 | O sistema deve manter histórico das notificações enviadas, com status de entrega. | S |

## 10. Requisitos não funcionais

### 10.1 Usabilidade — metas mensuráveis

As metas abaixo derivam diretamente dos requisitos de usabilidade das Entregas I e II e serão validadas empiricamente nos testes com o protótipo executável.

| **ID** | **Requisito** | **Meta** |
| --- | --- | --- |
| RNF-01 | Aprendizado, perfil Paciente: um novo paciente deve concluir a confirmação de uma consulta e o envio de um atestado na primeira utilização, sem treinamento e sem ajuda externa. | Até 2 min por tarefa; zero erros irrecuperáveis |
| RNF-02 | Eficiência, perfil Administrador: o administrador deve visualizar a agenda do dia, registrar uma justificativa e verificar sugestões de reposição sem sair da tela principal. | Menos de 3 min no total |
| RNF-03 | Eficácia: taxa de conclusão das tarefas críticas sem assistência externa. | Mínimo de 90% |
| RNF-04 | Satisfação medida por questionário pós-teste padronizado. | Escore SUS acima de 70; satisfação acima de 80% |
| RNF-05 | Taxa de erros de navegação nas tarefas críticas. | Abaixo de 15%; zero erros irrecuperáveis |
| RNF-06 | Feedback: toda ação do usuário deve gerar resposta visual do sistema. | Menos de 2 s |
| RNF-07 | Operações mais longas devem exibir indicador de progresso com texto descritivo do que está sendo processado. | Loading state acima de 3 s |
| RNF-08 | Confirmação de presença a partir da notificação. | No máximo 2 toques |

### 10.2 Consistência, padrões e cores semânticas

A interface será construída a partir de uma biblioteca centralizada de componentes reutilizáveis, garantindo que ações semelhantes tenham sempre o mesmo visual e comportamento e que atualizações de design se propaguem automaticamente a todas as telas.

| **ID** | **Requisito** |
| --- | --- |
| RNF-09 | Toda a interface deve ser construída sobre biblioteca única de componentes: botões, cards de slot, modais, badges de status e mensagens. |
| RNF-10 | O sistema deve adotar um sistema de cores semânticas consistente em todas as telas e perfis, conforme a tabela 10.3. |
| RNF-11 | O estado do sistema deve ser interpretável por um único olhar, sem necessidade de leitura do texto de cada item. |
| RNF-12 | A cor não pode ser o único portador de significado: todo status deve ser acompanhado de rótulo textual ou ícone, atendendo a usuários com deficiência de visão de cores. |
| RNF-13 | Em nenhum momento o usuário deve precisar reter uma informação de uma tela para aplicá-la em outra. |
| RNF-14 | Ações irreversíveis devem exigir confirmação explícita, descrevendo exatamente o que acontecerá e quais serão as consequências. |

### 10.3 Sistema de cores semânticas

| **Status** | **Aplicação** | **Fundo** | **Texto / borda** |
| --- | --- | --- | --- |
| Verde — confirmado / aprovado | Slots confirmados, botões de confirmação, mensagens de sucesso, atestados aprovados. | \#E6F4ED | \#1A7A4A |
| Amarelo — pendente / em análise | Slots pendentes de confirmação, atestados em análise, alerta de aproximação do limite de faltas. | \#FFF8E1 | \#8A6800 |
| Vermelho — cancelado / rejeitado / limite | Slots cancelados, atestados rejeitados, paciente no limite de faltas, mensagens de erro. | \#FDECEB | \#B53A2F |
| Azul — enviado / informativo | Atestados recém-enviados, notificações neutras, links de ação. | \#E8EFF8 | \#1F4E79 |
| Cinza — vago / bloqueado | Horários livres sem paciente e horários bloqueados pelo terapeuta. | \#F8F7F4 | \#CCCCCC |

### 10.4 Responsividade e acessibilidade

| **ID** | **Requisito** |
| --- | --- |
| RNF-15 | A grade de horários deve adotar layout adaptativo: tabela semanal completa em desktop e tablet; linha do tempo diária vertical com abas horizontais de navegação por dia em smartphone. |
| RNF-16 | A interface deve funcionar plenamente em telas a partir de 320 pixels de largura. |
| RNF-17 | A interface deve atender ao WCAG 2.1 nível AA: contraste mínimo, navegação por teclado, rótulos para leitores de tela e área de toque adequada. |
| RNF-18 | A interface do paciente deve adotar linguagem simples, acolhedora e não estigmatizante, evitando termos punitivos. |
| RNF-19 | O idioma padrão é o português brasileiro, com arquitetura preparada para internacionalização. |

### 10.5 Desempenho e escalabilidade

| **ID** | **Requisito** | **Métrica** |
| --- | --- | --- |
| RNF-20 | Tempo de resposta das operações interativas de leitura. | p95 ≤ 500 ms |
| RNF-21 | Carga inicial da grade semanal em conexão móvel. | ≤ 2 s em 4G |
| RNF-22 | Processamento síncrono da confirmação de presença. | p95 ≤ 800 ms |
| RNF-23 | Processamento do cruzamento de agendas para geração de encaixe. | p95 ≤ 3 s |
| RNF-24 | Carga suportada sem degradação perceptível. | 200 clínicas; 2.000 terapeutas; 50.000 pacientes |
| RNF-25 | O disparo em lote das notificações da véspera deve ser assíncrono, sem impacto na latência das operações interativas. | — |
| RNF-26 | A camada de aplicação deve escalar horizontalmente sem indisponibilidade. | — |

### 10.6 Disponibilidade e confiabilidade

| **ID** | **Requisito** | **Métrica** |
| --- | --- | --- |
| RNF-27 | Disponibilidade mensal do serviço. | ≥ 99,5% |
| RNF-28 | Backup automatizado com teste periódico de restauração. | Diário; retenção 30 dias |
| RNF-29 | Objetivos de recuperação em caso de desastre. | RPO ≤ 1 h; RTO ≤ 4 h |
| RNF-30 | O envio de notificações deve ser idempotente, sem duplicidade em reprocessamento. | — |
| RNF-31 | Falha em serviço externo de notificação não pode impedir o funcionamento das demais funções (degradação graciosa). | — |

### 10.7 Segurança

| **ID** | **Requisito** |
| --- | --- |
| RNF-32 | Todo tráfego deve ocorrer sob TLS 1.3 ou superior, com HSTS habilitado. |
| RNF-33 | Senhas devem ser armazenadas com função de derivação resistente a força bruta (Argon2id ou bcrypt com custo adequado). |
| RNF-34 | Atestados e demais dados sensíveis em repouso devem ser cifrados com AES-256, com chaves geridas por serviço dedicado. |
| RNF-35 | Documentos anexados devem ser armazenados fora do diretório público e acessíveis apenas por URL assinada com expiração inferior a cinco minutos. |
| RNF-36 | O sistema deve aplicar limitação de taxa por endereço e por conta nos endpoints de autenticação, confirmação e envio de anexos. |
| RNF-37 | Arquivos enviados devem passar por validação de tipo real, verificação antimalware e remoção de metadados de imagem. |
| RNF-38 | Todo acesso ao conteúdo de um atestado deve ser registrado em auditoria, com identificação do ator, data, hora e origem. |
| RNF-39 | Logs de aplicação não devem conter dados pessoais sensíveis nem conteúdo de atestados. |
| RNF-40 | O sistema deve estar protegido contra as categorias do OWASP Top 10, com verificação automatizada no pipeline de integração contínua. |

### 10.8 Privacidade e conformidade legal

| **ID** | **Requisito** |
| --- | --- |
| RNF-41 | O tratamento de dados deve observar a Lei nº 13.709/2018 (LGPD). Atestados constituem dado pessoal sensível referente à saúde, nos termos do artigo 5º, inciso II, e exigem base legal específica conforme o artigo 11. |
| RNF-42 | O sistema deve aplicar minimização de dados, coletando apenas o necessário à finalidade declarada de gestão de agenda e de faltas. |
| RNF-43 | Atestados devem ter prazo máximo de retenção definido, com sugestão de 180 dias após a decisão e expurgo automatizado, permanecendo apenas o metadado da decisão. |
| RNF-44 | O sistema deve suportar os direitos do titular: acesso, correção, portabilidade, revogação de consentimento e eliminação, com atendimento em até 15 dias. |
| RNF-45 | Deve ser mantido registro das operações de tratamento e elaborado relatório de impacto à proteção de dados antes da entrada em produção. |
| RNF-46 | O sistema deve implementar isolamento lógico de dados entre clínicas. |
| RNF-47 | O sistema deve observar as normas do Conselho Federal de Psicologia e demais conselhos aplicáveis quanto ao sigilo profissional. O perfil de recepção não deve ter acesso ao conteúdo clínico dos atestados. |

### 10.9 Manutenibilidade e observabilidade

| **ID** | **Requisito** |
| --- | --- |
| RNF-48 | Limite de faltas, prazo de justificativa, horário de disparo da confirmação, pesos de reputação e prazos de encaixe devem ser parâmetros de configuração, nunca valores fixos em código. |
| RNF-49 | A cobertura de testes automatizados deve ser de no mínimo 80% nos módulos de faltas, confirmação e encaixe. |
| RNF-50 | A API deve seguir padrão REST com versionamento por caminho e documentação OpenAPI mantida atualizada. |
| RNF-51 | O sistema deve emitir logs estruturados, métricas e rastreamento distribuído, com painéis de observabilidade e alertas. |
| RNF-52 | O deploy deve ser automatizado, com capacidade de reversão em até 15 minutos. |
| RNF-53 | As aplicações cliente devem suportar as duas últimas versões principais dos navegadores Chrome, Firefox, Safari e Edge; o app móvel deve suportar Android 10 ou superior e iOS 15 ou superior. |

## 11. Regras de negócio

### 11.1 Grade, slots e restrições

| **ID** | **Regra** |
| --- | --- |
| RN-01 | A grade de horários é semanal e recorrente. Um paciente com sessão ativa ocupa um horário fixo, que se repete até que a sessão seja encerrada ou bloqueada. |
| RN-02 | Cada slot pode assumir exatamente um dos seguintes estados: confirmado, pendente, cancelado, vago ou bloqueado. |
| RN-03 | O terapeuta pode definir, por slot, a faixa etária atendida e o limite de pacientes simultâneos. O limite maior que um caracteriza atendimento em grupo. |
| RN-04 | Um slot cujo limite de pacientes esteja atingido não é elegível para encaixe nem para novo agendamento. |
| RN-05 | O terapeuta pode alocar um paciente em slot incompatível com as restrições, mediante confirmação explícita de exceção. A decisão é registrada em auditoria e não altera a restrição do slot. |
| RN-06 | Somente o terapeuta titular edita sua própria grade. A clínica pode solicitar mudanças, que dependem da aceitação do profissional. |
| RN-07 | Slots bloqueados pelo terapeuta não geram notificação de confirmação nem entram no cruzamento de agendas. |

### 11.2 Confirmação de presença

| **ID** | **Regra** |
| --- | --- |
| RN-08 | A notificação de confirmação é disparada automaticamente na véspera da consulta, em horário configurável pelo administrador da clínica. |
| RN-09 | A janela de confirmação encerra no horário configurado, com antecedência mínima de duas horas em relação à consulta. |
| RN-10 | A resposta do paciente é processada em tempo real e atualiza imediatamente o status do slot na grade do terapeuta. |
| RN-11 | A ausência de resposta não configura falta por si só. Ela mantém o slot pendente e o sinaliza ao terapeuta, que decide se libera o horário. |
| RN-12 | O cancelamento comunicado dentro da janela é considerado antecipado e não é contabilizado como falta. |
| RN-13 | O cancelamento comunicado após o encerramento da janela é registrado como falta, passível de justificativa por atestado. |
| RN-14 | Consulta criada com menos de 24 horas de antecedência entra imediatamente em estado pendente, com janela de confirmação reduzida proporcionalmente. |
| RN-15 | Se o terapeuta liberar um slot pendente e o horário for efetivamente ocupado por outro paciente, a consulta original é cancelada sem qualquer penalidade ao paciente titular, que é notificado de imediato. |

### 11.3 Faltas e consequências

| **ID** | **Regra** |
| --- | --- |
| RN-16 | O contador de faltas não justificadas é individual por paciente, no escopo da clínica. Em atendimento particular, o escopo é o do terapeuta. |
| RN-17 | O limite padrão é de 3 faltas não justificadas. O valor é configurável globalmente pela clínica e individualmente por paciente. |
| RN-18 | A falta é registrada pelo terapeuta no slot da grade e entra em estado passível de justificativa até o vencimento do prazo. |
| RN-19 | Ao atingir o limite, a sessão do paciente é bloqueada e seu horário fixo é liberado na grade do terapeuta, tornando-se disponível para outros pacientes. |
| RN-20 | A liberação do horário fixo exige confirmação humana explícita. O sistema apenas sinaliza a recomendação e apresenta, com o mesmo destaque, a opção de suspender a consequência. |
| RN-21 | Nenhuma consequência automática pode cancelar uma consulta já agendada e confirmada. |
| RN-22 | O paciente com sessão bloqueada mantém o direito de solicitar atendimento; a solicitação passa a exigir aprovação da recepção em vez de agendamento direto. |
| RN-23 | O sistema notifica paciente e terapeuta quando o contador atinge a penúltima falta antes do limite, permitindo intervenção antes da consequência. |
| RN-24 | A janela de avaliação do contador é de 180 dias. Faltas anteriores à janela deixam de ser computadas. |
| RN-25 | A clínica pode zerar manualmente o contador de um paciente ou suspender a aplicação de consequências por prazo determinado, mediante justificativa registrada em auditoria. |

### 11.4 Atestado e justificativa

| **ID** | **Regra** |
| --- | --- |
| RN-26 | O prazo padrão para envio do atestado é de 3 dias úteis contados a partir da data da falta. O prazo é configurável globalmente e por paciente. |
| RN-27 | Expirado o prazo, a falta é automaticamente classificada como não justificada e passa a compor o contador. |
| RN-28 | As categorias de justificativa são: problema de saúde do paciente, problema de saúde de dependente, emergência familiar, compromisso profissional inadiável, intercorrência de deslocamento, motivo de força maior e outro. |
| RN-29 | O documento comprobatório é obrigatório para as categorias de saúde e de força maior, e opcional para as demais. A obrigatoriedade é configurável pela clínica. |
| RN-30 | O Sistema pré-valida o atestado verificando ao menos a coerência entre a data do documento e a data da falta, e apresenta o resultado como alerta informativo ao avaliador. |
| RN-31 | A pré-validação nunca rejeita um atestado automaticamente. A decisão de mérito é exclusivamente humana. |
| RN-32 | A aprovação do atestado abona a falta, decrementa o contador e habilita o paciente à reposição. |
| RN-33 | A rejeição do atestado consolida a falta no contador e exige registro do motivo, que é comunicado ao paciente. |
| RN-34 | O atestado não analisado em até 7 dias corridos é aprovado automaticamente, em favor do paciente. |
| RN-35 | O paciente pode contestar uma rejeição uma única vez por ocorrência, no prazo de 7 dias. A reanálise é definitiva. |
| RN-36 | O limite padrão é de 3 atestados aprovados por janela de avaliação. Excedido o limite, novos atestados continuam sendo aceitos para fins de registro, mas o terapeuta é alertado para avaliar a continuidade do plano terapêutico. O limite é configurável e pode ser desativado. |

### 11.5 Reposição e encaixe

| **ID** | **Regra** |
| --- | --- |
| RN-37 | O paciente com falta abonada ou cancelamento antecipado tem direito a reposição, com prioridade de escolha por 15 dias. |
| RN-38 | As sugestões de encaixe resultam do cruzamento entre a grade livre do terapeuta e a disponibilidade declarada do paciente, respeitadas as restrições do slot. |
| RN-39 | O intervalo padrão de busca é de 7 dias, ampliável para 14 dias por ação do usuário. |
| RN-40 | A escolha do paciente gera uma solicitação de encaixe pendente, que só se converte em consulta após aprovação da recepção ou do terapeuta. |
| RN-41 | O slot é reservado transacionalmente enquanto a solicitação estiver pendente, impedindo ocupação concorrente. |
| RN-42 | A recusa da solicitação libera o slot imediatamente e a notificação ao paciente deve indicar um próximo passo concreto. |
| RN-43 | Slots liberados em cima da hora são ofertados na ordem: paciente com direito de reposição vigente; pool de encaixe, ordenado pelo índice de reputação e, em caso de empate, por antiguidade na fila; lista de espera; disponibilidade geral. |
| RN-44 | Recusar ou ignorar uma oferta de encaixe não gera qualquer penalidade. |
| RN-45 | O limite padrão é de 2 reposições por falta e 4 por janela de avaliação, configurável pela clínica. |

### 11.6 Índice de reputação (camada complementar)

O índice de reputação é uma camada auxiliar e explicitamente não punitiva. A regra normativa que produz consequências é o contador de faltas não justificadas descrito em 11.3. O índice existe apenas para resolver um problema operacional específico: quando vários pacientes disputam o mesmo slot liberado em cima da hora, é preciso um critério objetivo de ordenação da fila.

| **ID** | **Regra** |
| --- | --- |
| RN-46 | O índice varia de 0 a 100, é individual por par paciente e terapeuta e nunca é compartilhado entre profissionais sem consentimento específico do paciente. |
| RN-47 | Todo paciente inicia com índice 100. |
| RN-48 | O índice influencia exclusivamente a ordenação da fila de encaixe. Ele não bloqueia agendamento, não restringe acesso e não é usado como critério de desligamento. |
| RN-49 | O paciente tem acesso permanente ao seu índice, ao histórico de eventos que o compõem e à explicação do cálculo em linguagem acessível. |
| RN-50 | A recuperação do índice é automática por comparecimento consistente, sem necessidade de intervenção manual. |
| RN-51 | Atestado aprovado não produz qualquer impacto negativo sobre o índice. |

## 12. Modelo de faltas e reputação

### 12.1 Contador de faltas — regra normativa

Esta é a regra que produz consequências reais e corresponde ao comportamento já implementado no protótipo executável.

| **Evento** | **Efeito no contador** | **Efeito na sessão** |
| --- | --- | --- |
| Sessão realizada | Nenhum | Permanece ativa |
| Cancelamento antecipado, dentro da janela | Nenhum | Permanece ativa |
| Falta com atestado aprovado | Abono; contador decrementado | Permanece ativa |
| Falta sem atestado, prazo em curso | Provisório, ainda não consolidado | Permanece ativa |
| Falta sem atestado, prazo expirado | +1 | Permanece ativa até o limite |
| Falta com atestado rejeitado | +1 | Permanece ativa até o limite |
| Atingimento do limite (padrão: 3) | Contador em 3/3 | Bloqueada; horário fixo liberado |

### 12.2 Índice de reputação — camada de ordenação

Valores padrão, parametrizáveis conforme RNF-48. O índice não gera bloqueio nem restrição de acesso.

| **Evento** | **Delta** | **Observação** |
| --- | --- | --- |
| Sessão realizada com confirmação prévia | +6 | Principal via de recuperação |
| Sessão realizada sem confirmação prévia | +3 | Comparecer conta; confirmar conta mais |
| Cancelamento antecipado | 0 | Comportamento adequado; não penaliza |
| Cancelamento após a janela, antes da sessão | −12 | Ainda houve aviso; há chance de reocupação |
| Falta sem aviso | −25 | Perda total do slot |
| Atestado aprovado | 0 | Anula integralmente o efeito do evento |
| Confirmação registrada dentro da janela | +1 | Bônus de engajamento, uma vez por sessão |
| Cinco sessões consecutivas realizadas | +5 | Acelera a recuperação |

| **Faixa** | **Índice** | **Efeito — apenas sobre a fila de encaixe** |
| --- | --- | --- |
| Ouro | 85–100 | Prioridade máxima nas ofertas de slots liberados em cima da hora. |
| Prata | 65–84 | Prioridade normal. |
| Bronze | 40–64 | Prioridade reduzida; lembretes adicionais habilitados. |
| Base | 0–39 | Última posição na fila de ofertas. Nenhum efeito sobre agendamento, acesso ou continuidade do tratamento. |

### 12.3 Princípios do modelo

- Assimetria proporcional: uma falta sem aviso custa cerca de quatro sessões de recuperação no índice. É severo o suficiente para ter efeito comportamental e brando o suficiente para não inviabilizar a reabilitação.
- Transparência total: o paciente vê o contador, o índice, o histórico e o caminho de recuperação. Não há pontuação oculta.
- Avisar vale mais que sumir: o cancelamento após a janela é penalizado com menos da metade do peso da falta silenciosa, o que incentiva o aviso mesmo em cima da hora.
- Justificar é gratuito: não há custo em tentar justificar, nem penalidade adicional por atestado rejeitado além da já devida pela falta.
- A decisão final é humana: a liberação do horário fixo exige confirmação explícita, e a clínica pode sobrepor o sistema a qualquer momento.

## 13. Máquinas de estados

### 13.1 Estados do slot na grade

| **Estado** | **Cor** | **Significado** |
| --- | --- | --- |
| Vago | Cinza | Slot existente na grade, sem paciente alocado. Elegível para encaixe. |
| Bloqueado | Cinza | Slot indisponibilizado pelo terapeuta. Não gera notificação nem entra no cruzamento. |
| Pendente | Amarelo | Paciente alocado, janela de confirmação aberta e ainda sem resposta. |
| Confirmado | Verde | Paciente confirmou presença dentro da janela. |
| Cancelado | Vermelho | Ausência comunicada. Slot liberado para reposição ou encaixe. |

### 13.2 Ciclo de vida da consulta

| **De** | **Para** | **Gatilho** | **Ator** |
| --- | --- | --- | --- |
| Agendada | Pendente | Disparo da notificação na véspera | Sistema |
| Pendente | Confirmada | Confirmação do paciente | Paciente |
| Pendente | Cancelada | Cancelamento dentro da janela | Paciente |
| Pendente | Pendente vencida | Encerramento da janela sem resposta | Sistema |
| Pendente vencida | Vago | Liberação do slot | Terapeuta |
| Confirmada / Pendente vencida | Realizada | Registro de comparecimento | Terapeuta |
| Confirmada / Pendente vencida | Falta | Registro de ausência | Terapeuta |
| Falta | Justificativa em análise | Envio de atestado dentro do prazo | Paciente |
| Justificativa em análise | Falta abonada | Aprovação ou decurso de 7 dias | Clínica / Sistema |
| Justificativa em análise | Falta confirmada | Rejeição do atestado | Clínica |
| Falta confirmada | Em contestação | Contestação única do paciente | Paciente |
| Falta | Falta confirmada | Expiração do prazo de 3 dias úteis | Sistema |
| Falta abonada / Cancelada | Reposição solicitada | Escolha de encaixe pelo paciente | Paciente |
| Reposição solicitada | Reposição confirmada | Aprovação da solicitação | Clínica / Terapeuta |
| Reposição solicitada | Reposição recusada | Recusa da solicitação | Clínica / Terapeuta |

### 13.3 Ciclo de vida do atestado

| **Estado** | **Cor** | **Descrição** |
| --- | --- | --- |
| Enviado | Azul | Documento recebido pelo sistema, aguardando pré-validação automática. |
| Em análise | Amarelo | Pré-validação concluída; documento na fila de decisão humana. |
| Aprovado | Verde | Falta abonada e contador decrementado. |
| Rejeitado | Vermelho | Falta consolidada. Motivo registrado e comunicado ao paciente. |

### 13.4 Ciclo de vida da sessão do paciente

| **Estado** | **Descrição** |
| --- | --- |
| Ativa | O paciente mantém horário fixo na grade do terapeuta e pode confirmar presença normalmente. |
| Bloqueada | Limite de faltas atingido. O horário fixo foi liberado. Novos agendamentos dependem de aprovação da recepção. A reativação pode ser feita manualmente pela clínica. |

## 14. Fluxos principais

### 14.1 CU-01 — Confirmar presença

**Ator:** Paciente. **Pré-condição:** Consulta em estado pendente, janela de confirmação aberta.

- O sistema dispara a notificação na véspera, no horário configurado pela clínica.
- O paciente aciona a notificação e o sistema exibe, na mesma tela, data, horário, terapeuta e sala.
- São apresentadas as opções: confirmar presença, desmarcar ou solicitar reposição.
- O paciente confirma. O sistema registra a resposta, altera o status do slot para confirmado, cancela os lembretes pendentes e atualiza a grade do terapeuta em tempo real.

**A1 — Janela encerrada:** o sistema informa o encerramento, registra a intenção do paciente e sinaliza o caso ao terapeuta, que decide sobre a manutenção do horário.

**A2 — Slot já realocado:** o sistema informa a realocação, esclarece que não houve penalidade e oferece reposição prioritária.

### 14.2 CU-02 — Desmarcar antecipadamente

**Ator:** Paciente. **Pré-condição:** Consulta pendente, dentro da janela de confirmação.

- O paciente seleciona a opção de desmarcar.
- O sistema exibe modal de confirmação descrevendo exatamente a consequência: identifica a consulta pelos seus dados completos e informa que a ausência comunicada no prazo não será contabilizada como falta.
- O paciente confirma a ação.
- O sistema altera o status do slot para cancelado, marca o horário como disponível para encaixe e notifica o terapeuta.
- O sistema oferece imediatamente ao paciente a busca por horários de reposição.

### 14.3 CU-03 — Justificar falta por atestado

**Ator:** Paciente. **Pré-condição:** Falta registrada pelo terapeuta, dentro do prazo de 3 dias úteis.

- O paciente acessa a falta registrada e seleciona o envio de atestado.
- O sistema exibe as categorias de justificativa e o campo de descrição.
- O paciente anexa o documento ou o fotografa pela câmera do dispositivo.
- O sistema valida formato, tamanho e integridade, remove metadados de imagem, executa verificação antimalware e armazena o arquivo cifrado.
- O sistema executa a pré-validação automática, comparando a data do documento com a data da falta.
- O sistema registra o atestado em análise, suspende a consolidação da falta e notifica a clínica.
- O paciente passa a ver o status do documento em cores semânticas, sem precisar contatar a recepção.

**A1 — Prazo expirado:** o sistema informa a expiração, consolida a falta e orienta o paciente a contatar a clínica.

**E1 — Falha no armazenamento:** o sistema preserva o rascunho localmente, informa que as informações não foram perdidas e reenfileira o envio.

### 14.4 CU-04 — Analisar atestado

**Ator:** Administrador da clínica, ou terapeuta em atendimento particular. **Pré-condição:** Atestado em análise.

- O avaliador acessa a fila de atestados pendentes.
- O sistema apresenta os dados da falta, a categoria, a descrição, o resultado da pré-validação automática e o histórico de faltas do paciente.
- O avaliador abre o documento; o sistema registra o acesso em auditoria.
- O avaliador aprova, rejeita ou solicita informação complementar.
- Na aprovação, o sistema abona a falta, decrementa o contador, habilita a reposição e notifica o paciente.
- Na rejeição, o sistema exige o motivo, consolida a falta no contador e notifica o paciente com o motivo e a informação sobre o direito de contestação.

**A1 — Decurso de 7 dias:** o sistema aprova automaticamente o atestado e notifica ambas as partes.

### 14.5 CU-05 — Gerar e solicitar encaixe

**Ator:** Paciente e Sistema. **Pré-condição:** Consulta cancelada antecipadamente ou falta abonada.

- O paciente solicita a busca por horários de reposição.
- O sistema exibe estado de carregamento com texto descritivo do processamento e desabilita o botão para impedir duplo clique.
- O sistema cruza a grade livre do terapeuta com a disponibilidade declarada do paciente no intervalo padrão de 7 dias.
- O sistema descarta os slots incompatíveis com as restrições de faixa etária e limite de pacientes.
- O sistema apresenta as sugestões ordenadas, destacando o slot mais próximo da data original.
- O paciente escolhe um horário. O sistema reserva o slot transacionalmente e registra a solicitação como pendente.
- A recepção ou o terapeuta aprova ou recusa. O sistema notifica o paciente e, na recusa, libera o slot e oferece um próximo passo.

**A1 — Nenhum encaixe encontrado:** o sistema informa a ausência de horários compatíveis no intervalo e oferece a ampliação da busca para 14 dias, além do contato direto com a recepção.

### 14.6 CU-06 — Registrar falta e aplicar consequência

**Ator:** Terapeuta e Sistema.

- O terapeuta lança a falta diretamente no slot da grade.
- O sistema registra a falta em estado provisório e abre o prazo de 3 dias úteis para envio de atestado.
- Decorrido o prazo sem atestado aprovado, o sistema consolida a falta e incrementa o contador.
- Ao atingir a penúltima falta, o sistema notifica paciente e terapeuta, permitindo intervenção.
- Ao atingir o limite, o sistema apresenta ao responsável a recomendação de liberação do horário fixo, com a opção de suspender a consequência apresentada no mesmo nível de destaque.
- Confirmada a liberação, o sistema bloqueia a sessão, libera o horário na grade e notifica o paciente com mensagem informativa e um próximo passo concreto.

## 15. Especificação de mensagens ao usuário

A comunicação do sistema rejeita explicitamente dois padrões: mensagens técnicas genéricas e mensagens de tom punitivo ou acusatório. Toda mensagem deve conter diagnóstico claro, contextualização da regra de negócio envolvida e indicação do próximo passo possível, preferencialmente com atalho direto para a ação corretiva.

| **Situação** | **Versão proibida** | **Versão aprovada** |
| --- | --- | --- |
| Nenhum encaixe encontrado | Erro: sem horários disponíveis. | Não encontramos horários compatíveis nos próximos 7 dias. Deseja ampliar a busca para 14 dias? Se preferir, entre em contato diretamente com a recepção. |
| Limite de faltas atingido | Limite de faltas atingido. Horário removido. | Esta foi a sua terceira falta não justificada. De acordo com a política da clínica, seu horário fixo será liberado. Entre em contato com a recepção para reagendar. |
| Prazo de justificativa expirado | Prazo expirado. Falta não justificada. | O prazo de 3 dias úteis para justificar a falta em 15/07 foi encerrado. Esta ausência foi contabilizada. Em caso de dúvidas, entre em contato com a Dra. Ana Rodrigues. |
| Atestado rejeitado | Atestado rejeitado. | Seu atestado foi analisado e não pôde ser aprovado neste caso. Para entender o motivo ou solicitar uma reavaliação, entre em contato com a clínica. |
| Erro de conexão ao processar encaixe | Falha na operação. Tente novamente. | Houve uma instabilidade temporária ao buscar os horários. Aguarde alguns instantes e tente novamente. Suas informações não foram perdidas. |
| Solicitação de encaixe recusada | Solicitação negada. | Sua solicitação de encaixe para quinta, 17/07 às 14:00 não pôde ser aprovada. Você pode escolher outro horário disponível ou falar com a recepção. |
| Confirmação de cancelamento | Deseja cancelar? | Você está desmarcando a consulta de 15/07 às 14:00 com a Dra. Ana Rodrigues. Como o aviso está dentro do prazo, esta ausência não será contabilizada como falta. Deseja continuar? |
| Aproximação do limite de faltas | Atenção: 2 faltas. | Você tem 2 faltas não justificadas registradas. Ao atingir 3, seu horário fixo é liberado na agenda. Se alguma dessas ausências teve motivo de saúde, você ainda pode enviar um atestado. |

Nos cenários de limite de faltas, o atalho direto para contato com a clínica embutido na mensagem reduz a barreira de ação e diminui o abandono do fluxo, que é um dos maiores riscos de insatisfação em sistemas voltados a usuários novatos.

## 16. Considerações éticas e clínicas

Esta seção não é acessória. Ela condiciona decisões de design já incorporadas aos requisitos anteriores e deve ser revisada com profissionais da área antes da próxima iteração de codificação.

**O absenteísmo pode ser sintoma.** Em saúde mental, faltar a sessões não é necessariamente descuido. Evitação é comportamento característico de quadros de ansiedade, depressão e transtorno de estresse pós-traumático. Anedonia e falta de energia são sintomas depressivos que se manifestam exatamente como não conseguir sair de casa. Um sistema que penalize automaticamente esses pacientes pode agravar o quadro que o tratamento pretende tratar e afastar justamente quem mais precisa de acompanhamento.

Por isso o sistema foi especificado com as salvaguardas abaixo, cada uma vinculada ao requisito que a implementa.

| **Salvaguarda** | **Requisito correspondente** |
| --- | --- |
| A liberação do horário fixo exige confirmação humana explícita. | RF-FAL-14, RN-20 |
| A opção de suspender a consequência aparece com o mesmo destaque visual da opção de aplicá-la. | RF-FAL-14 |
| O paciente é avisado antes de atingir o limite, com tempo para intervir. | RF-FAL-08, RN-23 |
| A clínica pode zerar o contador ou suspender consequências por indicação clínica. | RF-CLI-10, RN-25 |
| O bloqueio não impede a solicitação de atendimento, apenas exige aprovação. | RN-22 |
| O índice de reputação não bloqueia nem restringe acesso; ordena apenas a fila de encaixe. | RN-48 |
| O índice nunca é compartilhado entre terapeutas sem consentimento. | RN-46 |
| A recuperação é sempre possível e explicitada ao paciente. | RF-PAC-09, RN-49, RN-50 |
| A linguagem da interface evita termos punitivos e estigmatizantes. | RNF-18, capítulo 15 |
| Padrões de falta são sinalizados como informação clínica, não como infração. | RN-36 |

**Recomendação de produto.** O indicador de reincidência deve ser apresentado ao terapeuta como gatilho de conversa clínica, e não como recomendação de desligamento. A tela que sinaliza o atingimento do limite deve oferecer, com o mesmo destaque, a opção de suspender a consequência e a de aplicá-la.

**Sigilo profissional.** Atestados compartilhados na plataforma estão cobertos pelo sigilo profissional. O acesso deve ser restrito ao terapeuta responsável e ao avaliador designado, com registro de auditoria. Perfis de recepção não devem ter acesso ao conteúdo clínico dos documentos.

**Assimetria de poder.** A clínica decide unilateralmente sobre a validade do atestado. Essa assimetria é inerente ao contexto, mas exige contrapesos: motivo obrigatório na rejeição, direito de contestação, aprovação automática por decurso de prazo e trilha de auditoria completa.

**Um alerta específico sobre a pré-validação automática.** A verificação de coerência entre a data do atestado e a data da falta é útil para poupar tempo do avaliador, mas gera falsos positivos legítimos: atestados retroativos, internações que cobrem período mais amplo e declarações emitidas em data posterior ao atendimento são todos casos válidos. Por isso a pré-validação nunca rejeita automaticamente, apenas sinaliza (RN-31).

## 17. Restrições, premissas e dependências

### 17.1 Restrições

| **ID** | **Restrição** |
| --- | --- |
| RE-01 | O sistema deve operar em conformidade com a LGPD, com hospedagem preferencial em território nacional. |
| RE-02 | O sistema não valida a autenticidade do atestado. A pré-validação limita-se à coerência de datas e a decisão de mérito é humana. |
| RE-03 | O sistema não realiza inferência clínica sobre os motivos das faltas. |
| RE-04 | Esta versão não processa pagamentos. Políticas de cobrança são registradas, mas executadas fora da plataforma. |
| RE-05 | O sistema não integra faturamento nem regras de operadoras de planos de saúde. |
| RE-06 | O envio de SMS e de mensagens por canais de terceiros depende de contrato com provedor e está sujeito a custo variável por mensagem. |

### 17.2 Premissas

| **ID** | **Premissa** |
| --- | --- |
| PR-01 | Os pacientes possuem smartphone com acesso à internet e capacidade de instalar aplicativo ou acessar a aplicação web. |
| PR-02 | Os terapeutas mantêm o registro de comparecimento atualizado. O contador de faltas depende inteiramente dessa entrada. |
| PR-03 | Existe relação terapêutica previamente estabelecida. O sistema não intermedeia a captação de pacientes. |
| PR-04 | A política de faltas é comunicada ao paciente no início do vínculo e o aceite é registrado na plataforma. |
| PR-05 | A clínica possui pessoal de recepção disponível para analisar atestados e solicitações de encaixe dentro dos prazos definidos, ou o terapeuta assume esse papel em atendimento particular. |

### 17.3 Dependências externas

| **Dependência** | **Finalidade** | **Criticidade** |
| --- | --- | --- |
| Provedor de push | Notificações móveis de confirmação | Alta |
| Provedor de e-mail transacional | Notificações e recuperação de senha | Alta |
| Provedor de SMS ou mensageria | Canal alternativo de lembrete | Média |
| Armazenamento de objetos com cifragem | Guarda de atestados | Alta |
| Serviço de gestão de chaves | Cifragem em repouso | Alta |
| Serviço antimalware | Verificação de anexos | Média |
| API de calendário externo | Sincronização da grade | Baixa |

## 18. Riscos

| **ID** | **Risco** | **Prob.** | **Impacto** | **Mitigação** |
| --- | --- | --- | --- | --- |
| R-01 | O controle de faltas afasta pacientes vulneráveis do tratamento | Média | Alto | Salvaguardas do capítulo 16; piloto monitorado; revisão dos parâmetros com dados reais |
| R-02 | Baixa adesão dos pacientes ao aplicativo | Alta | Alto | Confirmação em dois toques a partir da notificação; canal alternativo por mensageria; não exigir login completo para confirmar |
| R-03 | Terapeutas não registram o comparecimento, invalidando o contador | Média | Alto | Lançamento de falta em um toque no slot; lembrete ao fim do expediente; presunção de comparecimento configurável |
| R-04 | Vazamento de atestados | Baixa | Crítico | Cifragem em repouso; URLs assinadas de curta duração; auditoria de acesso; expurgo automático |
| R-05 | Falsificação de atestados | Média | Médio | Pré-validação de datas; decisão humana; histórico de padrões visível; limite de atestados por janela |
| R-06 | Sobrecarga da recepção com a fila de análise | Média | Médio | Aprovação automática por decurso de prazo; ações em lote; pré-validação que reduz o esforço de revisão |
| R-07 | Disputas sobre rejeição de atestado | Média | Médio | Motivo obrigatório; direito de contestação; trilha de auditoria completa |
| R-08 | Concorrência na ocupação de slots de encaixe | Alta | Médio | Reserva transacional durante a análise; testes de carga específicos |
| R-09 | Grade densa ilegível em smartphone | Alta | Médio | Linha do tempo diária com abas em mobile (RNF-15); testes em dispositivos reais |
| R-10 | Pré-validação automática gera falsos positivos em atestados legítimos | Alta | Médio | A pré-validação nunca rejeita; resultado apresentado apenas como alerta ao avaliador (RN-31) |
| R-11 | Terapeuta com perfil acumulado executa ação administrativa sem perceber a troca de contexto | Média | Médio | Indicador permanente de perfil ativo (RF-ADM-06) |
| R-12 | Custo de SMS acima do previsto | Média | Baixo | Priorizar push e e-mail; SMS como fallback com limite orçamentário |

## 19. Métricas de sucesso

### 19.1 Métricas de produto

| **Métrica** | **Definição** | **Meta em 6 meses** |
| --- | --- | --- |
| Taxa de falta não justificada | Faltas sem atestado aprovado sobre o total de consultas agendadas | Redução de 40% sobre a linha de base |
| Taxa de confirmação | Consultas confirmadas sobre consultas com janela aberta | Acima de 75% |
| Taxa de aviso prévio | Cancelamentos antecipados sobre o total de ausências | Acima de 70% |
| Taxa de reocupação | Slots liberados que foram reocupados sobre o total de slots liberados | Acima de 35% |
| Slots recuperados por terapeuta | Sessões realizadas em vagas de encaixe, por mês | Pelo menos 2 |
| Tempo médio de análise de atestado | Do envio à decisão | Até 24 horas |
| Adesão do paciente | Pacientes ativos no app sobre pacientes cadastrados | Acima de 70% |
| Contatos à recepção sobre status de atestado | Volume mensal de contatos apenas para perguntar se o documento foi recebido | Redução de 60% |
| Taxa de abandono após bloqueio | Pacientes que encerram o vínculo após ter a sessão bloqueada | Monitorada; investigar se acima de 30% |

**A última métrica é uma métrica de guarda.** Se o sistema estiver reduzindo faltas às custas de afastar pacientes do tratamento, os parâmetros de limite e prazo precisam ser revistos, e não celebrados.

### 19.2 Métricas de usabilidade

Coletadas nos testes empíricos com o protótipo executável, com pelo menos dois representantes de cada perfil por iteração, conforme o ciclo RAD definido na Entrega II.

| **Dimensão** | **Método de coleta** | **Meta** |
| --- | --- | --- |
| Eficácia | Observação direta da taxa de conclusão de tarefa sem assistência externa | 90% nas tarefas críticas |
| Eficiência | Medição cronométrica do tempo de tarefa; número de cliques como métrica secundária | 2 min (paciente); 3 min (administrador) |
| Satisfação | Questionário SUS aplicado após cada sessão, com perguntas abertas complementares | Escore acima de 70 |
| Taxa de erros | Contagem separada de erros recuperáveis e irrecuperáveis | Zero irrecuperáveis nas tarefas críticas |

## 20. Rastreabilidade com o protótipo executável

O protótipo ClinicApp, desenvolvido em React com Vite, já implementa parte substancial dos requisitos desta especificação. O mapeamento abaixo orienta o planejamento das próximas iterações, separando o que já foi validado do que permanece pendente.

| **Funcionalidade** | **Situação** | **Observação** |
| --- | --- | --- |
| Seleção de dispositivo e layout adaptativo | Implementado | Grade semanal em desktop e linha do tempo diária com abas em mobile, conforme RNF-15. |
| Autenticação por perfil | Implementado (simulado) | Quatro perfis de teste. Autenticação real, hash de senha e 2FA pendentes (RF-ADM-03, RF-ADM-10). |
| Grade semanal com estados de slot | Implementado | Cinco estados com cores semânticas, conforme 13.1. |
| Restrições inline no card do slot | Implementado | Indicador de faixa etária e contador de ocupação, conforme RF-TER-03. |
| Lançamento de falta pelo terapeuta | Implementado | RF-TER-07. |
| Contador de faltas com regra 3/3 | Implementado | Liberação automática do horário fixo, conforme RN-17 e RN-19. |
| Confirmação e desmarcação pelo paciente | Implementado | RF-PAC-03 e RF-PAC-04. |
| Envio de atestado e rastreamento de status | Implementado | Quatro estados com cores semânticas, conforme 13.3. |
| Aprovação e rejeição de atestado | Implementado | RF-CLI-06. |
| Busca de encaixe por cruzamento de agenda | Implementado | Com estado de carregamento, conforme RF-ENC-05. |
| Solicitação de encaixe com aprovação da recepção | Implementado | Estados pendente, aprovada e recusada, conforme RF-ENC-06. |
| Painel unificado de alternância de perfil | Parcial | Perfis existem separadamente; falta a alternância sem logoff (RF-ADM-05, RF-ADM-06). |
| Pré-validação automática de atestado | Pendente | RF-FAL-09 e RF-FAL-10. |
| Notificações reais multicanal | Pendente | O protótipo simula o disparo; falta a integração com provedores (RF-NOT-01). |
| Comunicação direta terapeuta e paciente | Pendente | RF-COM-01. |
| Alertas gerais da clínica | Pendente | RF-CLI-08. |
| Configuração de parâmetros por paciente | Pendente | RF-CLI-03. |
| Índice de reputação e ordenação da fila | Pendente | Capítulo 12.2. |
| Persistência em banco de dados | Pendente | O estado atual é mantido em memória no cliente. |
| Auditoria, cifragem e conformidade LGPD | Pendente | Capítulos 10.7 e 10.8. |

## 21. Roadmap sugerido

O planejamento adota o ciclo iterativo definido na Entrega II: especificação rápida, codificação incremental, teste com usuários e refinamento, com pelo menos dois representantes de cada perfil por iteração.

| **Fase** | **Foco** | **Escopo** |
| --- | --- | --- |
| Fase 1 (concluída) | Protótipo executável de fluxos | Layout adaptativo, grade com estados, contador 3/3, atestado com rastreamento e encaixe por cruzamento. Base validada com usuários. |
| Fase 2 | Persistência e backend | Banco de dados, API REST versionada, autenticação real, auditoria e isolamento por clínica. Sem novas funcionalidades de interface. |
| Fase 3 | Automação e comunicação | Notificações reais multicanal, disparo agendado na véspera, pré-validação de atestado, alertas gerais e mensagens diretas. |
| Fase 4 | Refinamento e configuração | Painel unificado, parâmetros por paciente, índice de reputação, pool de encaixe e lista de espera. |
| Fase 5 | Conformidade e escala | Cifragem de anexos, expurgo automatizado, relatório de impacto à proteção de dados, indicadores agregados e exportação de relatórios. |

Recomenda-se coletar a linha de base de absenteísmo das clínicas parceiras antes da ativação das funcionalidades de contagem de falta, de modo que os parâmetros de limite e prazo sejam calibrados com dados reais em vez de valores arbitrários.

## 22. Questões em aberto

| **ID** | **Questão** | **Decisão cabe a** |
| --- | --- | --- |
| QA-01 | O contador de faltas deve ser por clínica ou por par paciente e terapeuta? A especificação assume o escopo da clínica, mas um paciente atendido por dois terapeutas da mesma clínica pode ser penalizado por faltas concentradas em apenas um deles. | Produto e Clínico |
| QA-02 | A cobrança financeira por falta será integrada ao sistema ou permanecerá fora dele? | Produto |
| QA-03 | Qual a base legal escolhida para o tratamento dos atestados: consentimento específico ou tutela da saúde? | Jurídico |
| QA-04 | O prazo de retenção de 180 dias para atestados é adequado do ponto de vista de defesa em eventual litígio? | Jurídico |
| QA-05 | Pacientes menores de idade estão no escopo? A restrição de faixa etária por slot sugere que sim, o que exige fluxo de consentimento parental e ajuste da interface de confirmação. | Produto e Jurídico |
| QA-06 | Em atendimento em grupo (limite de pacientes maior que um), a falta de um participante libera vaga para encaixe imediato ou o grupo é fechado? | Produto e Clínico |
| QA-07 | Os valores padrão do índice de reputação devem ser validados com terapeutas antes da implementação da Fase 4. | Produto e Clínico |
| QA-08 | A confirmação por token sem autenticação plena é aceitável, considerando que o link pode ser encaminhado a terceiros? | Segurança |
| QA-09 | Quando a clínica solicita mudança na grade do terapeuta e ele recusa, qual é o mecanismo de resolução? | Produto |

## 23. Referências

BRASIL. Lei nº 13.709, de 14 de agosto de 2018. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, 2018.

BROOKE, John. SUS — A Quick and Dirty Usability Scale. In: JORDAN, P. W. et al. (Eds.). Usability Evaluation in Industry. Taylor & Francis, 1996.

ISO 9241-110:2006 — Ergonomics of human-system interaction — Part 110: Dialogue principles. International Organization for Standardization, 2006.

ISO 13407:1999 — Human-centred design processes for interactive systems. International Organization for Standardization, 1999.

MARTIN, James. Rapid Application Development. Macmillan Publishing, 1991.

NIELSEN, Jakob. Usability Engineering. Academic Press, 1993.

NIELSEN, Jakob; MOLICH, Rolf. Heuristic Evaluation of User Interfaces. In: Proceedings of CHI 90. ACM Press, 1990.

PREECE, Jenny; ROGERS, Yvonne; SHARP, Helen. Design de Interação: Além da Interação Humano-Computador. 3. ed. Bookman, 2013.

PRESSMAN, Roger S. Engenharia de Software: Uma Abordagem Profissional. 8. ed. McGraw-Hill, 2016.

SCHULER, D.; NAMIOKA, A. Participatory Design: Principles and Practices. Lawrence Erlbaum Associates, 1993.

W3C. Web Content Accessibility Guidelines (WCAG) 2.1. World Wide Web Consortium, 2018.
