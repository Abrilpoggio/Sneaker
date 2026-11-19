"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  crearCuponSchema,
  crearPromocionSchema,
  type EstadoAccionMarketing,
} from "./schemas";

function revalidarMarketing() {
  revalidatePath("/admin");
  revalidatePath("/admin/promociones");
  revalidatePath("/catalogo");
  revalidatePath("/cupones");
  revalidatePath("/");
  revalidatePath("/carrito/checkout");
}

function erroresDeZod(error: z.ZodError): EstadoAccionMarketing {
  const erroresCampos: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path[0];
    if (typeof campo === "string" && !erroresCampos[campo]) {
      erroresCampos[campo] = issue.message;
    }
  }
  return {
    ok: false,
    error: "Revisá los campos marcados.",
    erroresCampos,
  };
}

function parsearInicioDia(fechaISO: string): Date {
  return new Date(`${fechaISO}T00:00:00.000Z`);
}

function parsearFinDia(fechaISO: string): Date {
  return new Date(`${fechaISO}T23:59:59.999Z`);
}

/**
 * RF-41: Alta de promocion porcentual (global o sobre productos especificos).
 */
export async function accionCrearPromocion(
  _prev: EstadoAccionMarketing,
  formData: FormData,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  const productoIds = formData
    .getAll("productoIds")
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  const alcance = String(formData.get("alcance") ?? "todos");

  const parsed = crearPromocionSchema.safeParse({
    nombre: String(formData.get("nombre") ?? ""),
    porcentajeDescuento: String(formData.get("porcentajeDescuento") ?? ""),
    fechaInicio: String(formData.get("fechaInicio") ?? ""),
    fechaFin: String(formData.get("fechaFin") ?? ""),
    activa: formData.get("activa") !== "false",
    productoIds: alcance === "seleccionados" ? productoIds : [],
  });

  if (!parsed.success) {
    return erroresDeZod(parsed.error);
  }

  if (alcance === "seleccionados" && parsed.data.productoIds.length === 0) {
    return {
      ok: false,
      error: "Seleccioná al menos un producto o elegí aplicar a todo el catálogo.",
    };
  }

  try {
    await prisma.promocion.create({
      data: {
        nombre: parsed.data.nombre,
        porcentajeDescuento: new Prisma.Decimal(parsed.data.porcentajeDescuento),
        fechaInicio: parsearInicioDia(parsed.data.fechaInicio),
        fechaFin: parsearFinDia(parsed.data.fechaFin),
        activa: parsed.data.activa,
        ...(parsed.data.productoIds.length > 0
          ? {
              productos: {
                createMany: {
                  data: [...new Set(parsed.data.productoIds)].map((productoId) => ({
                    productoId,
                  })),
                },
              },
            }
          : {}),
      },
    });

    revalidarMarketing();
    return {
      ok: true,
      mensaje: `Promoción "${parsed.data.nombre}" creada (${parsed.data.porcentajeDescuento}% OFF).`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No pudimos guardar la promoción.",
    };
  }
}

/**
 * RF-41: Activar o desactivar una promocion existente.
 */
export async function accionAlternarPromocion(
  promocionId: string,
  activa: boolean,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  try {
    await prisma.promocion.update({
      where: { id: promocionId },
      data: { activa },
    });
    revalidarMarketing();
    return {
      ok: true,
      mensaje: activa ? "Promoción activada." : "Promoción desactivada.",
    };
  } catch {
    return { ok: false, error: "No pudimos actualizar la promoción." };
  }
}

/**
 * RF-41 / RNF-09: Eliminar una promocion solo si no fue usada en pedidos historicos.
 */
export async function accionEliminarPromocion(
  promocionId: string,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  try {
    const usos = await prisma.pedidoPromocion.count({
      where: { promocionId },
    });
    if (usos > 0) {
      return {
        ok: false,
        error:
          "Esta promoción ya se aplicó en pedidos históricos (RNF-09). Desactivala en lugar de eliminarla.",
      };
    }

    await prisma.promocion.delete({ where: { id: promocionId } });
    revalidarMarketing();
    return { ok: true, mensaje: "Promoción eliminada." };
  } catch {
    return { ok: false, error: "No pudimos eliminar la promoción." };
  }
}

/**
 * RF-42: Alta de cupon de descuento.
 */
export async function accionCrearCupon(
  _prev: EstadoAccionMarketing,
  formData: FormData,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  const parsed = crearCuponSchema.safeParse({
    codigo: String(formData.get("codigo") ?? ""),
    porcentajeDescuento: String(formData.get("porcentajeDescuento") ?? ""),
    fechaVigencia: String(formData.get("fechaVigencia") ?? ""),
    fechaVigenciaFin: String(formData.get("fechaVigenciaFin") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    activo: formData.get("activo") !== "false",
  });

  if (!parsed.success) {
    return erroresDeZod(parsed.error);
  }

  try {
    const existente = await prisma.cupon.findUnique({
      where: { codigo: parsed.data.codigo },
      select: { id: true },
    });
    if (existente) {
      return {
        ok: false,
        error: `Ya existe un cupón con el código ${parsed.data.codigo}.`,
        erroresCampos: { codigo: "Este código ya está en uso." },
      };
    }

    await prisma.cupon.create({
      data: {
        codigo: parsed.data.codigo,
        porcentajeDescuento: new Prisma.Decimal(parsed.data.porcentajeDescuento),
        fechaVigencia: parsearInicioDia(parsed.data.fechaVigencia),
        fechaVigenciaFin: parsed.data.fechaVigenciaFin
          ? parsearFinDia(parsed.data.fechaVigenciaFin)
          : null,
        descripcion: parsed.data.descripcion,
        activo: parsed.data.activo,
      },
    });

    revalidarMarketing();
    return {
      ok: true,
      mensaje: `Cupón ${parsed.data.codigo} (${parsed.data.porcentajeDescuento}% OFF) creado.`,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No pudimos crear el cupón.",
    };
  }
}

/**
 * RF-42: Activar o desactivar un cupon existente.
 */
export async function accionAlternarCupon(
  cuponId: string,
  activo: boolean,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  try {
    await prisma.cupon.update({
      where: { id: cuponId },
      data: { activo },
    });
    revalidarMarketing();
    return {
      ok: true,
      mensaje: activo ? "Cupón activado." : "Cupón desactivado.",
    };
  } catch {
    return { ok: false, error: "No pudimos actualizar el cupón." };
  }
}

/**
 * RF-42 / RNF-09: Eliminar un cupon solo si no fue usado en pedidos historicos.
 */
export async function accionEliminarCupon(
  cuponId: string,
): Promise<EstadoAccionMarketing> {
  await requireAdmin();

  try {
    const usos = await prisma.pedido.count({
      where: { cuponId },
    });
    if (usos > 0) {
      return {
        ok: false,
        error:
          "Este cupón ya fue utilizado en pedidos históricos (RNF-09). Desactivalo en lugar de eliminarlo.",
      };
    }

    await prisma.cupon.delete({ where: { id: cuponId } });
    revalidarMarketing();
    return { ok: true, mensaje: "Cupón eliminado." };
  } catch {
    return { ok: false, error: "No pudimos eliminar el cupón." };
  }
}
