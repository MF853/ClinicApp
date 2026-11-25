"""Gera a Apresentacao de Resultados de Usabilidade do ClinicApp (dados reais).

Visual alinhado ao sistema da aplicacao (frontend/src/styles/tokens.css) e ao
pitch academico (output/presentations/ClinicApp-Pitch-Academico.pptx).
Fonte dos dados: material_testes/.

Uso: pip install reportlab fonttools brotli && python3 generate_apresentacao_usabilidade.py
"""
import os
import tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, "frontend", "src", "assets", "fonts")
OUT_PATH = os.path.join(ROOT, "output", "pdf", "ClinicApp_Apresentacao_Resultados.pdf")

PAGE_W, PAGE_H = 1280, 720
MARGIN = 72
CONTENT_W = PAGE_W - 2 * MARGIN
MEASURE = 680  # ~75 caracteres a 16 px

# tokens.css
PURPLE = HexColor("#845EC2")
LILAC = HexColor("#C493FF")
CREAM = HexColor("#FEFEDF")
SAND = HexColor("#D5CABD")
SURFACE = HexColor("#F2EDE7")
INK = HexColor("#292332")
PANEL = HexColor("#FFFDF9")
ACCENT_INK = HexColor("#442369")
BORDER = HexColor("#A99B8B")
SHADOW = HexColor("#D6CDC2")
GRAY = HexColor("#554D5C")
GREEN, GREEN_BG = HexColor("#1A7A4A"), HexColor("#E6F4ED")
YELLOW, YELLOW_BG = HexColor("#8A6800"), HexColor("#FFF8E1")
RED, RED_BG = HexColor("#B53A2F"), HexColor("#FDECEB")
GRAY_BG = HexColor("#F8F7F4")
LILAC_BG = HexColor("#EFE6FA")
SAND_BG = HexColor("#EAE3DA")
WHITE = HexColor("#FFFFFF")
COVER_BG = HexColor("#3B2566")
COVER_CIRCLE = HexColor("#4E3380")

SANS, SANS_SB, SANS_B, SANS_XB = "NewZen", "NewZen-SemiBold", "NewZen-Bold", "NewZen-ExtraBold"
SERIF = "Literata-SemiBold"

FOOTER = "ClinicApp · Teste de usabilidade · UPE / Escola Politécnica"
TOTAL = 12


def cff_to_truetype(font, max_err=1.0):
    """New Zen vem com contornos CFF, que o reportlab nao embute; converte para glyf."""
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.ttLib import newTable
    order = font.getGlyphOrder()
    gs = font.getGlyphSet()
    glyf = newTable("glyf")
    glyf.glyphOrder = order
    glyf.glyphs = {}
    for name in order:
        tt_pen = TTGlyphPen(gs)
        gs[name].draw(Cu2QuPen(tt_pen, max_err, reverse_direction=True))
        glyf.glyphs[name] = tt_pen.glyph()
    font["glyf"] = glyf
    font["loca"] = newTable("loca")
    maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    for attr in ("maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs",
                 "maxInstructionDefs", "maxStackElements", "maxSizeOfInstructions",
                 "maxComponentElements", "maxComponentDepth"):
        setattr(maxp, attr, 0)
    maxp.maxZones = 1
    font["maxp"] = maxp
    post = font["post"]
    post.formatType = 2.0
    post.extraNames, post.mapping, post.glyphOrder = [], {}, order
    for tag in ("CFF ", "VORG"):
        if tag in font:
            del font[tag]
    font.sfntVersion = "\x00\x01\x00\x00"
    return font


