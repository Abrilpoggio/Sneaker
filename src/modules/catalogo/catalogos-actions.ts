"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export interface EstadoAccionCatalogo {
  ok: boolean;
  mensaje?: string;
  error?: string;
}

function crearSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function revalidarCatalogos() {
  revalidatePath("/admin");
  revalidatePath("/admin/catalogos");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/productos/nuevo");
  revalidatePath("/catalogo");
  revalidatePath("/");
}

// =========================================================================
// MARCAS
// =========================================================================

export async function accionGuardarMarca(
  _prev: EstadoAccionCatalogo,
  formData: FormData,
): Promise<EstadoAccionCatalogo> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, error: "El nombre de la marca debe tener entre 2 y 80 caracteres." };
  }
  const slug = crearSlug(nombre);
  if (!slug) {
    return { ok: false, error: "Nombre de marca inválido." };
  }

  try {
    if (id) {
      await prisma.marca.update({ where: { id }, data: { nombre, slug } });
      revalidarCatalogos();
      return { ok: true, mensaje: `Marca "${nombre}" actualizada.` };
    }
    await prisma.marca.create({ data: { nombre, slug, activa: true } });
    revalidarCatalogos();
    return { ok: true, mensaje: `Marca "${nombre}" creada.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Ya existe una marca con el nombre "${nombre}".` };
    }
    return { ok: false, error: "No pudimos guardar la marca." };
  }
}

export async function accionEliminarMarca(id: string): Promise<EstadoAccionCatalogo> {
  await requireAdmin();
  try {
    const usos = await prisma.producto.count({ where: { marcaId: id } });
    if (usos > 0) {
      return {
        ok: false,
        error: `Esta marca está asignada a ${usos} producto(s). No se puede eliminar.`,
      };
    }
    await prisma.marca.delete({ where: { id } });
    revalidarCatalogos();
    return { ok: true, mensaje: "Marca eliminada." };
  } catch {
    return { ok: false, error: "No pudimos eliminar la marca." };
  }
}

// =========================================================================
// CATEGORIAS
// =========================================================================

export async function accionGuardarCategoria(
  _prev: EstadoAccionCatalogo,
  formData: FormData,
): Promise<EstadoAccionCatalogo> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, error: "El nombre de la categoría debe tener entre 2 y 80 caracteres." };
  }
  const slug = crearSlug(nombre);
  if (!slug) {
    return { ok: false, error: "Nombre de categoría inválido." };
  }

  try {
    if (id) {
      await prisma.categoria.update({ where: { id }, data: { nombre, slug } });
      revalidarCatalogos();
      return { ok: true, mensaje: `Categoría "${nombre}" actualizada.` };
    }
    await prisma.categoria.create({ data: { nombre, slug, activa: true } });
    revalidarCatalogos();
    return { ok: true, mensaje: `Categoría "${nombre}" creada.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Ya existe una categoría con el nombre "${nombre}".` };
    }
    return { ok: false, error: "No pudimos guardar la categoría." };
  }
}

export async function accionEliminarCategoria(id: string): Promise<EstadoAccionCatalogo> {
  await requireAdmin();
  try {
    const usos = await prisma.producto.count({ where: { categoriaId: id } });
    if (usos > 0) {
      return {
        ok: false,
        error: `Esta categoría tiene ${usos} producto(s) asociado(s). No se puede eliminar.`,
      };
    }
    await prisma.categoria.delete({ where: { id } });
    revalidarCatalogos();
    return { ok: true, mensaje: "Categoría eliminada." };
  } catch {
    return { ok: false, error: "No pudimos eliminar la categoría." };
  }
}

// =========================================================================
// PROVEEDORES (CU13)
// =========================================================================

export async function accionGuardarProveedor(
  _prev: EstadoAccionCatalogo,
  formData: FormData,
): Promise<EstadoAccionCatalogo> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  const cuit = String(formData.get("cuit") ?? "").trim();
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;

  if (razonSocial.length < 2) {
    return { ok: false, error: "La razón social es obligatoria." };
  }
  if (cuit.length < 8) {
    return { ok: false, error: "Ingresá un CUIT válido (ej: 30-71234567-9)." };
  }
  if (nombreContacto.length < 2) {
    return { ok: false, error: "El nombre de contacto es obligatorio." };
  }

  try {
    if (id) {
      await prisma.proveedor.update({
        where: { id },
        data: { razonSocial, cuit, nombreContacto, telefono, email, direccion },
      });
      revalidarCatalogos();
      return { ok: true, mensaje: `Proveedor "${razonSocial}" actualizado.` };
    }
    await prisma.proveedor.create({
      data: {
        razonSocial,
        cuit,
        nombreContacto,
        telefono,
        email,
        direccion,
        estado: "ACTIVO",
      },
    });
    revalidarCatalogos();
    return { ok: true, mensaje: `Proveedor "${razonSocial}" creado.` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Ya existe un proveedor con el CUIT "${cuit}".` };
    }
    return { ok: false, error: "No pudimos guardar el proveedor." };
  }
}

export async function accionAlternarProveedor(
  id: string,
  activar: boolean,
): Promise<EstadoAccionCatalogo> {
  await requireAdmin();
  try {
    await prisma.proveedor.update({
      where: { id },
      data: { estado: activar ? "ACTIVO" : "INACTIVO" },
    });
    revalidarCatalogos();
    return { ok: true, mensaje: activar ? "Proveedor activado." : "Proveedor desactivado." };
  } catch {
    return { ok: false, error: "No pudimos actualizar el estado del proveedor." };
  }
}
