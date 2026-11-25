"""Gera o Relatorio de Usabilidade do ClinicApp (dados reais: Ana e Lucas).

Fonte dos dados: material_testes/ (Plano_Teste_Usabilidade_ClinicApp.pdf,
questionario_ana.pdf/docx, questionario_lucas.pdf/docx, Relatorio_Resultados_ClinicApp.pdf).

Uso: python3 generate_relatorio_usabilidade.py
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable,
)
import os

NAVY = HexColor("#102D38")
TEAL = HexColor("#167D78")
TEAL_BG = HexColor("#EAF4F2")
BORDER = HexColor("#D7E4E5")
GRAY = HexColor("#526772")
AMBER = HexColor("#AD6B16")
AMBER_BG = HexColor("#F7ECDC")
WHITE = colors.white

OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "output", "pdf", "ClinicApp_Relatorio_Usabilidade.pdf",
)

KICKER = "CLINICAPP / USABILIDADE"
FOOTER = "TESTE REAL · 2 participantes (Ana e Lucas) · Protótipo ClinicApp"

styles = {
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, leading=26,
                          textColor=NAVY, spaceAfter=4),
    "sub": ParagraphStyle("sub", fontName="Helvetica-Bold", fontSize=13, leading=17,
                           textColor=TEAL, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=15, leading=19,
                          textColor=NAVY, spaceBefore=14, spaceAfter=6),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=11.5, leading=15,
                          textColor=NAVY, spaceBefore=8, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=14,
                            textColor=GRAY, alignment=TA_LEFT, spaceAfter=6),
    "bodyBold": ParagraphStyle("bodyBold", fontName="Helvetica-Bold", fontSize=9.5,
                                leading=14, textColor=NAVY, spaceAfter=4),
    "quote": ParagraphStyle("quote", fontName="Helvetica-Oblique", fontSize=10,
                             leading=15, textColor=TEAL, leftIndent=10, spaceAfter=6,
                             borderColor=BORDER, borderWidth=0, spaceBefore=4),
    "qNum": ParagraphStyle("qNum", fontName="Helvetica-Bold", fontSize=9.5, leading=14,
                            textColor=NAVY, spaceBefore=6, spaceAfter=2),
    "qAns": ParagraphStyle("qAns", fontName="Helvetica", fontSize=9.5, leading=14,
                            textColor=GRAY, leftIndent=8, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=11,
                             textColor=GRAY),
    "cellHead": ParagraphStyle("cellHead", fontName="Helvetica-Bold", fontSize=8.8,
                                leading=11, textColor=TEAL),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=8.8, leading=12,
                            textColor=NAVY),
    "cellGray": ParagraphStyle("cellGray", fontName="Helvetica", fontSize=8.3,
                                leading=11.5, textColor=GRAY),
}


def P(text, style="body"):
    return Paragraph(text, styles[style])


def section_table(rows, col_widths, header=True):
    t = Table(rows, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), TEAL_BG),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, TEAL),
        ]
    t.setStyle(TableStyle(style))
    return t


def callout(text, bg=AMBER_BG, border=AMBER, label="Limite de interpretação"):
    inner = Table(
        [[P(f"<b>{label}:</b> {text}", "small")]],
        colWidths=[16.5 * cm],
    )
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.75, border),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return inner


def qa_block(items):
    flow = []
    for n, question, answer in items:
        flow.append(P(f"{n}. {question}", "qNum"))
        flow.append(P(answer, "qAns"))
    return flow


def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(TEAL)
    canvas.drawString(2 * cm, h - 1.3 * cm, KICKER)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(w - 2 * cm, h - 1.3 * cm, f"Página {doc.page}")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.75)
    canvas.line(2 * cm, h - 1.5 * cm, w - 2 * cm, h - 1.5 * cm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(2 * cm, 1.2 * cm, FOOTER)
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUT_PATH, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.1 * cm, bottomMargin=1.8 * cm,
        title="ClinicApp - Relatório de Usabilidade (dados reais)",
        author="Guilherme Carrazzoni, José Mário da Silva Filho, Vinícius Moura",
    )
    S = []

    # --- Página 1: capa/resumo ---
    S.append(P("Relatório de usabilidade ClinicApp", "h1"))
    S.append(P("Resultados reais de 2 participantes — Ana e Lucas", "sub"))
    S.append(P(
        "<b>Natureza do material.</b> Este documento consolida a rodada real de teste de "
        "usabilidade do protótipo ClinicApp, conduzida conforme o Plano de Teste de "
        "Usabilidade (Entrega III) com 2 participantes reais. Para a participante "
        "<b>Ana</b> (perfis Administradora e Terapeuta), a sessão foi cronometrada com "
        "contagem de cliques incorretos por tarefa (Folha de Coleta Resumida). Para o "
        "participante <b>Lucas</b>, que experimentou os três papéis do sistema "
        "(Administrador, Terapeuta e Paciente), a coleta disponível restringiu-se ao "
        "questionário qualitativo de debriefing, sem cronometragem. A Escala SUS (System Usability Scale) "
        "(Seção 6.1 do Plano) não constou nos formulários preenchidos "
        "nesta rodada — limitação assumida explicitamente neste relatório.",
        "body",
    ))

    sintese_rows = [
        [P("Indicador", "cellHead"), P("Resultado real", "cellHead")],
        [P("Tarefas cronometradas concluídas sem ajuda", "cell"),
         P("5 de 5 (100%) — participante Ana", "cellGray")],
        [P("Falhas registradas", "cell"), P("0 de 5", "cellGray")],
        [P("Cliques incorretos (total)", "cell"),
         P("25, concentrados na Tarefa 8 (13 cliques — 52% do total)", "cellGray")],
        [P("Escala SUS", "cell"),
         P("Não aplicada nesta rodada (ausente nos formulários coletados)", "cellGray")],
        [P("Percepção geral (5 respostas de debriefing)", "cell"),
         P("5 de 5 em “Fácil” ou “Muito Fácil” (100%)", "cellGray")],
        [P("Cores semânticas", "cell"),
         P("5 de 5 em “Ajudaram muito” (100%)", "cellGray")],
    ]
    S.append(P("Síntese dos resultados", "h3"))
    S.append(section_table(sintese_rows, [6.5 * cm, 10.5 * cm]))
    S.append(Spacer(1, 10))

    S.append(P("Participantes reais", "h3"))
    S.append(P(
        "<b>P01 — Ana.</b> Administradora e Terapeuta. Sessão cronometrada "
        "cobrindo 5 tarefas (3 do roteiro oficial e 2 exploratórias) e 1 "
        "questionário qualitativo combinado (Administração e Terapeuta).",
        "body",
    ))
    S.append(P(
        "<b>P02 — Lucas.</b> Administrador, Terapeuta e Paciente. Sem "
        "cronometragem; respondeu 4 questionários de debriefing, um para cada "
        "papel testado (Administrador, Terapeuta, Paciente — confirmação de "
        "presença, e Paciente — fluxo de atestado).",
        "body",
    ))
    S.append(Spacer(1, 6))
    S.append(callout(
        "o plano prevê de 8 a 13 participantes. Esta rodada reúne 2 "
        "participantes reais e tem caráter formativo/exploratório — orienta a "
        "próxima iteração do ciclo RAD (Rapid Application Development; Entrega II, Seção 4.1.1), não "
        "valida estatisticamente as metas de usabilidade."
    ))

    # --- Página 2: desempenho cronometrado ---
    S.append(P("1. Desempenho nas tarefas cronometradas — Ana", "h2"))
    S.append(P(
        "Legenda: tempo refere-se exclusivamente à Tentativa 1 (T1 — exploração "
        "livre, sem dicas), conforme metodologia da Entrega III (Seção 1.6). As "
        "Tarefas 7 e 8 são exploratórias, fora do roteiro oficial de 6 tarefas, "
        "aplicadas para ampliar a cobertura de dados dado o número reduzido de "
        "participantes.",
        "body",
    ))
    tarefas_rows = [
        [P("Tarefa", "cellHead"), P("Descrição", "cellHead"),
         P("Tempo T1", "cellHead"), P("Cliques\ninc.", "cellHead"),
         P("Resultado", "cellHead")],
        [P("T3", "cell"), P("Aprovar atestado médico (Mobile)", "cellGray"),
         P("27 s", "cell"), P("4", "cell"), P("Sucesso sem ajuda", "cellGray")],
        [P("T5*", "cell"), P("Confirmar presença via notificação (Mobile)", "cellGray"),
         P("29 s", "cell"), P("2", "cell"), P("Sucesso sem ajuda", "cellGray")],
        [P("T6", "cell"), P("Alternar perfil Terapeuta ↔ Administrador (Desktop)", "cellGray"),
         P("30 s", "cell"), P("4", "cell"), P("Sucesso sem ajuda", "cellGray")],
        [P("T7**", "cell"), P("Exploratória — fluxo de grade/restrições", "cellGray"),
         P("33 s", "cell"), P("2", "cell"), P("Sucesso sem ajuda", "cellGray")],
        [P("T8**", "cell"), P("Exploratória — cancelamento por excedente de faltas", "cellGray"),
         P("1 min 52 s", "cell"), P("13", "cell"),
         P("Sucesso sem ajuda", "cellGray")],
    ]
    S.append(section_table(tarefas_rows, [1.6 * cm, 7.6 * cm, 2.3 * cm, 1.8 * cm, 3.2 * cm]))
    S.append(P(
        "* A Tarefa 5 pertence ao roteiro do perfil Paciente (Entrega III); foi também "
        "aplicada a Ana para ampliar a cobertura de dados nesta rodada com poucos "
        "participantes. ** Tarefas sem meta formal no Plano oficial.",
        "small",
    ))
    S.append(Spacer(1, 8))

    metricas_rows = [
        [P("Métrica consolidada", "cellHead"), P("Valor", "cellHead")],
        [P("Tarefas concluídas sem ajuda", "cell"), P("5 de 5 (100%)", "cellGray")],
        [P("Tempo total das 5 tarefas", "cell"), P("≈ 3 min 51 s", "cellGray")],
        [P("Cliques incorretos (total)", "cell"),
         P("25 (13 na Tarefa 8 — 52% do total)", "cellGray")],
        [P("Erros irrecuperáveis", "cell"), P("Nenhum registrado", "cellGray")],
    ]
    S.append(section_table(metricas_rows, [8 * cm, 8.5 * cm]))
    S.append(Spacer(1, 8))
    S.append(P(
        "<b>Comparação com as metas da Entrega III:</b> a Tarefa 3 (meta ≤ 50 s) "
        "foi concluída em 27 s, bem abaixo da meta. A Tarefa 6 (meta de 20–30 s) "
        "fechou em 30 s, no limite superior. A Tarefa 5 (meta ≤ 120 s para paciente "
        "novato) fechou em 29 s, com folga. Já a Tarefa 8, sem meta formal, "
        "concentrou o maior tempo (1 min 52 s) e o maior número de cliques "
        "incorretos (13) de toda a sessão — principal ponto de atenção desta "
        "rodada.",
        "body",
    ))

    # --- Página 3: síntese qualitativa ---
    S.append(P("2. Constatações qualitativas por papel", "h2"))
    S.append(P(
        "Síntese das 5 respostas de debriefing coletadas (1 de Ana, 4 de Lucas), uma "
        "por papel testado.",
        "body",
    ))
    qual_rows = [
        [P("Papel / Participante", "cellHead"), P("Facilidade", "cellHead"),
         P("Cores", "cellHead"), P("Tom das mensagens", "cellHead"),
         P("Observação principal", "cellHead")],
        [P("Admin./Terapeuta — Ana", "cell"), P("Fácil", "cellGray"),
         P("Ajudaram muito", "cellGray"), P("Claras e diretas", "cellGray"),
         P("Sugeriu indicar nº de faltas na tela de atestado e corrigir o pop-up "
           "de cancelamento.", "cellGray")],
        [P("Paciente (confirmação) — Lucas", "cell"), P("Muito Fácil", "cellGray"),
         P("Ajudaram muito", "cellGray"), P("Claras e diretas", "cellGray"),
         P("Sentiu-se limitado por poucas opções/botões disponíveis.", "cellGray")],
        [P("Administrador (isolado) — Lucas", "cell"), P("Muito Fácil", "cellGray"),
         P("Ajudaram muito", "cellGray"), P("Muito claro, simples e direto", "cellGray"),
         P("Ambas as versões oferecem todas as funcionalidades necessárias "
           "a um administrador.", "cellGray")],
        [P("Terapeuta (isolado) — Lucas", "cell"), P("Muito Fácil", "cellGray"),
         P("Ajudaram muito", "cellGray"), P("Não se deparou com mensagens", "cellGray"),
         P("Nenhum comportamento inesperado; sem sugestões adicionais.", "cellGray")],
        [P("Paciente (atestado) — Lucas", "cell"), P("Muito Fácil", "cellGray"),
         P("Ajudaram muito", "cellGray"), P("Claras e diretas", "cellGray"),
         P("Repetiu o pedido por mais opções (datas, documentos, "
           "perfil/configurações).", "cellGray")],
    ]
    S.append(section_table(
        qual_rows, [3.4 * cm, 2.1 * cm, 2.1 * cm, 2.9 * cm, 6.0 * cm]
    ))
    S.append(Spacer(1, 6))
    S.append(P(
        "As Tarefas 1, 2 e 4 do Plano (perfil Paciente em sentido estrito) não "
        "possuem cronometragem nesta rodada. A leitura qualitativa de Lucas, no papel "
        "Paciente, permite inferir que essas tarefas foram percebidas como de fácil "
        "execução, ainda que sem confirmação quantitativa.",
        "body",
    ))

    # --- Página 4: participante Ana ---
    S.append(P("3. Participante — Ana", "h2"))
    S.append(P("Administradora e Terapeuta · sessão cronometrada", "sub"))
    S.append(P(
        "Conclui as 5 tarefas cronometradas sem ajuda, incluindo 2 tarefas "
        "exploratórias fora do roteiro oficial. O maior tempo e volume de cliques da "
        "sessão concentrou-se no fluxo de cancelamento por excedente de faltas "
        "(Tarefa 8), conforme detalhado na Seção 1.",
        "body",
    ))
    S.append(P(
        "“Tive mais facilidade com a versão mobile por ser mais perto do que "
        "uso no dia a dia.”",
        "quote",
    ))
    S.append(P("Questionário de debriefing — Administração e Terapeuta (respostas originais)", "h3"))
    S.extend(qa_block([
        ("1", "Facilidade geral de uso do sistema?", "Fácil."),
        ("2", "As cores ajudaram a entender o estado de consultas/atestados?",
         "Sim, ajudaram muito."),
        ("3", "Diferença entre Desktop e Mobile?",
         "“Tive mais facilidade com a versão mobile por ser mais perto do que "
         "uso no dia a dia.”"),
        ("4", "Tarefa de maior dúvida ou frustração?",
         "“Não houveram grandes dúvidas ou frustrações. Tudo de muito "
         "fácil compreensão.”"),
        ("5", "Tom das mensagens de erro/aviso?",
         "“Pareciam claras e diretas ao propósito.”"),
        ("6", "Alguma funcionalidade se comportou de forma inesperada?", "Não."),
        ("7", "Sugestões de melhoria?",
         "“Indicar número de faltas atuais do paciente que solicitou abono de "
         "faltas com atestado. Fechar pop-up ao cancelar status de horário do "
         "paciente para cancelado com excedente de faltas.”"),
    ]))

    # --- Página 5: participante Lucas (Admin + Terapeuta) ---
    S.append(P("4. Participante — Lucas", "h2"))
    S.append(P("Testou os três papéis do sistema · sem cronometragem", "sub"))
    S.append(P(
        "Lucas respondeu 4 questionários de debriefing independentes, um para cada "
        "papel experimentado na mesma sessão: Administrador, Terapeuta, e Paciente "
        "(em dois momentos — confirmação de presença e fluxo de atestado).",
        "body",
    ))
    S.append(P("4.1 Papel Administrador", "h3"))
    S.extend(qa_block([
        ("1", "Facilidade geral de uso do sistema?", "Muito Fácil."),
        ("2", "As cores ajudaram a entender o estado de consultas/atestados?",
         "Sim, ajudaram muito."),
        ("3", "Diferença entre Desktop e Mobile?",
         "“Ambas as versões se enquadram na temática proposta, são claras "
         "e intuitivas de navegar. Ambas as versões dão todas as funcionalidades "
         "necessárias para um administrador.”"),
        ("4", "Tarefa de maior dúvida ou frustração?",
         "“Não senti nenhuma dúvida ou frustração.”"),
        ("5", "Tom das mensagens de erro/aviso?",
         "“Sim, foi muito claro, simples e direto.”"),
        ("6", "Alguma funcionalidade se comportou de forma inesperada?",
         "Não."),
        ("7", "Sugestões de melhoria?",
         "“Está muito bom, não possuo sugestões adicionais.”"),
    ]))
    S.append(P("4.2 Papel Terapeuta", "h3"))
    S.extend(qa_block([
        ("1", "Facilidade geral de uso do sistema?", "Muito Fácil."),
        ("2", "As cores ajudaram a entender o estado de consultas/atestados?",
         "Sim, ajudaram muito."),
        ("3", "Diferença entre Desktop e Mobile?",
         "“Ambas as versões se enquadram na temática proposta, são claras "
         "e intuitivas de navegar.”"),
        ("4", "Tarefa de maior dúvida ou frustração?",
         "“Achei claro e intuitivo, sem problemas.”"),
        ("5", "Tom das mensagens de erro/aviso?",
         "“Não me deparei com nenhuma mensagem de erro ou aviso.”"),
        ("6", "Alguma funcionalidade se comportou de forma inesperada?",
         "Não."),
        ("7", "Sugestões de melhoria?",
         "“Está muito bom, não possuo sugestões adicionais.”"),
    ]))

    # --- Página 6: participante Lucas (Paciente) ---
    S.append(P("4.3 Papel Paciente — confirmação de presença", "h3"))
    S.extend(qa_block([
        ("1", "Facilidade geral de uso do sistema?", "Muito Fácil."),
        ("2", "As cores ajudaram a entender o estado de consultas/atestados?",
         "Sim, ajudaram muito."),
        ("3", "Diferença entre Desktop e Mobile?",
         "“Achei que ambas as versões se enquadram na temática proposta, "
         "são claras e intuitivas de navegar.”"),
        ("4", "Tarefa de maior dúvida ou frustração?",
         "“Achei muito intuitivo, então não houveram muitos problemas, a "
         "maior dúvida que eu tive foi que têm poucos botões/opções para "
         "navegar, então me senti limitado quanto às minhas escolhas.”"),
        ("5", "Tom das mensagens de erro/aviso?",
         "“Pareciam claras e diretas, o que eu acredito que seja o ideal "
         "esperado de mensagens de erro do sistema.”"),
        ("6", "Alguma funcionalidade se comportou de forma inesperada?", "Não."),
        ("7", "Sugestões de melhoria?",
         "“Adicionar mais opções do que o paciente pode fazer como "
         "usuário: marcar datas diferentes, cancelar diretamente com o atestado, "
         "permitir outros documentos para cancelar além do atestado, marcar mais "
         "de uma data, ver o perfil, configurações, etc.”"),
    ]))
    S.append(P("4.4 Papel Paciente — fluxo de atestado", "h3"))
    S.append(P(
        "Respostas idênticas às da Seção 4.3, coletadas em um segundo "
        "momento da sessão — reforça a consistência da percepção de "
        "Lucas sobre o papel Paciente, inclusive o pedido repetido por mais opções "
        "funcionais.",
        "body",
    ))
    S.append(P(
        "“Não sabia onde olhar para ter certeza de que tinha descontado” "
        "não foi relatado; a única observação repetida foi o pedido por "
        "mais autonomia (datas alternativas, documentos de justificativa, acesso a "
        "perfil/configurações).",
        "quote",
    ))

    # --- Página 7: achados-chave ---
    S.append(P("5. Achados-chave consolidados", "h2"))
    achados = [
        ("5.1 Eficiência — fluxo de cancelamento por excedente de faltas (Tarefa 8)",
         "A Tarefa 8 apresentou o maior tempo (1 min 52 s) e o maior número de "
         "cliques incorretos (13, 52% do total) de toda a sessão de Ana. A sugestão "
         "da própria participante — fechar o pop-up após a ação de "
         "cancelamento — aponta a causa provável: o modal não se fecha "
         "adequadamente, levando a cliques repetidos ou exploratórios."),
        ("5.2 Escopo — limitação funcional percebida pelo Paciente",
         "Em duas respostas independentes (confirmação e atestado), Lucas "
         "relatou sentir-se limitado por haver poucos botões/opções "
         "disponíveis ao Paciente, sugerindo marcação de datas alternativas, "
         "cancelamento vinculado ao atestado, suporte a outros documentos e acesso a "
         "perfil/configurações. A Entrega II (Seção 2.2) define "
         "deliberadamente telas mínimas para o Paciente; a repetição do mesmo "
         "pedido sugere reavaliar esse equilíbrio."),
        ("5.3 Positivo — eficácia das cores semânticas e do tom das mensagens",
         "Nas 5 respostas de debriefing coletadas, as cores semânticas foram "
         "unanimemente avaliadas como “ajudaram muito”, e nenhuma resposta "
         "descreveu as mensagens do sistema como “punitivas” ou "
         "“confusas” — validando empiricamente as especificações de "
         "design da Entrega II (Seções 4.4.2 e 4.5)."),
    ]
    for title, text in achados:
        S.append(KeepTogether([P(title, "h3"), P(text, "body")]))

    # --- Página 8: métricas vs metas, sugestões, conclusão ---
    S.append(P("6. Métricas consolidadas e avaliação dos critérios de sucesso", "h2"))
    criterios_rows = [
        [P("Métrica", "cellHead"), P("Meta (Entrega III)", "cellHead"),
         P("Resultado real", "cellHead"), P("Status", "cellHead")],
        [P("Eficácia — Taxa de Conclusão T1", "cell"),
         P("≥ 70% sem ajuda; ≥ 90% em tarefas críticas", "cellGray"),
         P("100% (5/5) — Ana", "cellGray"), P("Atendido", "cell")],
        [P("Eficiência — Aprovar atestado (T3)", "cell"),
         P("≤ 50 s", "cellGray"), P("27 s", "cellGray"), P("Atendido", "cell")],
        [P("Eficiência — Alternar perfil (T6)", "cell"),
         P("≈ 20–30 s", "cellGray"), P("30 s", "cellGray"),
         P("Atendido (limite)", "cell")],
        [P("Eficiência — Tarefa extra (T8)", "cell"),
         P("Não definida no Plano oficial", "cellGray"),
         P("1 min 52 s; 13 cliques inc.", "cellGray"), P("Ponto de atenção", "cell")],
        [P("Satisfação — Escore SUS", "cell"),
         P("Escore médio ≥ 70", "cellGray"),
         P("Não aplicado nesta rodada", "cellGray"), P("Não avaliado", "cell")],
        [P("Satisfação — Subjetiva", "cell"),
         P("≥ 80% em “Fácil”/“Muito Fácil”", "cellGray"),
         P("5 de 5 (100%)", "cellGray"), P("Atendido", "cell")],
        [P("Mensagens de erro — Recepção", "cell"),
         P("Nenhuma descrição como “punitiva”/“confusa”", "cellGray"),
         P("0 de 4 respostas válidas", "cellGray"), P("Atendido", "cell")],
        [P("Cores semânticas", "cell"),
         P("≥ 80% em “Ajudaram muito”/“Parcialmente”", "cellGray"),
         P("5 de 5 (100%)", "cellGray"), P("Atendido", "cell")],
        [P("Taxa de erros irrecuperáveis", "cell"),
         P("Zero em tarefas críticas", "cellGray"),
         P("Zero registrado; fricção recuperável em T8", "cellGray"),
         P("Atendido", "cell")],
    ]
    S.append(section_table(
        criterios_rows, [4.3 * cm, 4.8 * cm, 4.5 * cm, 3.4 * cm]
    ))

    S.append(P("7. Sugestões de melhoria", "h2"))
    S.append(P("7.1 Sugestões dos participantes", "h3"))
    for item in [
        "Indicar o número de faltas atuais do paciente diretamente na tela de "
        "aprovação de atestado (Ana).",
        "Corrigir o pop-up de cancelamento por excedente de faltas, que não se "
        "fecha corretamente após a ação (Ana — correlato à Tarefa 8).",
        "Ampliar as opções do Paciente: datas alternativas, cancelamento "
        "vinculado ao atestado, outros documentos de justificativa, múltiplas "
        "datas e acesso a perfil/configurações (Lucas).",
    ]:
        S.append(P(f"• {item}", "body"))

    S.append(P("7.2 Recomendações da equipe (próxima iteração)", "h3"))
    for item in [
        "Investigar o componente de modal do fluxo de cancelamento por excedente de "
        "faltas (52% dos cliques incorretos da sessão).",
        "Avaliar, com a equipe de Design Participativo, um meio-termo entre telas "
        "mínimas para o Paciente e a demanda repetida por mais controle.",
        "Aplicar a Escala SUS em todas as sessões futuras e ampliar a amostra para "
        "8–13 participantes, cobrindo as Tarefas 1, 2 e 4 com cronometragem.",
    ]:
        S.append(P(f"• {item}", "body"))

    S.append(P("8. Conclusão e próximos passos", "h2"))
    S.append(P(
        "A rodada real indicou um protótipo com alta autoexplicabilidade: todas as "
        "5 tarefas cronometradas de Ana foram concluídas sem ajuda, e as 5 "
        "respostas de debriefing convergiram para a percepção “Fácil” ou "
        "“Muito Fácil”. As cores semânticas e o tom das mensagens, pilares "
        "de design da Entrega II, foram validados sem ressalvas. Um ponto "
        "acionável se destaca para a próxima iteração do ciclo RAD: o modal "
        "de cancelamento por excedente de faltas (Tarefa 8).",
        "body",
    ))
    S.append(P(
        "Próximos passos: corrigir o pop-up de cancelamento; avaliar a ampliação controlada de "
        "opções do Paciente; aplicar a Escala SUS e ampliar a amostra em "
        "sessões futuras.",
        "body",
    ))
    S.append(Spacer(1, 6))
    S.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    S.append(P(
        "<b>Fontes:</b> Plano de Teste de Usabilidade do ClinicApp (Entrega III); "
        "Questionários de debriefing e Folha de Coleta Resumida preenchidos por "
        "Ana e Lucas (material_testes/); Relatório Final de Resultados do Teste de "
        "Usabilidade (versão prévia da equipe).",
        "small",
    ))

    doc.build(S, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"Gerado: {OUT_PATH}")


if __name__ == "__main__":
    build()
