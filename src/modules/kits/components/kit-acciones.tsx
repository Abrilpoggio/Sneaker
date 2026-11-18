"use client";

import { useActionState } from "react";

import {
  accionEliminarKit,
  accionEstadoKit,
  type KitFormState,
} from "@/modules/kits/actions";
import { FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";

const estadoInicial: KitFormState = { status: "idle" };

export function KitAcciones({
  productoId,
  estado,
}: {
  productoId: string;
  estado: "ACTIVO" | "INACTIVO";
}) {
  const [estadoState, accionEstado] = useActionState(accionEstadoKit, estadoInicial);
  const [eliminarState, accionEliminar] = useActionState(accionEliminarKit, estadoInicial);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={accionEstado}>
          <input type="hidden" name="productoId" value={productoId} />
          <input type="hidden" name="estado" value={estado === "ACTIVO" ? "INACTIVO" : "ACTIVO"} />
          <SubmitButton className="rounded border border-[#2C2C2C] px-4 py-2 text-sm font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]">
            {estado === "ACTIVO" ? "Dar de baja" : "Reactivar kit"}
          </SubmitButton>
        </form>

        <form action={accionEliminar}>
          <input type="hidden" name="productoId" value={productoId} />
          <SubmitButton className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
            Eliminar kit
          </SubmitButton>
        </form>
      </div>

      <p className="text-xs text-[#6B6B6B]">
        La baja conserva el historial. La eliminacion solo se permite si el kit nunca se
        vendio ni esta en un carrito.
      </p>

      <FormStateMessage state={estadoState} />
      <FormStateMessage state={eliminarState} />
    </div>
  );
}
