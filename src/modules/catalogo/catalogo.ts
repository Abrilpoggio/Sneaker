/**
 * Consultas publicas del catalogo. Sprint 2 - Camila Viegas.
 *
 * RF-01 / RF-07: listado con busqueda y filtros combinados por
 *   categoria, marca, uso/deporte, talle, color, material y
 *   disponibilidad, con ordenamiento.
 * RF-09: los productos sin stock NO se eliminan del catalogo; se
 *   muestran con indicacion de falta de disponibilidad y quedan al
 *   final de los listados (menor prioridad).
 * RF-10 / RF-11 / RN-09: el stock es visible y, cuando la cantidad
 *   alcanza 10 unidades o menos, se muestra el aviso de ultimas
 *   unidades.
 *
 * Los filtros se traducen a SQL con Prisma; el ordenamiento final se
 * resuelve en memoria porque "sin stock al final" es una regla
 * condicional (RF-09) que el `orderBy` de Prisma no expresa.
 */

import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { calcularStockProducto } from "@/modules/inventory/services/stock";

/** Umbral de RN-09: 10 unidades o menos disparan el aviso. */
export const UMBRAL_ULTIMAS_UNIDADES = 10;

export type OrdenCatalogo = "relevancia" | "precio-asc" | "precio-desc" | "nombre";

export type DisponibilidadCatalogo = "todas" | "con-stock" | "sin-stock";

export interface FiltrosCatalogo {
  q?: string;
  categoria?: string;
  marca?: string;
  etiqueta?: string;
  talle?: string;
  color?: string;
  material?: string;
  disponibilidad?: DisponibilidadCatalogo;
  orden?: OrdenCatalogo;
  ofertas?: boolean;
}

export interface ProductoCatalogo {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  porcentajeDescuento: number | null;
  precioConDescuento: number | null;
  nombrePromocion: string | null;
  imagen: string | null;
  categoria: string;
  marca: string;
  etiquetas: string[];
  stockTotal: number;
  variantesDisponibles: number;
  variantesTotales: number;
}

export interface CuponVigente {
  id: string;
  codigo: string;
  porcentajeDescuento: number;
  descripcion: string | null;
  fechaVigenciaFin: Date | null;
}

export interface FacetasCatalogo {
  categorias: { nombre: string; slug: string }[];
  marcas: { nombre: string; slug: string }[];
  etiquetas: { nombre: string; slug: string }[];
  talles: string[];
  colores: string[];
  materiales: string[];
}

export function calcularEstadoStock(stock: number): {
  sinStock: boolean;
  ultimasUnidades: boolean;
} {
  return {
    sinStock: stock <= 0,
    // RN-09: "ultimas 10 unidades" aplica con 1..10 unidades.
    ultimasUnidades: stock > 0 && stock <= UMBRAL_ULTIMAS_UNIDADES,
  };
}

function normalizar(
  filtros: FiltrosCatalogo,
): FiltrosCatalogo & {
  orden: OrdenCatalogo;
  disponibilidad: DisponibilidadCatalogo;
  ofertas: boolean;
} {
  const texto = (valor?: string) => valor?.trim() || undefined;
  const disponibilidad = filtros.disponibilidad;
  return {
    q: texto(filtros.q),
    categoria: texto(filtros.categoria),
    marca: texto(filtros.marca),
    etiqueta: texto(filtros.etiqueta),
    talle: texto(filtros.talle),
    color: texto(filtros.color),
    material: texto(filtros.material),
    disponibilidad:
      disponibilidad === "con-stock" || disponibilidad === "sin-stock"
        ? disponibilidad
        : "todas",
    orden: filtros.orden ?? "relevancia",
    ofertas: Boolean(filtros.ofertas),
  };
}

export interface PromocionVigenteResumen {
  id: string;
  nombre: string;
  porcentajeDescuento: number;
  productosIds: string[];
}

