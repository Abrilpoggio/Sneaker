"use client";

import { useActionState } from "react";

import { FieldError, FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";
import {
  accionRegistrarExtraccion,
  type ExtraccionFormState,
} from "@/modules/inventory/actions";

export type VarianteExtraccion = {
  id: string;
  titulo: string;
  stockActual: number;
  producto: { nombre: string; sku: string };
};

const estadoInicial: ExtraccionFormState = { status: "idle" };

export function ExtraccionForm({
  variantes,
  responsable,
}: {
  variantes: VarianteExtraccion[];
  responsable: { nombre: string; correo: string };
}) {
  const [state, formAction] = useActionState(accionRegistrarExtraccion, estadoInicial);
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormStateMessage state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#2C2C2C] md:col-span-2">
          Variante a extraer
          <select required name="varianteId" defaultValue="" className={inputClass}>
            <option value="" disabled>
              Seleccionar producto / variante
            </option>
            {variantes.map((variante) => (
              <option
                key={variante.id}
                value={variante.id}
                disabled={variante.stockActual === 0}
              >
                {variante.producto.nombre} · {variante.titulo} ({variante.producto.sku}) —{" "}
                {variante.stockActual} u.
              </option>
            ))}
          </select>
          <FieldError message={error("varianteId")} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#2C2C2C]">
          Cantidad
          <input
            required
            type="number"
            min="1"
            step="1"
            name="cantidad"
            defaultValue="1"
            className={inputClass}
          />
          <FieldError message={error("cantidad")} />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#2C2C2C]">
          Responsable
          <input
            disabled
            value={`${responsable.nombre} (${responsable.correo})`}
            className={`${inputClass} bg-[#F5F5F5] text-[#6B6B6B]`}
          />
          <span className="text-xs font-normal text-[#6B6B6B]">
            Se registra el usuario de la sesion actual (RF-36).
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#2C2C2C] md:col-span-2">
          Motivo de la extraccion
          <textarea
            required
            name="motivo"
            minLength={4}
            maxLength={300}
            rows={3}
            placeholder="Ej: producto dañado en deposito, uso interno, muestra para fotos..."
            className={`${inputClass} min-h-20 resize-y`}
          />
          <FieldError message={error("motivo")} />
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton className="rounded bg-[#CF1A1F] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#7C0300]">
          Registrar extraccion
        </SubmitButton>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-sm border border-black bg-white px-3 py-3 text-sm font-normal text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F] disabled:cursor-not-allowed";
