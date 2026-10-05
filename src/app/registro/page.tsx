import type { Metadata } from "next";

import { RegistroForm } from "@/modules/auth/components/registro-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function PaginaRegistro() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-texto-tenue">
        Tu usuario y tu correo no se pueden modificar despues (RN-03).
      </p>

      <div className="mt-6">
        <RegistroForm />
      </div>
    </div>
  );
}