export async function obtenerPromocionesVigentes(
  ahora: Date = new Date(),
): Promise<PromocionVigenteResumen[]> {
  const filas = await prisma.promocion.findMany({
    where: {
      activa: true,
      fechaInicio: { lte: ahora },
      fechaFin: { gte: ahora },
    },
    select: {
      id: true,
      nombre: true,
      porcentajeDescuento: true,
      productos: { select: { productoId: true } },
    },
  });

  return filas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    porcentajeDescuento: Number(p.porcentajeDescuento),
    productosIds: p.productos.map((rel) => rel.productoId),
  }));
}

export function resolverMejorPromocion(
  productoId: string,
  precioBase: number,
  promociones: PromocionVigenteResumen[],
): {
  porcentajeDescuento: number | null;
  precioConDescuento: number | null;
  nombrePromocion: string | null;
} {
  let mejor: { nombre: string; porcentaje: number } | null = null;
  for (const promo of promociones) {
    const esGlobal = promo.productosIds.length === 0;
    const cubre = esGlobal || promo.productosIds.includes(productoId);
    if (!cubre || promo.porcentajeDescuento <= 0) continue;
    if (!mejor || promo.porcentajeDescuento > mejor.porcentaje) {
      mejor = { nombre: promo.nombre, porcentaje: promo.porcentajeDescuento };
    }
  }

  if (!mejor) {
    return {
      porcentajeDescuento: null,
      precioConDescuento: null,
      nombrePromocion: null,
    };
  }

  const precioConDescuento = Math.max(
    0,
    Math.round(precioBase * (1 - mejor.porcentaje / 100)),
  );
  return {
    porcentajeDescuento: mejor.porcentaje,
    precioConDescuento,
    nombrePromocion: mejor.nombre,
  };
}

export async function listarCuponesVigentes(
  ahora: Date = new Date(),
): Promise<CuponVigente[]> {
  const filas = await prisma.cupon.findMany({
    where: {
      activo: true,
      fechaVigencia: { lte: ahora },
      OR: [{ fechaVigenciaFin: null }, { fechaVigenciaFin: { gte: ahora } }],
    },
    select: {
      id: true,
      codigo: true,
      porcentajeDescuento: true,
      descripcion: true,
      fechaVigenciaFin: true,
    },
    orderBy: [{ porcentajeDescuento: "desc" }, { codigo: "asc" }],
  });

  return filas.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    porcentajeDescuento: Number(c.porcentajeDescuento),
    descripcion: c.descripcion,
    fechaVigenciaFin: c.fechaVigenciaFin,
  }));
}

/**
 * RN-06: el stock de un kit se deriva del componente con menor
 * disponibilidad (cuantas unidades de kit alcanzan). Para productos
 * normales es la suma del stock de sus variantes. La formula vive en
 * inventory/services/stock.ts para compartirla con el panel y el
 * checkout.
 */

function construirWhere(filtros: FiltrosCatalogo): Prisma.ProductoWhereInput {
  const condiciones: Prisma.ProductoWhereInput[] = [
    // RF-02/RNF-08: solo productos activos llegan al catalogo publico.
    { estado: "ACTIVO" },
  ];

  if (filtros.q) {
    condiciones.push({
      OR: [
        { nombre: { contains: filtros.q, mode: "insensitive" } },
        { descripcion: { contains: filtros.q, mode: "insensitive" } },
        { sku: { contains: filtros.q, mode: "insensitive" } },
        { marca: { is: { nombre: { contains: filtros.q, mode: "insensitive" } } } },
        {
          etiquetas: {
            some: { etiqueta: { is: { nombre: { contains: filtros.q, mode: "insensitive" } } } },
          },
        },
      ],
    });
  }
  if (filtros.categoria) {
    condiciones.push({ categoria: { is: { slug: filtros.categoria } } });
  }
  if (filtros.marca) {
    condiciones.push({ marca: { is: { slug: filtros.marca } } });
  }
  if (filtros.etiqueta) {
    condiciones.push({
      etiquetas: { some: { etiqueta: { is: { slug: filtros.etiqueta } } } },
    });
  }
  const filtroVariante: Prisma.VarianteProductoWhereInput = {};
  if (filtros.talle) filtroVariante.talle = filtros.talle;
  if (filtros.color) filtroVariante.color = filtros.color;
  if (filtros.material) filtroVariante.material = filtros.material;
  if (filtros.disponibilidad === "con-stock") {
    filtroVariante.stockActual = { gt: 0 };
  }
  if (Object.keys(filtroVariante).length > 0) {
    // Si solo se filtro por con-stock sin atributos de variante, permitir tambien Kits con componentes en stock
    if (
      !filtros.talle &&
      !filtros.color &&
      !filtros.material &&
      filtros.disponibilidad === "con-stock"
    ) {
      // El filtro de disponibilidad general se aplica luego sobre stockTotal > 0 (incluye Kits)
    } else {
      condiciones.push({ variantes: { some: filtroVariante } });
    }
  }

  return { AND: condiciones };
}

