"use client";

import { useActionState } from "react";

import { accionRegistrar, type EstadoFormulario } from "../actions";

/**
 * Alta de cuenta (RF-12, CU2).
 *
 * El campo `usuario` se incluye aunque RN-03 lo declara no editable: se
 * elige al registrarse y despues solo se puede leer.
 */
export function RegistroForm() {
  const [estado, enviar, pendiente] = useActionState<EstadoFormulario, FormData>(
    accionRegistrar,
    {},
  );

  const error = (campo: string) => estado?.erroresCampos?.[campo];

  const campos = [
    { name: "nombre", etiqueta: "Nombre", type: "text", autoComplete: "given-name" },
    { name: "apellido", etiqueta: "Apellido", type: "text", autoComplete: "family-name" },
    { name: "usuario", etiqueta: "Usuario", type: "text", autoComplete: "username" },
    { name: "correo", etiqueta: "Correo", type: "email", autoComplete: "email" },
    { name: "telefono", etiqueta: "Telefono (opcional)", type: "tel", autoComplete: "tel" },
    { name: "dni", etiqueta: "DNI (opcional)", type: "text", inputMode: "numeric" },
  ];

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {campos.map((campo) => (
          <div key={campo.name} className="flex flex-col gap-1">
            <label htmlFor={campo.name} className="text-sm font-medium">
              {campo.etiqueta}
            </label>
            <input
              id={campo.name}
              name={campo.name}
              type={campo.type}
              autoComplete={campo.autoComplete}
              required={!campo.etiqueta.includes("opcional")}
              aria-invalid={Boolean(error(campo.name))}
              className="h-10 rounded-md border border-borde px-3 text-sm"
            />
            {error(campo.name) && (
              <p className="text-xs text-stock-critico">{error(campo.name)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contrasena
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-10 rounded-md border border-borde px-3 text-sm"
          />
          {error("password") && (
            <p className="text-xs text-stock-critico">{error("password")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmarPassword" className="text-sm font-medium">
            Repetir contrasena
          </label>
          <input
            id="confirmarPassword"
            name="confirmarPassword"
            type="password"
            autoComplete="new-password"
            required
            className="h-10 rounded-md border border-borde px-3 text-sm"
          />
          {error("confirmarPassword") && (
            <p className="text-xs text-stock-critico">
              {error("confirmarPassword")}
            </p>
          )}
        </div>
      </div>

      {estado?.error && (
        <p role="alert" className="rounded-md bg-stock-critico/10 px-3 py-2 text-sm text-stock-critico">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="h-10 rounded-md bg-marca text-sm font-medium text-marca-contraste disabled:opacity-60"
      >
        {pendiente ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
