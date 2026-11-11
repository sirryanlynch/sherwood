function pdfEscape(text) {
  return String(text ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/* One-page text PDF. Enough for the simulated authorization, application, and receipt downloads. */
export function textPdf(lines) {
  const commands = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"];
  const rows = Array.isArray(lines) ? lines : [String(lines || "")];
  for (const row of rows) {
    const parts = String(row || " ").match(/.{1,88}/g) || [" "];
    for (const part of parts) commands.push(`(${pdfEscape(part)}) Tj`, "T*");
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
  ];
  let body = "%PDF-1.4\n";
  const xref = [0];
  for (const obj of objects) {
    xref.push(body.length);
    body += obj;
  }
  const start = body.length;
  body += `xref\n0 ${xref.length}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i < xref.length; i++) body += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return body;
}

export function downloadPdf(filename, lines) {
  const blob = new Blob([textPdf(lines)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