def register_fonts():
    from fontTools.ttLib import TTFont as FTFont
    from fontTools.varLib import instancer
    cache_dir = os.path.join(tempfile.gettempdir(), "clinicapp-fonts")
    os.makedirs(cache_dir, exist_ok=True)
    for name, fn in (("NewZen", "NewZen-Regular.ttf"), ("NewZen-SemiBold", "NewZen-SemiBold.ttf"),
                     ("NewZen-Bold", "NewZen-Bold.ttf"), ("NewZen-ExtraBold", "NewZen-ExtraBold.ttf")):
        cache = os.path.join(cache_dir, fn)
        if not os.path.exists(cache):
            cff_to_truetype(FTFont(os.path.join(FONT_DIR, fn))).save(cache)
        pdfmetrics.registerFont(TTFont(name, cache))
    cache = os.path.join(cache_dir, "Literata-SemiBold.ttf")
    if not os.path.exists(cache):
        vf = FTFont(os.path.join(FONT_DIR, "Literata-Variable.woff2"))
        vf.flavor = None
        instancer.instantiateVariableFont(vf, {"wght": 600, "opsz": 36}).save(cache)
    pdfmetrics.registerFont(TTFont("Literata-SemiBold", cache))


def wrap(text, font, size, max_width):
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if stringWidth(trial, font, size) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def text_block(c, x, y, text, font, size, color, max_width, leading=None):
    leading = leading or round(size * 1.45)
    lines = wrap(text, font, size, max_width)
    c.setFont(font, size)
    c.setFillColor(color)
    for i, line in enumerate(lines):
        c.drawString(x, y - i * leading, line)
    return y - len(lines) * leading


def panel(c, x, y, w, h, bg=PANEL, radius=20):
    """Painel elevado do sistema: sombra suave + luz, como --raised."""
    for off, alpha in ((10, 0.05), (7, 0.07), (4, 0.09)):
        c.saveState()
        c.setFillColor(SHADOW)
        c.setFillAlpha(alpha)
        c.roundRect(x + off * 0.6, y - h - off * 0.6, w, h, radius, fill=1, stroke=0)
        c.restoreState()
    c.setFillColor(bg)
    c.setStrokeColor(SAND)
    c.setLineWidth(1)
    c.roundRect(x, y - h, w, h, radius, fill=1, stroke=1)


def badge(c, x, y, text, bg, fg, size=14, pad_x=12, h=28):
    w = stringWidth(text, SANS_SB, size) + 2 * pad_x
    c.setFillColor(bg)
    c.setStrokeColor(fg)
    c.setLineWidth(1)
    c.roundRect(x, y - h / 2, w, h, h / 2, fill=1, stroke=1)
    c.setFont(SANS_SB, size)
    c.setFillColor(fg)
    c.drawString(x + pad_x, y - size * 0.35, text)
    return w


def numeral(c, x, y, n, r=18, size=17):
    c.setFillColor(PURPLE)
    c.circle(x, y, r, fill=1, stroke=0)
    c.setFont(SANS_B, size)
    c.setFillColor(WHITE)
    c.drawCentredString(x, y - size * 0.36, str(n))


def rule(c, x1, y, x2, color=SAND):
    c.setStrokeColor(color)
    c.setLineWidth(1)
    c.line(x1, y, x2, y)


