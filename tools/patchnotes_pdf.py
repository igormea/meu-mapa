"""Gera o Patch Notes em PDF a partir de data/patchnotes.json. Uso: python3 tools/patchnotes_pdf.py saida.pdf"""
import json, re, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
F = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", F + "DejaVuSans.ttf")); pdfmetrics.registerFont(TTFont("SB", F + "DejaVuSans-Bold.ttf"))
NAVY, GOLD, RED, INK = colors.HexColor("#141a44"), colors.HexColor("#b8892c"), colors.HexColor("#8f1d2c"), colors.HexColor("#22223a")
noemo = lambda t: re.sub(r"[\U0001F000-\U0001FFFF☀-➿️⭐⚖]", "", t).replace("  ", " ").strip()
st = dict(
    h=ParagraphStyle("h", fontName="SB", fontSize=24, leading=30, textColor=NAVY, spaceAfter=4),
    s=ParagraphStyle("s", fontName="S", fontSize=10.5, textColor=colors.HexColor("#555"), spaceAfter=14, leading=14),
    vt=ParagraphStyle("vt", fontName="SB", fontSize=13, textColor=colors.white, leading=16),
    vd=ParagraphStyle("vd", fontName="S", fontSize=9.5, textColor=colors.HexColor("#e8d9a8"), alignment=2),
    b=ParagraphStyle("b", fontName="S", fontSize=10.5, textColor=INK, leading=15, leftIndent=12, bulletIndent=0, spaceAfter=3),
    apk=ParagraphStyle("apk", fontName="SB", fontSize=9.5, textColor=RED, leading=13, spaceAfter=3),
)
notes = json.load(open("data/patchnotes.json", encoding="utf-8"))
doc = SimpleDocTemplate(sys.argv[1], pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm,
                        title="Ranvus Maps — Patch Notes", author="Ranvus Maps")
els = [Paragraph("Ranvus Maps — Patch Notes", st["h"]),
       Paragraph("O que mudou em cada atualização, da mais nova para a mais antiga. "
                 "Atualizações do app chegam sozinhas: basta fechar e abrir. Só as versões com o aviso "
                 "<b>“instalar o APK novo”</b> pedem baixar o aplicativo de novo.", st["s"])]
for n in notes:
    head = Table([[Paragraph(f"Versão {n['v']} — {noemo(n['t'])}", st["vt"]), Paragraph(n["d"], st["vd"])]],
                 colWidths=[130*mm, 44*mm])
    head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("LINEBELOW", (0, 0), (-1, -1), 2, GOLD),
                              ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                              ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]))
    body = [Spacer(1, 5)]
    if n.get("apk"): body.append(Paragraph("➜ Esta versão pede instalar o APK novo.", st["apk"]))
    body += [Paragraph(noemo(i), st["b"], bulletText="•") for i in n["i"]]
    els.append(KeepTogether([head] + body + [Spacer(1, 10)]))
doc.build(els)
print("ok", sys.argv[1])
