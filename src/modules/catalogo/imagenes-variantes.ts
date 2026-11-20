/**
 * Mapa compartido de fotos reales por (sku -> color) para que tanto
 * el selector de variantes en el detalle como las tarjetas del catalogo
 * filtrado por color muestren la zapatilla en el tono correspondiente.
 */
export const IMAGENES_POR_SKU_COLOR: Record<string, Record<string, string>> = {
  "nike-air-force-1-07": {
    Blanco: "/productos/nike-air-force-1-07-1.png",
    Negro: "/productos/variantes/nike-air-force-1-07-negro.jpg",
  },
  "adidas-forum-low-cl": {
    "Blanco/Negro": "/productos/adidas-forum-low-cl-1.png",
    "Blanco/Verde": "/productos/variantes/adidas-forum-low-cl-blanco-verde.jpg",
  },
  "nike-dunk-low-panda": {
    "Blanco/Negro": "/productos/nike-dunk-low-panda.jpg",
    "Rojo/Blanco": "/productos/variantes/nike-dunk-low-panda-rojo-blanco.jpg",
  },
  "puma-suede-classic-roja": {
    "Rojo/Blanco": "/productos/puma-suede-roja.jpg",
    "Negro/Blanco": "/productos/variantes/puma-suede-classic-roja-negro-blanco.jpg",
  },
  "new-balance-550-verde": {
    "Blanco/Verde": "/productos/new-balance-550-verde.jpg",
    "Blanco/Azul": "/productos/variantes/new-balance-550-verde-blanco-azul.jpg",
  },
  "nike-air-max-90-negra": {
    Negro: "/productos/nike-air-max-90-negra.jpg",
    "Blanco/Gris": "/productos/variantes/nike-air-max-90-negra-blanco-gris.jpg",
  },
  "SNK-DEP-001": {
    "Gris/Naranja": "/productos/zapatilla-deportiva-cloud.png",
    "Gris/Azul": "/productos/variantes/snk-dep-001-gris-azul.jpg",
  },
  "SNK-KID-001": {
    "Blanco/Azul/Rojo": "/productos/zapatilla-ninos-velcro.jpg",
    "Rosa/Blanco": "/productos/variantes/snk-kid-001-rosa-blanco.jpg",
  },
  "vans-old-skool-negra": {
    "Negro/Blanco": "/productos/vans-old-skool-negra.jpg",
    "Bordo/Blanco": "/productos/variantes/vans-old-skool-negra-bordo-blanco.jpg",
  },
  "converse-chuck-taylor-high": {
    "Negro/Blanco": "/productos/converse-chuck-taylor-high.jpg",
    "Rojo/Blanco": "/productos/variantes/converse-chuck-taylor-high-rojo-blanco.jpg",
  },
  "asics-gel-nimbus-26": {
    "Azul/Celeste": "/productos/asics-gel-nimbus-azul.jpg",
    "Negro/Lima": "/productos/variantes/asics-gel-nimbus-26-negro-lima.jpg",
  },
  "reebok-club-c-85-vintage": {
    "Crema/Verde": "/productos/reebok-club-c-vintage.jpg",
    "Crema/Rosa": "/productos/variantes/reebok-club-c-85-vintage-crema-rosa.jpg",
  },
  "adidas-superstar-kids": {
    "Blanco/Negro": "/productos/adidas-superstar-ninos.jpg",
    "Blanco/Rosa": "/productos/variantes/adidas-superstar-kids-blanco-rosa.jpg",
    "Blanco/Azul": "/productos/variantes/adidas-superstar-kids-blanco-azul.jpg",
  },
  "puma-rsx-efekt-gris": {
    "Gris/Negro/Azul": "/productos/puma-rsx-gris-negro.jpg",
    "Gris/Rojo": "/productos/variantes/puma-rsx-efekt-gris-gris-rojo.jpg",
  },
  "salomon-xt6-trail": {
    "Oliva/Gris": "/productos/salomon-xt6-trail.jpg",
    "Negro/Plata": "/productos/variantes/salomon-xt6-trail-negro-plata.jpg",
  },
  "fila-disruptor-ii": {
    Blanco: "/productos/fila-disruptor-blanca.jpg",
    "Rosa Pastel": "/productos/variantes/fila-disruptor-ii-rosa-pastel.jpg",
  },
  "nike-pegasus-40-running": {
    "Azul Marino/Naranja": "/productos/nike-pegasus-40-running.jpg",
    "Verde/Lima": "/productos/variantes/nike-pegasus-40-running-verde-lima.jpg",
  },
  "adidas-samba-clasica": {
    "Negro/Blanco": "/productos/adidas-samba-clasica.jpg",
    "Blanco/Negro": "/productos/variantes/adidas-samba-clasica-blanco-negro.jpg",
  },
  "vans-authentic-roja": {
    "Rojo/Blanco": "/productos/vans-authentic-roja.jpg",
    "Negro/Blanco": "/productos/variantes/vans-authentic-roja-negro-blanco.jpg",
  },
  "new-balance-327": {
    "Beige/Verde Oliva": "/productos/new-balance-327.jpg",
    "Gris/Blanco": "/productos/variantes/new-balance-327-gris-blanco.jpg",
  },
  "olympikus-corre-3": {
    "Lima/Verde": "/productos/olympikus-corre-3.jpg",
    "Azul/Celeste": "/productos/variantes/olympikus-corre-3-azul-celeste.jpg",
  },
  "fila-teratach-basquet": {
    "Blanco/Rojo/Azul": "/productos/fila-teratach-basquet.jpg",
    "Blanco/Verde": "/productos/variantes/fila-teratach-basquet-blanco-verde.jpg",
  },
  "nike-jordan-1-low-bred": {
    "Rojo/Blanco/Negro": "/productos/jordan-1-low-bred-toe.jpg",
    "Azul/Blanco/Negro": "/productos/variantes/nike-jordan-1-low-bred-azul-blanco-negro.jpg",
  },
  "adidas-gazelle-indoor-rosa": {
    "Rosa/Blanco": "/productos/adidas-gazelle-rosa.jpg",
    "Verde/Blanco": "/productos/variantes/adidas-gazelle-indoor-rosa-verde-blanco.jpg",
  },
  "adidas-drop-step-low": {
    "Blanco/Azul/Rojo": "/productos/zapatilla-drop-step.png",
    "Blanco/Verde/Naranja": "/productos/variantes/adidas-drop-step-low-blanco-verde-naranja.jpg",
  },
  "adidas-adizero-sl-running": {
    "Blanco/Negro": "/productos/zapatilla-urbana-adizero.png",
    "Negro/Blanco": "/productos/variantes/adidas-adizero-sl-running-negro-blanco.jpg",
  },
  "puma-future-play-turf": {
    "Azul/Coral": "/productos/puma-future-turf.jpg",
    "Verde/Amarillo": "/productos/variantes/puma-future-play-turf-verde-amarillo.jpg",
  },
  "new-balance-574-kids": {
    "Azul Marino/Gris": "/productos/new-balance-574-kids.jpg",
    "Bordo/Gris": "/productos/variantes/new-balance-574-kids-bordo-gris.jpg",
  },
};

