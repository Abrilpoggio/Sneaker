const token = process.env.FIGMA_ACCESS_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY ?? "UBA7sQnuni2Z0PtuhuMJZ8";

const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
  headers: { "X-Figma-Token": token },
});
if (!res.ok) {
  console.error(`Figma ${res.status}`);
  process.exit(1);
}
const { document } = await res.json();

const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

const txt = (n) =>
  n.type === "TEXT" && n.characters?.trim()
    ? n.characters.trim().replace(/\s+/g, " ").slice(0, 40)
    : "";

const info = (node) => {
  const b = node.absoluteBoundingBox;
  const p = [];
  if (b) p.push(`${Math.round(b.width)}x${Math.round(b.height)}`);
  const solid = (node.fills ?? []).find((f) => f.type === "SOLID" && f.visible !== false);
  if (solid) p.push(hex(solid.color));
  if (node.layoutMode && node.layoutMode !== "NONE") p.push(`gap${node.itemSpacing ?? 0}`);
  const t = txt(node);
  if (t) p.push(`«${t}»`);
  return p.join(" ");
};

const PREFIJO = /^Vista\s+\d+(\.\d+)?/;

for (const page of document.children) {
  for (const top of page.children ?? []) {
    const esVista = PREFIJO.test(top.name) || top.type === "SECTION";
    if (!esVista) continue;

    if (top.type === "SECTION") {
      console.log(`\n■ ${page.name} — ${top.name}`);
      for (const s of top.children ?? []) {
        console.log(`    ${s.name}  [${info(s)}]`);
      }
      continue;
    }

    console.log(`\n■ ${page.name} — ${top.name}  [${info(top)}]`);
    const hijos = (top.children ?? [])
      .slice()
      .sort((a, b) => (a.absoluteBoundingBox?.y ?? 0) - (b.absoluteBoundingBox?.y ?? 0));
    for (const h of hijos) {
      if (h.absoluteBoundingBox && h.absoluteBoundingBox.width < 60) continue;
      console.log(`    ${h.name}  [${info(h)}]`);
    }
  }
}