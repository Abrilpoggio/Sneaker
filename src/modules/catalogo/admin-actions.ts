"use server";

import { Prisma } from "@/generated/prisma/client";
import { EstadoProducto, TipoMovimiento } from "@/generated/prisma/enums";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  etiquetaAdminSchema,
  productoCreateSchema,
  productoAdminSchema,
  varianteAdminSchema,
} from "@/modules/catalogo/admin-schemas";

export type AdminFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  productoId?: string;
};

function erroresZod(error: z.ZodError): AdminFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return {
    status: "error",
    message: "Revisa los campos marcados.",
    fieldErrors,
  };
}

function stringDe(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function stringsDe(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .filter((value): value is string => typeof value === "string");
}

function datosProducto(formData: FormData) {
  return {
    sku: stringDe(formData, "sku"),
    nombre: stringDe(formData, "nombre"),
    descripcion: stringDe(formData, "descripcion"),
    precioVenta: stringDe(formData, "precioVenta"),
    costoCompra: stringDe(formData, "costoCompra"),
    garantia: stringDe(formData, "garantia"),
    imagen: stringDe(formData, "imagen"),
    estado: stringDe(formData, "estado") || "ACTIVO",
    categoriaId: stringDe(formData, "categoriaId"),
    marcaId: stringDe(formData, "marcaId"),
    proveedorId: stringDe(formData, "proveedorId"),
    etiquetaIds: stringsDe(formData, "etiquetaIds"),
  };
}

function datosVarianteInicial(formData: FormData) {
  return {
    talleInicial: stringDe(formData, "talleInicial"),
    colorInicial: stringDe(formData, "colorInicial"),
    materialInicial: stringDe(formData, "materialInicial"),
    stockInicial: stringDe(formData, "stockInicial"),
  };
}

async function imagenDeFormulario(
  formData: FormData,
  imagenIngresada: string | null,
): Promise<{ imagen: string | null; error?: string }> {
  const archivo = formData.get("imagenArchivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { imagen: imagenIngresada };

  const tipos = new Map([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/gif", "gif"],
  ]);
  const extension = tipos.get(archivo.type);
  if (!extension) return { imagen: imagenIngresada, error: "La imagen debe ser PNG, JPG o GIF." };
  if (archivo.size > 4 * 1024 * 1024) {
    return { imagen: imagenIngresada, error: "La imagen no puede superar los 4 MB." };
  }

  const nombre = `${randomUUID()}.${extension}`;
  const directorio = path.join(process.cwd(), "public", "productos");
  await mkdir(directorio, { recursive: true });
  await writeFile(path.join(directorio, nombre), Buffer.from(await archivo.arrayBuffer()));
  return { imagen: `/productos/${nombre}` };
}

async function validarReferencias(input: {
  categoriaId: string;
  marcaId: string;
  proveedorId: string | null;
  etiquetaIds: string[];
}): Promise<string | null> {
  const [categoria, marca, proveedor, etiquetas] = await Promise.all([
    prisma.categoria.findFirst({ where: { id: input.categoriaId, activa: true }, select: { id: true } }),
    prisma.marca.findFirst({ where: { id: input.marcaId, activa: true }, select: { id: true } }),
    input.proveedorId
      ? prisma.proveedor.findFirst({ where: { id: input.proveedorId, estado: "ACTIVO" }, select: { id: true } })
      : Promise.resolve(true),
    prisma.etiquetaUso.count({ where: { id: { in: input.etiquetaIds } } }),
  ]);

  if (!categoria) return "La categoria seleccionada no existe o esta inactiva.";
  if (!marca) return "La marca seleccionada no existe o esta inactiva.";
  if (!proveedor) return "El proveedor seleccionado no existe o esta inactivo.";
  if (etiquetas !== new Set(input.etiquetaIds).size) return "Una o mas etiquetas ya no existen.";
  return null;
}

function productoData(input: ReturnType<typeof productoAdminSchema.parse>) {
  return {
    sku: input.sku,
    nombre: input.nombre,
    descripcion: input.descripcion,
    precioVenta: new Prisma.Decimal(input.precioVenta),
    costoCompra: new Prisma.Decimal(input.costoCompra),
    garantia: input.garantia,
    imagen: input.imagen,
    estado: input.estado === "ACTIVO" ? EstadoProducto.ACTIVO : EstadoProducto.INACTIVO,
    categoriaId: input.categoriaId,
    marcaId: input.marcaId,
    proveedorId: input.proveedorId,
  };
}

export async function crearProductoAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = productoCreateSchema.safeParse({
    ...datosProducto(formData),
    ...datosVarianteInicial(formData),
  });
  if (!parsed.success) return erroresZod(parsed.error);

  const referencias = await validarReferencias(parsed.data);
  if (referencias) return { status: "error", message: referencias };
  const imagen = await imagenDeFormulario(formData, parsed.data.imagen);
  if (imagen.error) return { status: "error", message: imagen.error };

  try {
    const producto = await prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({
        data: {
          ...productoData({ ...parsed.data, imagen: imagen.imagen }),
          etiquetas: {
            create: parsed.data.etiquetaIds.map((etiquetaId) => ({
              etiqueta: { connect: { id: etiquetaId } },
            })),
          },
          variantes: {
            create: {
              talle: parsed.data.talleInicial,
              color: parsed.data.colorInicial,
              material: parsed.data.materialInicial,
              stockActual: parsed.data.stockInicial,
            },
          },
        },
        include: { variantes: true },
      });

      if (parsed.data.stockInicial > 0) {
        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.INGRESO,
            cantidad: parsed.data.stockInicial,
            justificacion: "Stock inicial del producto",
            stockResultante: parsed.data.stockInicial,
            varianteProductoId: creado.variantes[0].id,
            responsableId: admin.user.id,
            proveedorId: parsed.data.proveedorId,
          },
        });
      }
      return creado;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/productos");
    revalidatePath("/catalogo");
    return {
      status: "success",
      message: `Producto ${producto.nombre} creado.`,
      productoId: producto.id,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ya existe un producto con ese SKU." };
    }
    throw error;
  }
}

