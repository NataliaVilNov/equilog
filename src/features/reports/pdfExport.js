import { jsPDF } from "jspdf";
import { fD } from "../../lib/date.js";

// Ports expPDF (public/legacy-app.js:2190-2207), using the imported jsPDF class instead of
// the CDN-loaded window.jspdf global legacy relies on.
export function exportTrainingReportPdf(horse, text, range) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const m = 50;
  const pw = doc.internal.pageSize.getWidth();
  const mw = pw - m * 2;
  let y = m;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(55, 65, 47);
  doc.text("EquiLog · Informe", m, y);
  y += 22;

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.text(`Caballo: ${horse.name}`, m, y);
  y += 14;
  if (horse.owner) {
    doc.text(`Propietario: ${horse.owner}`, m, y);
    y += 14;
  }
  doc.text(`${fD(range.s)} - ${fD(range.e)}`, m, y);
  y += 17;

  doc.setDrawColor(210, 200, 185);
  doc.line(m, y, pw - m, y);
  y += 16;

  text.split("\n").forEach((line) => {
    if (!line.trim()) {
      y += 7;
      return;
    }
    const isH = line.trim().startsWith("**") && line.trim().endsWith("**");
    doc.setFont("helvetica", isH ? "bold" : "normal");
    doc.setFontSize(isH ? 12 : 10);
    doc.setTextColor(...(isH ? [55, 65, 47] : [60, 55, 50]));
    doc.splitTextToSize(line.replace(/\*\*/g, ""), mw).forEach((l) => {
      if (y > doc.internal.pageSize.getHeight() - m) {
        doc.addPage();
        y = m;
      }
      doc.text(l, m, y);
      y += isH ? 16 : 14;
    });
    y += isH ? 4 : 5;
  });

  doc.save(`Informe_${horse.name.replace(/\s+/g, "_")}.pdf`);
}
