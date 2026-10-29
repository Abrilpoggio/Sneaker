"use client";

import { useActionState } from "react";

import {
  actualizarVarianteAdmin,
  crearVarianteAdmin,
  eliminarVarianteAdmin,
  type AdminFormState,
} from "@/modules/catalogo/admin-actions";
import { FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";

const crear: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = crearVarianteAdmin;
const actualizar: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = actualizarVarianteAdmin;
const eliminar: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = eliminarVarianteAdmin;
const estadoInicial: AdminFormState = { status: "idle" };

type VarianteInicial = {
  id: string;
  talle: string | null;
  color: string | null;
  material: string | null;
  stockActual: number;
};

export function VarianteForm({ productoId, variante }: { productoId: string; variante?: VarianteInicial }) {
  const [state, formAction] = useActionState(variante ? actualizar : crear, estadoInicial);

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-[#D9D9D9] p-4 md:grid-cols-6 md:items-end">
      <input type="hidden" name="productoId" value={productoId} />
      {variante && <input type="hidden" name="varianteId" value={variante.id} />}
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4E4E4E]">
        Talle
        <input required name="talle" defaultValue={variante?.talle ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4E4E4E]">
        Color
        <input name="color" defaultValue={variante?.color ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4E4E4E]">
        Material
        <input name="material" defaultValue={variante?.material ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4E4E4E]">
        Stock
        <input required type="number" min="0" step="1" name="stockActual" defaultValue={variante?.stockActual ?? 0} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4E4E4E] md:col-span-2">
        Motivo del ajuste de stock
        <input name="justificacion" placeholder="Obligatorio si cambia el stock" className={inputClass} />
      </label>
      <div className="md:col-span-6">
        <FormStateMessage state={state} />
      </div>
      <div className="flex gap-2 md:col-span-6">
        <SubmitButton className="rounded bg-[#CF1A1F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7C0300]">
          {variante ? "Guardar variante" : "Agregar variante"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function EliminarVarianteButton({ productoId, varianteId }: { productoId: string; varianteId: string }) {
  const [state, formAction] = useActionState(eliminar, estadoInicial);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="productoId" value={productoId} />
      <input type="hidden" name="varianteId" value={varianteId} />
      <SubmitButton className="rounded border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
        Eliminar
      </SubmitButton>
      {state.message && <FormStateMessage state={state} />}
    </form>
  );
}

const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm font-normal text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";
