"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/permissions";
import { componentesKitSchema, kitAdminSchema } from "@/modules/kits/schemas";
import {
  ErrorNegocioKit,
  actualizarKit,
  cambiarEstadoKit,
  crearKit,
  eliminarKit,
  validarComponentesKit,
} from "@/modules/kits/services/kits";

export type KitFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  productoId?: string;
};

function erroresZod(error: z.ZodError): KitFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  const primerMensaje = error.issues[0]?.message;
  return {
    status: "error",
    message:
      Object.keys(fieldErrors).length > 0
        ? "Revisa los campos marcados."
        : (primerMensaje ?? "Revisa los datos del kit."),
    fieldErrors,
  };
}

function stringDe(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function datosKit(formData: FormData) {
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
  };
}

/** Componentes enviados como checkbox + cantidad por variante. */
function componentesDe(formData: FormData) {
  const ids = formData
    .getAll("componenteVarianteId")
    .filter((value): value is string => typeof value === "string");
  return ids.map((varianteId) => ({
    varianteId,
    cantidad: stringDe(formData, `cantidad-${varianteId}`) || "1",
  }));
}

function revalidarKits(productoId?: string) {
  revalidatePath("/admin/kits");
  revalidatePath("/admin");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[slug]", "page");
  if (productoId) revalidatePath(`/admin/kits/${productoId}`);
}

export async function crearKitAdmin(
  _previous: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  await requireAdmin();
  const parsed = kitAdminSchema.safeParse(datosKit(formData));
  if (!parsed.success) return erroresZod(parsed.error);

  const componentes = componentesKitSchema.safeParse(componentesDe(formData));
  if (!componentes.success) return erroresZod(componentes.error);

  const referencia = await validarComponentesKit(null, componentes.data);
  if (referencia) return { status: "error", message: referencia };

  try {
    const { productoId } = await crearKit(parsed.data, componentes.data);
    revalidarKits(productoId);
    return {
      status: "success",
      message: "Kit creado. El stock se calcula automaticamente (RN-06).",
      productoId,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ya existe un producto con ese SKU." };
    }
    throw error;
  }
}

export async function actualizarKitAdmin(
  _previous: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  await requireAdmin();
  const productoId = stringDe(formData, "productoId");
  if (!productoId) return { status: "error", message: "Falta el identificador del kit." };

  const parsed = kitAdminSchema.safeParse(datosKit(formData));
  if (!parsed.success) return erroresZod(parsed.error);

  const componentes = componentesKitSchema.safeParse(componentesDe(formData));
  if (!componentes.success) return erroresZod(componentes.error);

  const referencia = await validarComponentesKit(productoId, componentes.data);
  if (referencia) return { status: "error", message: referencia };

  try {
    await actualizarKit(productoId, parsed.data, componentes.data);
    revalidarKits(productoId);
    return { status: "success", message: "Kit actualizado.", productoId };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "Ese SKU ya pertenece a otro producto." };
    }
    if (error instanceof ErrorNegocioKit) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

export async function accionEstadoKit(
  _previous: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  await requireAdmin();
  const productoId = stringDe(formData, "productoId");
  const estado = stringDe(formData, "estado");
  if (!productoId || !["ACTIVO", "INACTIVO"].includes(estado)) {
    return { status: "error", message: "Datos incompletos para cambiar el estado." };
  }

  try {
    await cambiarEstadoKit(productoId, estado === "ACTIVO" ? "ACTIVO" : "INACTIVO");
    revalidarKits(productoId);
    return {
      status: "success",
      message: estado === "ACTIVO" ? "Kit reactivado." : "Kit dado de baja.",
      productoId,
    };
  } catch (error) {
    if (error instanceof ErrorNegocioKit) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

export async function accionEliminarKit(
  _previous: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  await requireAdmin();
  const productoId = stringDe(formData, "productoId");
  if (!productoId) return { status: "error", message: "Falta el identificador del kit." };

  try {
    await eliminarKit(productoId);
    revalidarKits();
  } catch (error) {
    if (error instanceof ErrorNegocioKit) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        status: "error",
        message: "El kit tiene registros asociados: desactivalo en lugar de eliminarlo.",
      };
    }
    throw error;
  }
  redirect("/admin/kits");
}
