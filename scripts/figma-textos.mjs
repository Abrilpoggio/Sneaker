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

const normalizar = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const objetivo = normalizar(process.argv[2] ?? "Vista 1: landing");

let root = null;
(function s(n) {
  if (!root && normalizar(n.name).includes(objetivo)) root = n;
  (n.children ?? []).forEach(s);
})(document);
if (!root) {
  console.error("no se encontro el landing");
  process.exit(1);
}

const rb = root.absoluteBoundingBox;
const out = [];
(function w(n) {
  if (n.type === "TEXT" && n.characters?.trim()) {
    const b = n.absoluteBoundingBox;
    out.push({
      y: Math.round(b.y - rb.y),
      x: Math.round(b.x - rb.x),
      t: n.characters.trim().replace(/\s+/g, " "),
      f: n.style.fontFamily,
      w: n.style.fontWeight,
      z: n.style.fontSize,
      lh: n.style.lineHeightPx ? Math.round(n.style.lineHeightPx) : null,
      c: (n.fills ?? []).find((f) => f.type === "SOLID") ? hex(n.fills.find((f) => f.type === "SOLID").color) : "-",
    });
  }
  (n.children ?? []).forEach(w);
})(root);

out.sort((a, b) => a.y - b.y || a.x - b.x);
console.log(`LANDING — ${out.length} textos`);
for (const o of out) {
  console.log(
    `${String(o.y).padStart(5)},${String(o.x).padStart(5)}  ${String(o.z).padStart(3)}px w${o.w} lh${o.lh ?? "-"} ${o.c}  «${o.t}»`
  );
}