export async function actualizarProductoAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = stringDe(formData, "productoId");
  if (!id) return { status: "error", message: "Falta el identificador del producto." };

  const parsed = productoAdminSchema.safeParse(datosProducto(formData));
  if (!parsed.success) return erroresZod(parsed.error);
  const referencias = await validarReferencias(parsed.data);
  if (referencias) return { status: "error", message: referencias };
  const imagen = await imagenDeFormulario(formData, parsed.data.imagen);
  if (imagen.error) return { status: "error", message: imagen.error };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.producto.update({
        where: { id },
        data: productoData({ ...parsed.data, imagen: imagen.imagen }),
      });
      await tx.productoEtiqueta.deleteMany({ where: { productoId: id } });
      if (parsed.data.etiquetaIds.length) {
        await tx.productoEtiqueta.createMany({
          data: parsed.data.etiquetaIds.map((etiquetaId) => ({ productoId: id, etiquetaId })),
        });
      }
    });
    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${id}`);
    revalidatePath("/catalogo");
    return { status: "success", message: "Cambios guardados.", productoId: id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ese SKU ya pertenece a otro producto." };
    }
    throw error;
  }
}

export async function cambiarEstadoProductoAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = stringDe(formData, "productoId");
  const estado = stringDe(formData, "estado");
  if (!id || !["ACTIVO", "INACTIVO"].includes(estado)) return;

  await prisma.producto.update({
    where: { id },
    data: { estado: estado === "ACTIVO" ? EstadoProducto.ACTIVO : EstadoProducto.INACTIVO },
  });
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function crearVarianteAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = varianteAdminSchema.safeParse({
    productoId: stringDe(formData, "productoId"),
    talle: stringDe(formData, "talle"),
    color: stringDe(formData, "color"),
    material: stringDe(formData, "material"),
    stockActual: stringDe(formData, "stockActual"),
    justificacion: stringDe(formData, "justificacion"),
  });
  if (!parsed.success) return erroresZod(parsed.error);
  const input = parsed.data;
  if (input.stockActual > 0 && input.justificacion.trim().length < 4) {
    return { status: "error", message: "Indica la justificacion para el ingreso de stock." };
  }

  const yaExiste = await prisma.varianteProducto.findFirst({
    where: {
      productoId: input.productoId,
      talle: input.talle,
      color: input.color,
      material: input.material,
    },
    select: { id: true },
  });
  if (yaExiste) return { status: "error", message: "Esa combinacion de talle, color y material ya existe." };

  const variante = await prisma.$transaction(async (tx) => {
    const creada = await tx.varianteProducto.create({
      data: {
        productoId: input.productoId,
        talle: input.talle,
        color: input.color,
        material: input.material,
        stockActual: input.stockActual,
      },
    });
    if (input.stockActual > 0) {
      const producto = await tx.producto.findUniqueOrThrow({
        where: { id: input.productoId },
        select: { proveedorId: true },
      });
      await tx.movimientoStock.create({
        data: {
          tipo: TipoMovimiento.INGRESO,
          cantidad: input.stockActual,
          justificacion: input.justificacion,
          stockResultante: input.stockActual,
          varianteProductoId: creada.id,
          responsableId: admin.user.id,
          proveedorId: producto.proveedorId,
        },
      });
    }
    return creada;
  });

  revalidatePath(`/admin/productos/${input.productoId}`);
  revalidatePath("/admin/variantes");
  revalidatePath("/catalogo");
  return { status: "success", message: "Variante agregada.", productoId: variante.productoId };
}

export async function actualizarVarianteAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = stringDe(formData, "varianteId");
  const parsed = varianteAdminSchema.safeParse({
    productoId: stringDe(formData, "productoId"),
    talle: stringDe(formData, "talle"),
    color: stringDe(formData, "color"),
    material: stringDe(formData, "material"),
    stockActual: stringDe(formData, "stockActual"),
    justificacion: stringDe(formData, "justificacion"),
  });
  if (!id) return { status: "error", message: "Falta el identificador de la variante." };
  if (!parsed.success) return erroresZod(parsed.error);

  const input = parsed.data;
  const actual = await prisma.varianteProducto.findFirst({ where: { id, productoId: input.productoId } });
  if (!actual) return { status: "error", message: "No se encontro la variante." };

  const diferencia = input.stockActual - actual.stockActual;
  if (diferencia !== 0 && input.justificacion.trim().length < 4) {
    return { status: "error", message: "Indica el motivo del ajuste de stock." };
  }

  const duplicada = await prisma.varianteProducto.findFirst({
    where: {
      id: { not: id },
      productoId: input.productoId,
      talle: input.talle,
      color: input.color,
      material: input.material,
    },
    select: { id: true },
  });
  if (duplicada) return { status: "error", message: "Esa combinacion ya existe en el producto." };

  await prisma.$transaction(async (tx) => {
    await tx.varianteProducto.update({
      where: { id },
      data: { talle: input.talle, color: input.color, material: input.material, stockActual: input.stockActual },
    });
    if (diferencia !== 0) {
      await tx.movimientoStock.create({
        data: {
          tipo: diferencia > 0 ? TipoMovimiento.INGRESO : TipoMovimiento.EXTRACCION,
          cantidad: Math.abs(diferencia),
          justificacion: input.justificacion,
          stockResultante: input.stockActual,
          varianteProductoId: id,
          responsableId: admin.user.id,
        },
      });
    }
  });

  revalidatePath(`/admin/productos/${input.productoId}`);
  revalidatePath("/admin/variantes");
  revalidatePath("/catalogo");
  return { status: "success", message: "Variante y stock actualizados.", productoId: input.productoId };
}

export async function eliminarVarianteAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = stringDe(formData, "varianteId");
  const productoId = stringDe(formData, "productoId");
  if (!id || !productoId) {
    return { status: "error", message: "Falta el identificador de la variante." };
  }

  const [variante, cantidadVariantes] = await Promise.all([
    prisma.varianteProducto.findFirst({
    where: { id, productoId },
    include: {
      _count: {
        select: { itemsCarrito: true, itemsPedido: true, movimientos: true, componentesKit: true },
      },
    },
    }),
    prisma.varianteProducto.count({ where: { productoId } }),
  ]);
  if (!variante) return { status: "error", message: "No se encontro la variante." };
  if (cantidadVariantes <= 1) {
    return { status: "error", message: "El producto debe conservar al menos una variante." };
  }
  const tieneHistorial = Object.values(variante._count).some((count) => count > 0);
  if (variante.stockActual > 0 || tieneHistorial) {
    return {
      status: "error",
      message:
        "No se puede eliminar una variante con stock o historial. Ajusta el stock a cero; los movimientos se conservan para auditoria.",
    };
  }

  await prisma.varianteProducto.delete({ where: { id } });
  revalidatePath(`/admin/productos/${productoId}`);
  revalidatePath("/admin/variantes");
  return { status: "success", message: "Variante eliminada.", productoId };
}

export async function crearEtiquetaAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = etiquetaAdminSchema.safeParse({ nombre: stringDe(formData, "nombre") });
  if (!parsed.success) return erroresZod(parsed.error);
  const nombre = parsed.data.nombre;
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  try {
    await prisma.etiquetaUso.create({ data: { nombre, slug } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ya existe una etiqueta con ese nombre." };
    }
    throw error;
  }
  revalidatePath("/admin/etiquetas");
  revalidatePath("/admin/productos/nuevo");
  return { status: "success", message: "Etiqueta creada." };
}

export async function actualizarEtiquetaAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = etiquetaAdminSchema.safeParse({
    id: stringDe(formData, "etiquetaId"),
    nombre: stringDe(formData, "nombre"),
  });
  if (!parsed.success) return erroresZod(parsed.error);
  if (!parsed.data.id) return { status: "error", message: "Falta el identificador de la etiqueta." };
  const nombre = parsed.data.nombre;
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  try {
    await prisma.etiquetaUso.update({ where: { id: parsed.data.id }, data: { nombre, slug } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ya existe una etiqueta con ese nombre." };
    }
    throw error;
  }
  revalidatePath("/admin/etiquetas");
  revalidatePath("/admin/productos/nuevo");
  return { status: "success", message: "Etiqueta actualizada." };
}

export async function eliminarEtiquetaAdmin(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = stringDe(formData, "etiquetaId");
  if (!id) return { status: "error", message: "Falta el identificador de la etiqueta." };
  const asignaciones = await prisma.productoEtiqueta.count({ where: { etiquetaId: id } });
  if (asignaciones > 0) {
    return {
      status: "error",
      message: "Desasigna esta etiqueta de los productos antes de eliminarla.",
    };
  }
  await prisma.etiquetaUso.delete({ where: { id } });
  revalidatePath("/admin/etiquetas");
  revalidatePath("/admin/productos/nuevo");
  return { status: "success", message: "Etiqueta eliminada." };
}