function ordenar(productos: ProductoCatalogo[], orden: OrdenCatalogo): ProductoCatalogo[] {
  // RF-09: sin stock siempre al final, con el menor prioridad.
  const precioEfectivo = (p: ProductoCatalogo) => p.precioConDescuento ?? p.precio;
  const porPrecio = (a: ProductoCatalogo, b: ProductoCatalogo) =>
    precioEfectivo(a) - precioEfectivo(b);
  const porNombre = (a: ProductoCatalogo, b: ProductoCatalogo) =>
    a.nombre.localeCompare(b.nombre, "es");
  const criterio =
    orden === "precio-asc"
      ? porPrecio
      : orden === "precio-desc"
        ? (a: ProductoCatalogo, b: ProductoCatalogo) => porPrecio(b, a)
        : porNombre;

  return productos.sort((a, b) => {
    const conStockA = a.stockTotal > 0 ? 0 : 1;
    const conStockB = b.stockTotal > 0 ? 0 : 1;
    if (conStockA !== conStockB) return conStockA - conStockB;
    return criterio(a, b);
  });
}

export async function listarCatalogo(
  filtrosEntrada: FiltrosCatalogo,
): Promise<ProductoCatalogo[]> {
  const filtros = normalizar(filtrosEntrada);

  const [registros, promocionesVigentes] = await Promise.all([
    prisma.producto.findMany({
      where: construirWhere(filtros),
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcion: true,
        precioVenta: true,
        imagen: true,
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
        etiquetas: { select: { etiqueta: { select: { nombre: true } } } },
        variantes: { select: { stockActual: true } },
        kit: {
          select: {
            componentes: {
              select: { cantidad: true, variante: { select: { stockActual: true } } },
            },
          },
        },
      },
    }),
    obtenerPromocionesVigentes(),
  ]);

  const productos: ProductoCatalogo[] = registros.map((registro) => {
    const variantes = registro.variantes;
    const precio = Number(registro.precioVenta);
    const promo = resolverMejorPromocion(registro.id, precio, promocionesVigentes);
    return {
      id: registro.id,
      sku: registro.sku,
      nombre: registro.nombre,
      descripcion: registro.descripcion,
      precio,
      porcentajeDescuento: promo.porcentajeDescuento,
      precioConDescuento: promo.precioConDescuento,
      nombrePromocion: promo.nombrePromocion,
      imagen: registro.imagen,
      categoria: registro.categoria.nombre,
      marca: registro.marca.nombre,
      etiquetas: registro.etiquetas.map(({ etiqueta }) => etiqueta.nombre),
      stockTotal: calcularStockProducto(variantes, registro.kit),
      variantesDisponibles: variantes.filter((v) => v.stockActual > 0).length,
      variantesTotales: variantes.length,
    };
  });

  let resultado = ordenar(productos, filtros.orden);

  if (filtros.ofertas) {
    resultado = resultado.filter(
      (p) => p.porcentajeDescuento !== null && p.porcentajeDescuento > 0,
    );
  }

  // RF-09: la disponibilidad se evalua sobre el stock calculado
  // (que para kits es el minimo de sus componentes, RN-06), por eso
  // no entra en el WHERE de SQL: se filtra sobre el resultado.
  if (filtros.disponibilidad === "con-stock") {
    return resultado.filter((p) => p.stockTotal > 0);
  }
  if (filtros.disponibilidad === "sin-stock") {
    return resultado.filter((p) => p.stockTotal <= 0);
  }
  return resultado;
}

