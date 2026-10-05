import { mkdir, writeFile, rm } from "node:fs/promises";

const token = process.env.FIGMA_ACCESS_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY ?? "UBA7sQnuni2Z0PtuhuMJZ8";

if (!token) {
  console.error("Falta FIGMA_ACCESS_TOKEN");
  process.exit(1);
}

const HEADERS = { "X-Figma-Token": token };
const CACHE = ".figma-cache";

async function figma(path) {
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Figma ${res.status}: ${await res.text()}`);
  return res.json();
}

const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

const solidFills = (node) =>
  (node.fills ?? []).filter((f) => f.visible !== false && f.type === "SOLID").map((f) => hex(f.color));

const shadow = (node) =>
  (node.effects ?? [])
    .filter((e) => e.visible !== false && e.type === "DROP_SHADOW")
    .map((e) => `rgba(${e.color.r * 255},${e.color.g * 255},${e.color.b * 255},${(e.offset.y ?? 0).toFixed(0)}px ${e.radius ?? 0}px)`);

const radius = (node) => {
  if (node.rectangleCornerRadii) return node.rectangleCornerRadii.join("/");
  if (node.cornerRadius != null) return node.cornerRadius === 0 ? "0" : String(node.cornerRadius);
  return null;
};

function describe(node, parentX = 0, parentY = 0) {
  const b = node.absoluteBoundingBox;
  const out = {
    id: node.id,
    nombre: node.name,
    tipo: node.type,
    visible: node.visible !== false,
    x: b ? Math.round(b.x - parentX) : null,
    y: b ? Math.round(b.y - parentY) : null,
    w: b ? Math.round(b.width) : null,
    h: b ? Math.round(b.height) : null,
    fills: solidFills(node),
    stroke: (node.strokes ?? []).filter((s) => s.type === "SOLID").map(hex),
    grosorStroke: node.strokeWeight ?? null,
    radio: radius(node),
    sombra: shadow(node),
   Constraint: [node.constraints?.vertical ?? null, node.constraints?.horizontal ?? null],
  };

  if (node.layoutMode && node.layoutMode !== "NONE") {
    out.autoLayout = {
      direccion: node.layoutMode,
      gap: node.itemSpacing ?? null,
      padding: [
        node.paddingTop ?? 0,
        node.paddingRight ?? 0,
        node.paddingBottom ?? 0,
        node.paddingLeft ?? 0,
      ],
      alineacionPrincipal: node.primaryAxisAlignItems ?? null,
      alineacionSecundaria: node.counterAxisAlignItems ?? null,
    };
  }

  if (node.type === "TEXT") {
    const s = node.style ?? {};
    out.texto = {
      contenido: node.characters?.slice(0, 120) ?? "",
      familia: s.fontFamily,
      peso: s.fontWeight,
      tamano: s.fontSize,
      interlineadoPx: s.lineHeightPx,
      interlineadoPct: s.lineHeightPercentFontSize,
      tracking: s.letterSpacing,
      alineacionH: s.textAlignHorizontal,
      alineacionV: s.textAlignVertical,
      mayusculas: s.textCase,
    };
  }

  if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    out.componente = node.componentPropertyDefinitions
      ? Object.keys(node.componentPropertyDefinitions)
      : null;
  }

  return out;
}

function flatten(node, acc = [], parentX = 0, parentY = 0) {
  acc.push(describe(node, parentX, parentY));
  const b = node.absoluteBoundingBox;
  const px = b ? b.x : parentX;
  const py = b ? b.y : parentY;
  for (const child of node.children ?? []) flatten(child, acc, px, py);
  return acc;
}

const { document, name: fileName, lastModified } = await figma(`/files/${fileKey}`);

await rm(CACHE, { recursive: true, force: true });
await mkdir(CACHE, { recursive: true });

const pages = [];
for (const page of document.children) {
  for (const node of page.children ?? []) {
    if (!["FRAME", "COMPONENT", "SECTION", "COMPONENT_SET"].includes(node.type)) continue;
    const b = node.absoluteBoundingBox;
    const flat = flatten(node);
    const slug = `${page.name}-${node.name}`.replace(/[^\w.-]+/g, "-").toLowerCase();

    pages.push({
      pagina: page.name,
      nombre: node.name,
      tipo: node.type,
      id: node.id,
      ancho: Math.round(b?.width ?? 0),
      alto: Math.round(b?.height ?? 0),
      nodos: flat,
    });

    await writeFile(`${CACHE}/detalle-${slug}.json`, JSON.stringify({ pagina: page.name, frame: node.name, nodos: flat }, null, 2));
  }
}

const isButtonish = (n) =>
  n.tipo === "INSTANCE" || /boton|button|btn/i.test(n.nombre);
const isInputish = (n) => /input|campo|field|buscador|search/i.test(n.nombre);

const componentes = pages.flatMap((p) =>
  p.nodos
    .filter((n) => n.tipo !== "FRAME" || n.nombre !== p.nombre)
    .filter((n) => isButtonish(n) || isInputish(n))
    .map((n) => ({ pantalla: p.nombre, ...n }))
);

const botones = pages
  .flatMap((p) => p.nodos)
  .filter((n) => n.texto && /^(.+)$/.test(n.texto.contenido.trim()))
  .filter((n) => n.texto.contenido.trim().length <= 28)
  .reduce((acc, n) => {
    const k = `${n.texto.contenido.trim()}|${n.texto.tamano}|${n.texto.peso}`;
    if (!acc.has(k)) {
      acc.set(k, {
        texto: n.texto.contenido.trim(),
        familia: n.texto.familia,
        tamano: n.texto.tamano,
        peso: n.texto.peso,
        color: n.fills[0] ?? null,
        alto: n.h,
        ancho: n.w,
      });
    }
    return acc;
  }, new Map());

const resumen = {
  archivo: fileName,
  figmaFileKey: fileKey,
  ultimaModificacion: lastModified,
  exportado: new Date().toISOString(),
  pantallas: pages.map(({ nodos, ...resto }) => ({ ...resto, nodos: nodos.length })),
  totalNodos: pages.reduce((a, p) => a + p.nodos.length, 0),
  botones: [...botones.values()],
  componentes: componentes.slice(0, 120),
};

await writeFile("docs/design-tokens.json", JSON.stringify(resumen, null, 2) + "\n");

console.log(`Archivo: ${fileName}`);
for (const p of resumen.pantallas) {
  console.log(`  ${p.pagina}/${p.nombre}  ${p.ancho}x${p.alto}  ${p.nodos} nodos`);
}
console.log(`\nTotal nodos: ${resumen.totalNodos}`);
console.log(`Botones detectados: ${resumen.botones.length}`);
console.log(`Componentes detectados: ${resumen.componentes.length}`);
console.log(`Detalle por pantalla en ${CACHE}/detalle-*.json`);