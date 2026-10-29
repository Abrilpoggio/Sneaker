"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { signIn, signOut } from "@/lib/auth";
import {
  loginSchema,
  recuperacionSchema,
  registroSchema,
} from "@/modules/auth/schemas";
import {
  generarUsuarioUnico,
  registrarCliente,
  verificarDuplicadosRegistro,
} from "@/modules/auth/services/usuarios";

export type EstadoFormulario = {
  error?: string;
  exito?: string;
  redirectTo?: string;
  erroresCampos?: Record<string, string>;
};

const RUTAS_AUTH = ["/login", "/registro", "/recuperar"];

function normalizarCallbackUrl(valor: FormDataEntryValue | null): string {
  if (typeof valor !== "string") return "/";
  const limpio = valor.trim();
  if (!limpio.startsWith("/") || limpio.startsWith("//")) return "/";
  const soloPathname = limpio.split("?")[0] ?? "/";
  if (RUTAS_AUTH.includes(soloPathname)) return "/";
  return limpio;
}

function aMapaErrores(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, mensajes] of Object.entries(fieldErrors)) {
    if (mensajes && mensajes[0]) {
      salida[clave] = mensajes[0];
    }
  }
  return salida;
}

/**
 * RF-12 / RF-13: inicio de sesion con credenciales.
 *
 * Se declara "use server" y por lo tanto corre unicamente en el servidor.
 * Es el unico lugar donde se decide si una contrasena es correcta, junto
 * con `authorize()` en src/lib/auth.ts.
 */
export async function accionIniciarSesion(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parsed = loginSchema.safeParse({
    correo: formData.get("correo"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Revisa los datos del formulario.",
      erroresCampos: aMapaErrores(parsed.error.flatten().fieldErrors),
    };
  }

  // Solo se aceptan rutas internas como destino de retorno: si no se envio
  // ninguna, vuelve al main principal (`/`).
  const destino = normalizarCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      correo: parsed.data.correo,
      password: parsed.data.password,
      redirect: false,
      redirectTo: destino,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Correo o contrasena incorrectos."
            : "No se pudo iniciar sesion. Intenta de nuevo.",
      };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { exito: "Sesion iniciada.", redirectTo: destino };
}

/**
 * RF-12 / CU2: alta de cuenta.
 *
 * Soporta tanto el campo `nombreCompleto` del mockup de Figma (`Vista 5 -> Registro`)
 * como los campos individuales `nombre`, `apellido`, `usuario`, `telefono` y `dni`.
 *
 * Nota de seguridad: el formulario no acepta el rol. RF-50 prohibe que los
 * perfiles VENDEDOR se den de alta desde el sitio; el ADMIN solo se crea
 * desde la semilla de datos.
 */
export async function accionRegistrar(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (formData.has("nombreCompleto") && !formData.get("aceptaTerminos")) {
    return {
      error: "Debes aceptar los términos y condiciones para registrarte.",
      erroresCampos: {
        aceptaTerminos: "Debes aceptar los términos y condiciones.",
      },
    };
  }

  const nombreCompletoRaw = formData.get("nombreCompleto");
  let nombreRaw = formData.get("nombre");
  let apellidoRaw = formData.get("apellido");

  if (
    typeof nombreCompletoRaw === "string" &&
    nombreCompletoRaw.trim().length > 0 &&
    !nombreRaw
  ) {
    const partes = nombreCompletoRaw.trim().split(/\s+/);
    nombreRaw = partes[0] ?? "";
    apellidoRaw = partes.slice(1).join(" ") || partes[0] || "Cliente";
  }

  const correoRaw =
    typeof formData.get("correo") === "string"
      ? (formData.get("correo") as string).trim().toLowerCase()
      : "";

  let usuarioRaw = formData.get("usuario");
  if (
    (!usuarioRaw ||
      (typeof usuarioRaw === "string" && usuarioRaw.trim().length === 0)) &&
    correoRaw
  ) {
    usuarioRaw = await generarUsuarioUnico(correoRaw);
  }

  const confirmarPasswordRaw = formData.get("confirmarPassword");

  const parsed = registroSchema.safeParse({
    nombre: nombreRaw,
    apellido: apellidoRaw,
    usuario: usuarioRaw,
    correo: correoRaw,
    telefono: formData.get("telefono") ?? "",
    dni: formData.get("dni") ? formData.get("dni") : undefined,
    password: formData.get("password"),
    confirmarPassword:
      typeof confirmarPasswordRaw === "string"
        ? confirmarPasswordRaw
        : undefined,
  });

  if (!parsed.success) {
    const errores = aMapaErrores(parsed.error.flatten().fieldErrors);
    if (errores.nombre && !errores.nombreCompleto) {
      errores.nombreCompleto = errores.nombre;
    }
    return {
      error: "Revisa los datos del formulario.",
      erroresCampos: errores,
    };
  }

  const datos = parsed.data;
  const correo = datos.correo.trim().toLowerCase();
  const usuario = datos.usuario.trim().toLowerCase();

  const erroresCampos = await verificarDuplicadosRegistro({
    correo,
    usuario,
    dni: datos.dni ?? null,
  });

  if (Object.keys(erroresCampos).length > 0) {
    return { error: "No pudimos crear la cuenta.", erroresCampos };
  }

  try {
    const passwordHash = await bcrypt.hash(datos.password, 12);

    await registrarCliente({
      nombre: datos.nombre,
      apellido: datos.apellido,
      usuario,
      correo,
      telefono: datos.telefono || undefined,
      dni: datos.dni ?? null,
      passwordHash,
    });
  } catch {
    // La carrera entre dos registros simultaneos con el mismo correo/usuario/dni
    // la resuelve el UNIQUE de la base; aca solo se evita que el error de
    // constraint llegue crudo al usuario.
    return { error: "No pudimos crear la cuenta. Intenta de nuevo." };
  }

  const destino = normalizarCallbackUrl(formData.get("callbackUrl"));
  const qs = new URLSearchParams({
    exito: "Cuenta creada. Ya podés ingresar.",
  });
  if (destino !== "/") {
    qs.set("callbackUrl", destino);
  }

  revalidatePath("/login");
  redirect(`/login?${qs.toString()}`);
}

/**
 * RF-14: solicitud de recuperacion de contrasena (`Vista 5 -> Recuperacion de contrasena`).
 *
 * Por seguridad (prevencion de enumeracion de cuentas), responde con el mismo
 * mensaje tanto si el correo existe como si no.
 */
export async function accionRecuperarPassword(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parsed = recuperacionSchema.safeParse({
    correo: formData.get("correo"),
  });

  if (!parsed.success) {
    return {
      error: "Ingresa un correo electronico valido.",
      erroresCampos: aMapaErrores(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    exito:
      "Si el correo esta vinculado a una cuenta, recibiras un enlace para restablecer tu contrasena.",
  };
}

/**
 * Cierre de sesion.
 */
export async function accionCerrarSesion(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
