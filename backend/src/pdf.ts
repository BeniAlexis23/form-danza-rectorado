import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import type { Delegation, Participant } from "../../shared/rules.js";

export async function createSheet(
  data: Delegation,
  people: Participant[],
  date: string,
  testMode = false,
) {
  const source = await PDFDocument.load(
    await readFile("backend/assets/ficha-base.pdf"),
  );
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman),
    bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const characters = new Set(font.getCharacterSet());
  const clean = (value: string) =>
    Array.from(value.replace(/[\r\n\t]+/g, " "))
      .map((c) => (characters.has(c.codePointAt(0)!) ? c : "?"))
      .join("");
  const selected = data.pairs.flat().map((id) => {
    const p = people.find((p) => p.id === id);
    if (!p) throw new Error("La nómina contiene participantes inexistentes.");
    return p;
  });
  const wrap = (value: string, size: number, width: number) => {
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      let line = "";
      for (const char of clean(paragraph)) {
        if (font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line.trimEnd());
          line = "";
        }
        line += char;
      }
      lines.push(line.trimEnd());
    }
    return lines;
  };
  const review = wrap(data.review || "—", 9.5, 451);
  // Lay out the entire body first, then fit it uniformly into a single A4 sheet.
  // Long rosters and reviews are scaled rather than truncated or moved to an annex.
  const bodyHeight = 365 + selected.length * 14 + review.length * 12;
  const bodyDoc = await PDFDocument.create();
  const bodyFont = await bodyDoc.embedFont(StandardFonts.TimesRoman),
    bodyBold = await bodyDoc.embedFont(StandardFonts.TimesRomanBold);
  const body = bodyDoc.addPage([595.5, bodyHeight]);
  function text(
    value: string,
    x: number,
    top: number,
    width = 451,
    size = 9.5,
    strong = false,
  ) {
    const label = clean(value),
      f = strong ? bodyBold : bodyFont;
    const fitted = Math.min(
      size,
      width / Math.max(1, f.widthOfTextAtSize(label, 1)),
    );
    body.drawText(label, {
      x,
      y: bodyHeight - top - fitted,
      font: f,
      size: fitted,
      color: rgb(0, 0, 0),
    });
  }
  function center(value: string, top: number, size: number) {
    const label = clean(value);
    const width = bodyBold.widthOfTextAtSize(label, size);
    text(label, 72 + (451 - width) / 2, top, 451, size, true);
  }
  function line(x1: number, top1: number, x2: number, top2: number) {
    body.drawLine({
      start: { x: x1, y: bodyHeight - top1 },
      end: { x: x2, y: bodyHeight - top2 },
      thickness: 0.6,
    });
  }
  center("FICHA DE INSCRIPCIÓN", 0, 12);
  center("CONCURSO DE DANZAS AFROPERUANAS Y FOLCLÓRICAS – UNDC", 21, 9.5);
  text("I. DATOS DE LA DELEGACIÓN", 72, 45, 451, 10, true);
  text("1.1. Dependencia que representa: Rectorado", 72, 62);
  text(
    `1.2. Modalidad de danza: ${data.modality === "AFROPERUANA" ? "Danza afroperuana" : "Danza folclórica"}`,
    72,
    79,
  );
  text(`1.3. Nombre de la danza: ${data.dance}`, 72, 96);
  text(
    `1.4. Duración estimada: ${data.minutes} minutos ${data.seconds} segundos`,
    72,
    113,
  );
  text("II. DATOS DEL REPRESENTANTE DE LA DELEGACIÓN", 72, 140, 451, 10, true);
  text(`Nombres y apellidos completos: ${data.representative}`, 72, 157);
  text(`DNI: ${data.dni}`, 72, 174, 200);
  text(`Número de contacto: ${data.phone}`, 310, 174, 213);
  text("III. RELACIÓN DE PARTICIPANTES", 72, 201, 451, 10, true);
  const tableTop = 218,
    tableBottom = tableTop + 15 + selected.length * 14;
  for (const x of [72, 98, 428, 523]) line(x, tableTop, x, tableBottom);
  line(72, tableTop, 523, tableTop);
  line(72, tableTop + 15, 523, tableTop + 15);
  text("N.°", 78, tableTop + 3, 19, 9, true);
  text("Nombres y apellidos completos", 145, tableTop + 3, 275, 9, true);
  text("DNI", 460, tableTop + 3, 60, 9, true);
  selected.forEach((p, i) => {
    const top = tableTop + 15 + i * 14;
    text(String(i + 1), 77, top + 2, 18, 9);
    text(`${p.firstName} ${p.lastName}`, 102, top + 2, 321, 9);
    text(p.dni, 440, top + 2, 79, 9);
    line(72, top + 14, 523, top + 14);
  });
  let top = tableBottom + 16;
  text("IV. RESEÑA DE LA DANZA", 72, top, 451, 10, true);
  top += 17;
  for (const value of review) {
    text(value, 72, top);
    top += 12;
  }
  top += 12;
  text(`Lugar y fecha: San Vicente de Cañete, ${date}`, 72, top);
  top += 35;
  line(179, top, 416, top);
  text("Firma del representante de la delegación", 210, top + 4, 240, 9);
  text(`${data.representative} · DNI ${data.dni}`, 179, top + 18, 237, 9);
  const page = pdf.addPage([595.5, 841.5]);
  const background = await pdf.embedPage(source.getPage(1));
  page.drawPage(background);
  // Remove the blank signature labels from the original second page, in its white area.
  page.drawRectangle({
    x: 68,
    y: 690,
    width: 470,
    height: 55,
    color: rgb(1, 1, 1),
  });
  const header = await pdf.embedPage(source.getPage(0), {
    left: 0,
    bottom: 748,
    right: 595.5,
    top: 841.5,
  });
  page.drawPage(header, { x: 0, y: 748, width: 595.5, height: 93.5 });
  const contentSource = await PDFDocument.load(await bodyDoc.save());
  const content = await pdf.embedPage(contentSource.getPage(0), {
    left: 72,
    bottom: 0,
    right: 523,
    top: bodyHeight,
  });
  const scale = Math.min(1, 660 / bodyHeight);
  page.drawPage(content, {
    x: 72 + (451 - 451 * scale) / 2,
    y: 55 + (660 - bodyHeight * scale),
    width: 451 * scale,
    height: bodyHeight * scale,
  });
  page.drawText(
    testMode
      ? "MODO PRUEBA · SIN VALIDEZ OFICIAL"
      : "Rectorado · Ficha de inscripción",
    { x: 72, y: 28, font, size: 8, color: rgb(0.3, 0.3, 0.3) },
  );
  pdf.setTitle("Ficha de inscripción · Concurso de danzas UNDC");
  return Buffer.from(await pdf.save());
}
