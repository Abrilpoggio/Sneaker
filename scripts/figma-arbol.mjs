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

const objetivo = (process.argv[2] ?? "").toLowerCase();
const maxDepth = Number(process.argv[3] ?? 4);
const minW = Number(process.argv[4] ?? 0);

const normalizar = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const objetivoN = normalizar(objetivo);

const txt = (n) =>
  n.type === "TEXT" && n.characters?.trim()
    ? n.characters.trim().replace(/\s+/g, " ").slice(0, 34)
    : "";

const hex = (c) =>
  "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

function info(node) {
  const b = node.absoluteBoundingBox;
  const partes = [];
  if (b) partes.push(`${Math.round(b.width)}x${Math.round(b.height)}`);
  const solid = (node.fills ?? []).find((f) => f.type === "SOLID" && f.visible !== false);
  if (solid) partes.push(hex(solid.color));
  if (node.strokeWeight) partes.push(`borde${node.strokeWeight}`);
  const r = node.cornerRadius ?? (node.rectangleCornerRadii?.[0] ?? null);
  if (r) partes.push(`r${r}`);
  if (node.layoutMode && node.layoutMode !== "NONE") {
    partes.push(`gap${node.itemSpacing ?? 0}`);
    const pad = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft];
    if (pad.some((p) => p)) partes.push(`pad${pad.join("/")}`);
  }
  const t = txt(node);
  if (t) partes.push(`«${t}»`);
  return partes.join(" ");
}

function print(node, depth) {
  const b = node.absoluteBoundingBox;
  if (b && b.width < minW) return;
  console.log(`${"  ".repeat(depth)}${node.name}  [${info(node)}]`);
  if (depth >= maxDepth) return;
  const hijos = (node.children ?? []).slice().sort((a, b2) => {
    const ay = a.absoluteBoundingBox?.y ?? 0;
    const by = b2.absoluteBoundingBox?.y ?? 0;
    return ay - by;
  });
  for (const h of hijos) print(h, depth + 1);
}

let encontrado = 0;
for (const page of document.children) {
  (function scan(node, ruta) {
    if (encontrado >= 3) return;
    if (normalizar(node.name).includes(objetivoN)) {
      console.log(`\n===== ${page.name} › ${[...ruta, node.name].join(" › ")} =====`);
      print(node, 0);
      encontrado++;
      return;
    }
    for (const c of node.children ?? []) scan(c, [...ruta, node.name]);
  })(page, []);
}