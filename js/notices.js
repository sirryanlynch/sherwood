export function parseNotice(text) {
  const t = String(text || "").toLowerCase();
  const base = "Keyword match only. Nothing was read as a legal document. A person still has to look.";
  if (/stipulat/.test(t)) return { suggestion: "assessor_review", note: `${base} The word "stipulation" is present.` };
  if (/refund|corrected bill/.test(t)) return { suggestion: "refund", note: `${base} Refund or corrected-bill language is present.` };
  if (/hearing/.test(t)) return { suggestion: "hearing_scheduled", note: `${base} The word "hearing" is present.` };
  if (/decision|granted|denied/.test(t)) return { suggestion: "decision", note: `${base} Decision language is present.` };
  return { suggestion: null, note: "No keyword matched. Saved for a person to read." };
}