export async function obtenerFacetas(): Promise<FacetasCatalogo> {
  const [categorias, marcas, etiquetas, variantes] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true },
      select: { nombre: true, slug: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.marca.findMany({
      where: { activa: true },
      select: { nombre: true, slug: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.etiquetaUso.findMany({
      select: { nombre: true, slug: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.varianteProducto.findMany({
      where: { producto: { is: { estado: "ACTIVO" } } },
      select: { talle: true, color: true, material: true },
    }),
  ]);

  const valoresUnicos = (valores: (string | null)[]) =>
    [...new Set(valores.filter((v): v is string => Boolean(v)))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );

  return {
    categorias,
    marcas,
    etiquetas,
    talles: valoresUnicos(variantes.map((v) => v.talle)),
    colores: valoresUnicos(variantes.map((v) => v.color)),
    materiales: valoresUnicos(variantes.map((v) => v.material)),
  };
}

export interface ProductoDetalle {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  porcentajeDescuento: number | null;
  precioConDescuento: number | null;
  nombrePromocion: string | null;
  imagen: string | null;
  categoria: string;
  marca: string;
  garantia: string | null;
  etiquetas: string[];
  stockTotal: number;
  variantes: {
    id: string;
    talle: string | null;
    color: string | null;
    material: string | null;
    stock: number;
  }[];
  /** RN-06: cuando el producto es un kit, sus componentes. */
  componentesKit: {
    titulo: string;
    cantidad: number;
    stockComponente: number;
  }[];
}

/** RF-10: el detalle consulta la base y expone el stock por variante. */
export async function obtenerProductoDetalle(sku: string): Promise<ProductoDetalle | null> {
  const termino = sku.trim();
  if (!termino) return null;

  const [registro, promocionesVigentes] = await Promise.all([
    prisma.producto.findFirst({
      where: { estado: "ACTIVO", OR: [{ sku: termino }, { id: termino }] },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcion: true,
        precioVenta: true,
        imagen: true,
        garantia: true,
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
        etiquetas: { select: { etiqueta: { select: { nombre: true } } } },
        variantes: {
          select: { id: true, talle: true, color: true, material: true, stockActual: true },
          orderBy: [{ talle: "asc" }, { color: "asc" }],
        },
        kit: {
          select: {
            componentes: {
              select: {
                cantidad: true,
                variante: {
                  select: {
                    stockActual: true,
                    talle: true,
                    color: true,
                    material: true,
                    producto: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    obtenerPromocionesVigentes(),
  ]);
  if (!registro) return null;

  const stockTotal = calcularStockProducto(registro.variantes, registro.kit);
  const precio = Number(registro.precioVenta);
  const promo = resolverMejorPromocion(registro.id, precio, promocionesVigentes);

  return {
    id: registro.id,
    sku: registro.sku,
    nombre: registro.nombre,
    descripcion: registro.descripcion,
    precio,
    porcentajeDescuento: promo.porcentajeDescuento,
    precioConDescuento: promo.precioConDescuento,
    nombrePromocion: promo.nombrePromocion,
    imagen: registro.imagen,
    garantia: registro.garantia,
    categoria: registro.categoria.nombre,
    marca: registro.marca.nombre,
    etiquetas: registro.etiquetas.map(({ etiqueta }) => etiqueta.nombre),
    stockTotal,
    variantes: registro.variantes.map((v) => ({
      id: v.id,
      talle: v.talle,
      color: v.color,
      material: v.material,
      stock: v.stockActual,
    })),
    componentesKit: (registro.kit?.componentes ?? []).map((componente) => ({
      titulo: `${componente.variante.producto.nombre}${
        [componente.variante.talle, componente.variante.color, componente.variante.material]
          .filter(Boolean)
          .length
          ? ` (${[componente.variante.talle, componente.variante.color, componente.variante.material]
              .filter(Boolean)
              .join(" · ")})`
          : ""
      }`,
      cantidad: componente.cantidad,
      stockComponente: componente.variante.stockActual,
    })),
  };
}