/**
 * Si el cliente filtro por color en el catalogo, devuelve la foto de la
 * variante cuyo color coincide con el filtro (priorizando variantes con stock),
 * en lugar de la foto por defecto de otro color.
 */
export function resolverImagenParaFiltroColor(
  sku: string,
  imagenPorDefecto: string | null,
  variantes: { color: string | null; stockActual: number }[],
  terminosColor: string[],
): string | null {
  const mapaSku = IMAGENES_POR_SKU_COLOR[sku];
  if (!mapaSku || terminosColor.length === 0) return imagenPorDefecto;

  const coincide = (color: string | null) => {
    if (!color) return false;
    const lower = color.toLowerCase();
    return terminosColor.some((t) => lower.includes(t));
  };

  // Primero buscamos una variante coincidente con stock y foto dedicada
  const conStock = variantes.find(
    (v) => v.stockActual > 0 && v.color && coincide(v.color) && mapaSku[v.color],
  );
  if (conStock?.color && mapaSku[conStock.color]) {
    return mapaSku[conStock.color];
  }

  // Si no hay con stock, buscamos cualquier variante coincidente con foto dedicada
  const cualquiera = variantes.find(
    (v) => v.color && coincide(v.color) && mapaSku[v.color],
  );
  if (cualquiera?.color && mapaSku[cualquiera.color]) {
    return mapaSku[cualquiera.color];
  }

  return imagenPorDefecto;
}
