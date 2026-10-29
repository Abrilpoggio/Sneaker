"use client";

import { useActionState } from "react";

import {
  actualizarEtiquetaAdmin,
  crearEtiquetaAdmin,
  eliminarEtiquetaAdmin,
  type AdminFormState,
} from "@/modules/catalogo/admin-actions";
import { FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";

const crear: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = crearEtiquetaAdmin;
const actualizar: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = actualizarEtiquetaAdmin;
const eliminar: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = eliminarEtiquetaAdmin;
const estadoInicial: AdminFormState = { status: "idle" };

export function CrearEtiquetaForm() {
  const [state, formAction] = useActionState(crear, estadoInicial);
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-[#D9D9D9] bg-white p-4 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-[#2C2C2C]">
        Nueva etiqueta de uso
        <input required name="nombre" placeholder="Ej: Running" className={inputClass} />
      </label>
      <SubmitButton className="rounded bg-[#CF1A1F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#7C0300]">
        Crear etiqueta
      </SubmitButton>
      <FormStateMessage state={state} />
    </form>
  );
}

export function EditarEtiquetaForm({ id, nombre }: { id: string; nombre: string }) {
  const [state, formAction] = useActionState(actualizar, estadoInicial);
  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="etiquetaId" value={id} />
      <label className="sr-only" htmlFor={`etiqueta-${id}`}>Nombre de etiqueta</label>
      <input id={`etiqueta-${id}`} required name="nombre" defaultValue={nombre} className={inputClass} />
      <SubmitButton className="rounded border border-[#D9D9D9] px-4 py-2 text-sm font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]">
        Guardar
      </SubmitButton>
      {state.message && <FormStateMessage state={state} />}
    </form>
  );
}

export function EliminarEtiquetaButton({ id, asignada }: { id: string; asignada: boolean }) {
  const [state, formAction] = useActionState(eliminar, estadoInicial);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="etiquetaId" value={id} />
      <SubmitButton
        disabled={asignada}
        className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Eliminar
      </SubmitButton>
      {asignada && <span className="text-xs text-[#6B6B6B]">Primero desasignala de los productos.</span>}
      {state.message && <FormStateMessage state={state} />}
    </form>
  );
}

const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm font-normal text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";
