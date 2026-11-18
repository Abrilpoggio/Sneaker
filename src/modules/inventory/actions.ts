"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/permissions";
import { extraccionSchema } from "@/modules/inventory/schemas";
import {
  ErrorNegocioExtraccion,
  registrarExtraccion,
} from "@/modules/inventory/services/extracciones";

export type ExtraccionFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

function stringDe(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export async function accionRegistrarExtraccion(
  _previous: ExtraccionFormState,
  formData: FormData,
): Promise<ExtraccionFormState> {
  const sesion = await requireAdmin();
  const parsed = extraccionSchema.safeParse({
    varianteId: stringDe(formData, "varianteId"),
    cantidad: stringDe(formData, "cantidad"),
    motivo: stringDe(formData, "motivo"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  try {
    const resultado = await registrarExtraccion(sesion.user.id, parsed.data);
    revalidatePath("/admin/extracciones");
    revalidatePath("/admin/variantes");
    revalidatePath("/admin");
    revalidatePath("/catalogo");
    revalidatePath("/producto/[slug]", "page");
    return {
      status: "success",
      message: `Extraccion registrada. Stock resultante: ${resultado.stockResultante} unidad(es).`,
    };
  } catch (error) {
    if (error instanceof ErrorNegocioExtraccion) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