def chrome(c, n, title, subtitle=None):
    c.setFillColor(SURFACE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFont(SERIF, 42)
    c.setFillColor(ACCENT_INK)
    c.drawString(MARGIN, PAGE_H - 112, title)
    top = PAGE_H - 112
    if subtitle:
        c.setFont(SANS, 18)
        c.setFillColor(GRAY)
        c.drawString(MARGIN, top - 34, subtitle)
        top -= 34
    c.setFont(SANS, 12)
    c.setFillColor(GRAY)
    c.drawString(MARGIN, 40, FOOTER)
    c.drawRightString(PAGE_W - MARGIN, 40, f"{n:02d} / {TOTAL}")
    return top - 50


def table(c, x, y, col_w, header, rows, size=16, leading=22, pad=11):
    """Celula: str | (str, cor) | ('badge', texto, bg, fg)."""
    c.setFont(SANS_SB, 14)
    c.setFillColor(ACCENT_INK)
    cx = x
    for h, w in zip(header, col_w):
        c.drawString(cx, y, h)
        cx += w
    rule(c, x, y - 10, x + sum(col_w), PURPLE)
    y -= 10 + pad + size
    for row in rows:
        cells, n = [], 1
        for i, (cell, w) in enumerate(zip(row, col_w)):
            if isinstance(cell, tuple) and cell[0] == "badge":
                cells.append(("badge", cell[1:]))
                continue
            text, color = (cell if isinstance(cell, tuple) else (cell, None))
            font = SANS_SB if i == 0 else SANS
            color = color or (INK if i == 0 else GRAY)
            lines = wrap(text, font, size, w - 16)
            n = max(n, len(lines))
            cells.append((lines, font, color))
        cx = x
        for cell, w in zip(cells, col_w):
            if cell[0] == "badge":
                badge(c, cx, y + size * 0.35, *cell[1])
            else:
                lines, font, color = cell
                c.setFont(font, size)
                c.setFillColor(color)
                for j, line in enumerate(lines):
                    c.drawString(cx, y - j * leading, line)
            cx += w
        y -= (n - 1) * leading + pad
        rule(c, x, y - 6, x + sum(col_w))
        y -= pad + size
    return y


# ---------------------------------------------------------------- slides

def slide_cover(c):
    c.setFillColor(COVER_BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(COVER_CIRCLE)
    c.circle(1010, 640, 300, fill=1, stroke=0)
    c.circle(1180, 60, 190, fill=1, stroke=0)

    c.setFont(SANS_SB, 14)
    c.setFillColor(LILAC)
    c.drawString(MARGIN, PAGE_H - 64, "UNIVERSIDADE DE PERNAMBUCO · ESCOLA POLITÉCNICA DE PERNAMBUCO · ENTREGA III")

    c.setFont(SERIF, 88)
    c.setFillColor(CREAM)
    c.drawString(MARGIN - 4, PAGE_H - 230, "ClinicApp")
    c.setFont(SANS_SB, 30)
    c.setFillColor(WHITE)
    c.drawString(MARGIN, PAGE_H - 280, "Resultados do teste de usabilidade")
    text_block(c, MARGIN, PAGE_H - 330,
               "Dois participantes reais, três papéis, cinco tarefas cronometradas "
               "— e nenhuma falha.",
               SANS, 22, LILAC, 560, leading=31)

    c.setFont(SANS_SB, 16)
    c.setFillColor(LILAC)
    c.drawString(MARGIN, 168, "Grupo")
    c.setFont(SANS, 17)
    c.setFillColor(WHITE)
    for i, name in enumerate(("Guilherme Santos Carrazzoni de Carvalho",
                              "José Mário da Silva Filho", "Vinícius Moura de Oliveira")):
        c.drawString(MARGIN, 140 - i * 26, name)


def card(c, x, y, w, h, title, text, bg=PANEL, size=16):
    panel(c, x, y, w, h, bg=bg)
    c.setFont(SERIF, 22)
    c.setFillColor(ACCENT_INK)
    c.drawString(x + 28, y - 44, title)
    text_block(c, x + 28, y - 76, text, SANS, size, INK, w - 56, leading=round(size * 1.45))


def slide_method(c):
    top = chrome(c, 2, "Como testamos",
                 "Plano de Teste de Usabilidade da Entrega III · Aula 10 de IHC (Interação Humano-Computador)")
    gap = 28
    w = (CONTENT_W - gap) / 2
    h = 168
    card(c, MARGIN, top + 8, w, h, "Quatro dimensões da ISO 9241",
         "Eficácia (conclusão), eficiência (tempo e cliques incorretos), "
         "satisfação e taxa de erros. Mais a autoexplicabilidade: concluir sem "
         "treinamento prévio.")
    card(c, MARGIN + w + gap, top + 8, w, h, "Duas tentativas por tarefa",
         "Tentativa 1 livre, sem dicas — único tempo que conta. Tentativa 2 "
         "com orientação só após falha. Nesta rodada nenhuma Tentativa 2 "
         "foi necessária.")
    y2 = top + 8 - h - 26
    card(c, MARGIN, y2, w, h, "Pensando em voz alta",
         "Sem treinamento, com TCLE (Termo de Consentimento Livre e Esclarecido) e "
         "gravação de tela e mãos. Coordenador neutro, sessão de 25 a 35 "
         "minutos.")
    card(c, MARGIN + w + gap, y2, w, h, "Dois instrumentos",
         "Folha de Coleta Resumida (tempo, cliques incorretos, resultado) preenchida "
         "pelo coordenador e questionário de debriefing com sete perguntas "
         "qualitativas.")


def slide_participants(c):
    top = chrome(c, 3, "Quem testou",
                 "Cada participante usou contas reais dos papéis correspondentes")
    gap = 28
    w = (CONTENT_W - gap) / 2
    h = 262
    for i, (name, roles, method, tag_bg, tag_fg, tag, detail) in enumerate((
        ("Ana", "Administradora e Terapeuta", "Sessão cronometrada", GREEN_BG, GREEN,
         "Tempo + cliques",
         "Cinco tarefas com tempo e cliques incorretos — três do roteiro oficial "
         "e duas exploratórias — e um questionário qualitativo para os dois "
         "papéis."),
        ("Lucas", "Administrador, Terapeuta e Paciente", "Debriefing qualitativo",
         HexColor("#E8EFF8"), HexColor("#1F4E79"), "Questionários",
         "Sem cronometragem. Quatro questionários independentes, um por papel: "
         "Administrador, Terapeuta e Paciente em dois momentos (confirmação e "
         "atestado)."),
    )):
        x = MARGIN + i * (w + gap)
        panel(c, x, top + 8, w, h)
        c.setFont(SERIF, 34)
        c.setFillColor(ACCENT_INK)
        c.drawString(x + 28, top - 44, name)
        badge(c, x + 28 + stringWidth(name, SERIF, 34) + 18, top - 34, tag, tag_bg, tag_fg)
        c.setFont(SANS_SB, 17)
        c.setFillColor(PURPLE)
        c.drawString(x + 28, top - 76, roles)
        rule(c, x + 28, top - 96, x + w - 28)
        c.setFont(SANS_B, 16)
        c.setFillColor(INK)
        c.drawString(x + 28, top - 126, method)
        text_block(c, x + 28, top - 152, detail, SANS, 16, GRAY, w - 56, leading=24)

    panel(c, MARGIN, top + 8 - h - 26, CONTENT_W, 74, bg=CREAM)
    text_block(c, MARGIN + 28, top + 8 - h - 26 - 30,
               "A Escala SUS (System Usability Scale, Seção 6.1 do Plano) não foi aplicada: "
               "os formulários traziam só as perguntas qualitativas. A satisfação é lida "
               "pelas respostas de debriefing.",
               SANS, 16, INK, CONTENT_W - 56, leading=23)


def slide_coverage(c):
    top = chrome(c, 4, "O roteiro e o que foi coberto",
                 "Seis tarefas do Plano, mais duas exploratórias na sessão de Ana")
    T, Q, N = ("badge", "Cronometrada", GREEN_BG, GREEN), ("badge", "Debriefing", HexColor("#E8EFF8"), HexColor("#1F4E79")), ("badge", "Sem dado", YELLOW_BG, YELLOW)
    rows = [
        ("T1 · Registrar falta não justificada", "Administrador · Desktop", Q, "Lucas como Administrador"),
        ("T2 · Cancelar e solicitar encaixe", "Paciente · Desktop", Q, "Lucas como Paciente (atestado)"),
        ("T3 · Aprovar atestado médico", "Administrador · Mobile", T, "Ana — 27 s, 4 cliques incorretos"),
        ("T4 · Acompanhar status do encaixe", "Paciente · Mobile", N, "Nenhum participante cobriu"),
        ("T5 · Confirmar presença", "Paciente · Mobile", T, "Ana — 29 s, 2 cliques; Lucas como Paciente"),
        ("T6 · Alternar perfil sem logoff", "Terapeuta · Desktop", T, "Ana — 30 s, 4 cliques incorretos"),
        ("T7 e T8 · Exploratórias", "Administradora · Desktop", T, "Ana — 33 s e 1 min 52 s"),
    ]
    table(c, MARGIN, top + 4, [370, 250, 170, CONTENT_W - 790],
          ["Tarefa do Plano", "Perfil · dispositivo", "Coleta", "Quem e como"], rows,
          size=16, leading=22, pad=9)


def slide_tasks(c):
    top = chrome(c, 5, "Tempo e cliques por tarefa",
                 "Ana · Tentativa 1, sem dicas · traço escuro = meta da Entrega III")
    tasks = [
        ("Aprovar atestado médico", "T3 · Mobile", 27, 50, "27 s", "4 cliques inc.", PURPLE),
        ("Confirmar presença via notificação", "T5 · Mobile", 29, 120, "29 s", "2 cliques inc.", PURPLE),
        ("Alternar perfil Terapeuta / Administrador", "T6 · Desktop", 30, 30, "30 s", "4 cliques inc.", PURPLE),
        ("Exploratória — grade e restrições", "T7 · sem meta", 33, None, "33 s", "2 cliques inc.", PURPLE),
        ("Exploratória — cancelamento por faltas", "T8 · sem meta", 112, None, "1 min 52 s", "13 cliques inc.", YELLOW),
    ]
    label_w, val_w = 420, 200
    bar_x = MARGIN + label_w
    bar_w = CONTENT_W - label_w - val_w
    y = top
    for name, code, secs, meta, value, clicks, color in tasks:
        c.setFont(SANS_SB, 18)
        c.setFillColor(INK)
        c.drawString(MARGIN, y, name)
        c.setFont(SANS, 14)
        c.setFillColor(GRAY)
        c.drawString(MARGIN, y - 20, code)
        c.setFillColor(SAND_BG)
        c.roundRect(bar_x, y - 12, bar_w, 22, 11, fill=1, stroke=0)
        c.setFillColor(color)
        c.roundRect(bar_x, y - 12, max(bar_w * secs / 120, 22), 22, 11, fill=1, stroke=0)
        if meta:
            mx = bar_x + bar_w * meta / 120
            c.setStrokeColor(ACCENT_INK)
            c.setLineWidth(3)
            c.line(mx, y - 18, mx, y + 16)
        c.setFont(SANS_XB, 20)
        c.setFillColor(ACCENT_INK if color is PURPLE else YELLOW)
        c.drawString(bar_x + bar_w + 22, y - 2, value)
        c.setFont(SANS, 14)
        c.setFillColor(GRAY if color is PURPLE else YELLOW)
        c.drawString(bar_x + bar_w + 22, y - 20, clicks)
        y -= 70
    panel(c, MARGIN, y + 18, CONTENT_W, 74, bg=CREAM)
    text_block(c, MARGIN + 28, y - 12,
               "Cinco de cinco sem ajuda e dentro das metas; 3 min 51 s no total. Dos 25 cliques "
               "incorretos, 13 (52%) estão na Tarefa 8 — o único ponto de fricção mensurável.",
               SANS, 16, INK, CONTENT_W - 56, leading=23)


def slide_goals(c):
    top = chrome(c, 6, "Metas da Entrega III",
                 "Critérios de sucesso da Seção 7 do Plano confrontados com os dados desta rodada")
    OK = ("badge", "Atendido", GREEN_BG, GREEN)
    rows = [
        ("Conclusão na Tentativa 1", "≥ 70% sem ajuda; ≥ 90% nas críticas", "100% (5 de 5)", OK),
        ("Aprovar atestado (T3)", "≤ 50 s", "27 s", OK),
        ("Confirmar presença (T5)", "≤ 2 min para paciente novato", "29 s", OK),
        ("Alternar perfil (T6)", "20 a 30 s", "30 s", ("badge", "No limite", YELLOW_BG, YELLOW)),
        ("Escala SUS", "Média acima de 70", "Não aplicada", ("badge", "Não avaliado", GRAY_BG, GRAY)),
        ("Percepção subjetiva", "≥ 80% “Fácil” ou “Muito Fácil”", "100% (5 de 5)", OK),
        ("Tom das mensagens", "Nenhuma “punitiva” ou “confusa”", "0 de 4 respostas", OK),
        ("Cores semânticas", "≥ 80% ajudaram", "100% (5 de 5)", OK),
        ("Erros irrecuperáveis", "Zero nas tarefas críticas", "Zero", OK),
    ]
    table(c, MARGIN, top + 4, [330, 400, 230, CONTENT_W - 960],
          ["Métrica", "Meta", "Resultado", "Status"], rows, size=16, leading=22, pad=7)


def dots(c, x, y, filled, total, r=11, step=34):
    for i in range(total):
        cx = x + i * step
        if i < filled:
            c.setFillColor(PURPLE)
            c.circle(cx, y, r, fill=1, stroke=0)
        else:
            c.setStrokeColor(PURPLE)
            c.setLineWidth(2)
            c.circle(cx, y, r, fill=0, stroke=1)


def slide_satisfaction(c):
    top = chrome(c, 7, "O que os participantes disseram",
                 "Cinco respostas de debriefing — uma de Ana, quatro de Lucas — cada ponto é uma resposta")
    rows = [
        ("Percepção “Fácil” ou “Muito Fácil”", 5, "Ana: “Fácil”. Lucas: “Muito Fácil” nos quatro papéis"),
        ("Cores semânticas “ajudaram muito”", 5, "Verde, amarelo, vermelho e cinza leram o estado sem texto"),
        ("Mensagens claras, sem tom punitivo", 4, "Uma resposta não encontrou mensagens; nenhuma negativa"),
        ("Desktop e Mobile claros de navegar", 5, "Ana preferiu o mobile; Lucas achou as duas versões intuitivas"),
    ]
    y = top - 6
    dots_x = MARGIN + 640
    for i, (label, k, note) in enumerate(rows):
        c.setFont(SANS_SB, 19)
        c.setFillColor(INK)
        c.drawString(MARGIN, y, label)
        c.setFont(SANS, 15)
        c.setFillColor(GRAY)
        c.drawString(MARGIN, y - 24, note)
        dots(c, dots_x, y + 4, k, 5)
        c.setFont(SANS_XB, 20)
        c.setFillColor(ACCENT_INK)
        c.drawString(dots_x + 5 * 34 + 8, y - 3, f"{k} de 5")
        if i < len(rows) - 1:
            rule(c, MARGIN, y - 48, PAGE_W - MARGIN)
        y -= 98


def slide_roles(c):
    top = chrome(c, 8, "Resposta por papel testado",
                 "Perguntas 1, 2, 3 e 5 do questionário de debriefing")
    MF = ("badge", "Muito Fácil", GREEN_BG, GREEN)
    F = ("badge", "Fácil", GREEN_BG, GREEN)
    rows = [
        ("Ana · Admin. e Terapeuta", F, "Ajudaram muito", "Claras e diretas", "Mais fácil no mobile"),
        ("Lucas · Administrador", MF, "Ajudaram muito", "Muito claro e direto", "Ambas completas e intuitivas"),
        ("Lucas · Terapeuta", MF, "Ajudaram muito", ("Não viu mensagens", GRAY), "Ambas intuitivas"),
        ("Lucas · Paciente (confirmação)", MF, "Ajudaram muito", "“O ideal esperado”", "Ambas intuitivas"),
        ("Lucas · Paciente (atestado)", MF, "Ajudaram muito", "“O ideal esperado”", "Ambas intuitivas"),
    ]
    y = table(c, MARGIN, top + 4, [330, 170, 190, 220, CONTENT_W - 910],
              ["Participante · papel", "Facilidade", "Cores", "Mensagens", "Desktop × Mobile"],
              rows, size=16, leading=22, pad=11)
    text_block(c, MARGIN, y - 10,
               "Na pergunta 4 (tarefa de maior dúvida), ninguém relatou frustração; a única "
               "ressalva foi a sensação de poucas opções no papel de Paciente.",
               SANS, 16, GRAY, MEASURE + 120, leading=23)


def slide_quotes(c):
    top = chrome(c, 9, "Nas palavras deles", "Depoimentos transcritos do questionário de debriefing")
    gap = 24
    w = (CONTENT_W - 2 * gap) / 3
    h = 200
    quotes = [
        ("Tive mais facilidade com a versão mobile por ser mais perto do que uso no dia a dia.", "Ana", "Admin. e Terapeuta"),
        ("Não houveram grandes dúvidas ou frustrações. Tudo de muito fácil compreensão.", "Ana", "Admin. e Terapeuta"),
        ("Ambas as versões dão todas as funcionalidades necessárias para um administrador.", "Lucas", "Administrador"),
        ("Têm poucos botões e opções para navegar, então me senti limitado quanto às minhas escolhas.", "Lucas", "Paciente"),
        ("Pareciam claras e diretas, o que eu acredito que seja o ideal esperado de mensagens de erro.", "Lucas", "Paciente"),
        ("Indicar número de faltas atuais do paciente que solicitou abono de faltas com atestado.", "Ana", "Sugestão · Tarefa 3"),
    ]
    for i, (q, who, role) in enumerate(quotes):
        col, row = i % 3, i // 3
        x = MARGIN + col * (w + gap)
        y = top + 8 - row * (h + 24)
        panel(c, x, y, w, h, bg=CREAM if row == 1 else PANEL)
        c.setFont(SERIF, 48)
        c.setFillColor(LILAC)
        c.drawString(x + 22, y - 48, "“")
        text_block(c, x + 24, y - 66, q, SANS, 16.5, INK, w - 48, leading=23)
        c.setFont(SANS_B, 15)
        c.setFillColor(PURPLE)
        c.drawString(x + 24, y - h + 42, who)
        c.setFont(SANS, 14)
        c.setFillColor(GRAY)
        c.drawString(x + 24, y - h + 22, role)


def slide_findings(c):
    top = chrome(c, 10, "Quatro achados", "Dados cronometrados de Ana cruzados com as respostas de Ana e Lucas")
    gap = 28
    w = (CONTENT_W - gap) / 2
    h = 176
    items = [
        ("O modal de cancelamento não fecha", "Atenção", YELLOW_BG, YELLOW,
         "Tarefa 8: 1 min 52 s e 13 cliques incorretos (52% da sessão). A própria "
         "participante apontou a causa: o pop-up permanece aberto após a ação."),
        ("O Paciente se sente limitado", "Escopo", LILAC_BG, ACCENT_INK,
         "Lucas pediu, em duas respostas, mais opções: datas alternativas ou múltiplas, "
         "cancelar direto com o atestado, outros documentos, perfil e configurações."),
        ("O atestado não mostra as faltas", "Sugestão", LILAC_BG, ACCENT_INK,
         "Ana sugeriu exibir o contador de faltas de quem pediu o abono na própria tela "
         "de aprovação — o dado de que o administrador precisa para decidir."),
        ("Cores e mensagens já funcionam", "Validado", GREEN_BG, GREEN,
         "Cinco de cinco respostas: as cores semânticas ajudaram muito; nenhuma "
         "descreveu as mensagens como punitivas ou confusas."),
    ]
    for i, (title, tag, bg, fg, text) in enumerate(items):
        x = MARGIN + (i % 2) * (w + gap)
        y = top + 8 - (i // 2) * (h + 26)
        panel(c, x, y, w, h)
        c.setFont(SERIF, 22)
        c.setFillColor(ACCENT_INK)
        c.drawString(x + 28, y - 44, title)
        badge(c, x + w - 28 - stringWidth(tag, SANS_SB, 13) - 24, y - 36, tag, bg, fg, size=13, h=26)
        text_block(c, x + 28, y - 78, text, SANS, 16, INK, w - 56, leading=23)


def slide_priorities(c):
    top = chrome(c, 11, "O que fazer a seguir, por ordem",
                 "Próxima iteração do ciclo RAD (Rapid Application Development)")
    items = [
        ("Fechar o pop-up de cancelamento",
         "Investigar o modal do fluxo de excedente de faltas, responsável por 52% dos cliques incorretos."),
        ("Mostrar as faltas na aprovação do atestado",
         "Exibir o contador atual de faltas do paciente ao lado do atestado pendente (Tarefa 3)."),
        ("Reavaliar o escopo do Paciente",
         "Com a equipe de Design Participativo, achar o meio-termo entre telas mínimas e mais controle."),
        ("Preservar o que já funciona",
         "Cores com rótulo, mensagens diretas, alternância de perfil sem logoff, confirmação em um toque."),
    ]
    y = top - 10
    for i, (title, text) in enumerate(items):
        numeral(c, MARGIN + 18, y + 6, i + 1, r=20, size=18)
        c.setFont(SANS_B, 21)
        c.setFillColor(INK)
        c.drawString(MARGIN + 60, y, title)
        text_block(c, MARGIN + 60, y - 28, text, SANS, 16, GRAY, MEASURE + 200, leading=23)
        if i < 3:
            c.setStrokeColor(LILAC)
            c.setLineWidth(2)
            c.line(MARGIN + 18, y - 16, MARGIN + 18, y - 76)
        y -= 104


def slide_limits(c):
    top = chrome(c, 12, "Limites desta rodada", "Resultados formativos: orientam a próxima iteração, não validam estatisticamente")
    items = [
        ("Amostra", "2 participantes contra 8 a 13 previstos no Plano. Critérios lidos tarefa a tarefa, não como média."),
        ("Escala SUS", "Não aplicada; a satisfação foi lida pela percepção geral e pelos comentários abertos."),
        ("Cronometragem", "Só Ana foi cronometrada. Tarefas 1, 2 e 4 sem tempo; a Tarefa 5 (Paciente) cronometrada com uma administradora."),
        ("Protótipo", "Versão testada era um mock simplificado para a gravação; alguns controles vistos não existirão na versão final."),
    ]
    lw = 700
    y = top - 4
    for title, text in items:
        c.setFont(SANS_B, 18)
        c.setFillColor(ACCENT_INK)
        c.drawString(MARGIN, y, title)
        text_block(c, MARGIN + 190, y, text, SANS, 16, INK, lw - 190, leading=23)
        rule(c, MARGIN, y - 36, MARGIN + lw)
        y -= 84
    px, pw = MARGIN + lw + 40, CONTENT_W - lw - 40
    panel(c, px, top + 8, pw, 292, bg=CREAM)
    c.setFont(SERIF, 22)
    c.setFillColor(ACCENT_INK)
    c.drawString(px + 28, top - 36, "Próxima rodada")
    yy = top - 74
    for item in ("Aplicar a Escala SUS em todas as sessões",
                 "Recrutar 8 a 13 participantes nas três categorias",
                 "Cronometrar as Tarefas 1, 2 e 4 com pacientes reais",
                 "Retestar o fluxo de cancelamento corrigido"):
        c.setFillColor(PURPLE)
        c.circle(px + 34, yy + 6, 4, fill=1, stroke=0)
        yy = text_block(c, px + 50, yy, item, SANS, 16, INK, pw - 80, leading=23) - 10


SLIDES = (slide_cover, slide_method, slide_participants, slide_coverage, slide_tasks,
          slide_goals, slide_satisfaction, slide_roles, slide_quotes, slide_findings,
          slide_priorities, slide_limits)
assert len(SLIDES) == TOTAL


def build():
    register_fonts()
    c = canvas.Canvas(OUT_PATH, pagesize=(PAGE_W, PAGE_H))
    c.setTitle("ClinicApp - Resultados reais de usabilidade")
    c.setAuthor("Guilherme Carrazzoni, José Mário da Silva Filho, Vinícius Moura")
    for slide in SLIDES:
        slide(c)
        c.showPage()
    c.save()
    print(f"Gerado: {OUT_PATH}")


if __name__ == "__main__":
    build()
