"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, registroSchema } from "@/modules/auth/schemas";
import { registrarCliente } from "@/modules/auth/services/usuarios";

export type EstadoFormulario = {
  error?: string;
  exito?: string;
  erroresCampos?: Record<string, string>;
};

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
      erroresCampos: parsed.error.flatten().fieldErrors as Record<string, string>,
    };
  }

  // Solo se aceptan rutas internas como destino de retorno: si se acepta
  // cualquiera, un atacante puede craftar un link de login que al iniciar
  // sesion manda a la victima a un sitio suyo.
  const destinoSolicitado = formData.get("callbackUrl");
  const destino =
    typeof destinoSolicitado === "string" &&
    destinoSolicitado.startsWith("/") &&
    !destinoSolicitado.startsWith("//")
      ? destinoSolicitado
      : "/cuenta";

  try {
    await signIn("credentials", {
      correo: parsed.data.correo,
      password: parsed.data.password,
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
    // Cualquier otro error es un fallo real (base de datos caida, error de
    // configuracion). Se relanza para que quede registrado en el log del
    // servidor en lugar de mostrarse como un mensaje generico al usuario.
    throw error;
  }

  // signIn redirige en caso de exito, asi que la ejecucion no llega aca.
  return { exito: "Sesion iniciada." };
}

/**
 * RF-12 / CU2: alta de cuenta.
 *
 * Nota de seguridad: el formulario no acepta el rol. RF-50 prohibe que los
 * perfiles VENDEDOR se den de alta desde el sitio; el ADMIN solo se crea
 * desde la semilla de datos. Por eso el schema de registro ni siquiera
 * incluye un campo de rol.
 */
export async function accionRegistrar(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const parsed = registroSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    usuario: formData.get("usuario"),
    correo: formData.get("correo"),
    telefono: formData.get("telefono") ?? "",
    dni: formData.get("dni") ? formData.get("dni") : undefined,
    password: formData.get("password"),
    confirmarPassword: formData.get("confirmarPassword"),
  });

  if (!parsed.success) {
    return {
      error: "Revisa los datos del formulario.",
      erroresCampos: parsed.error.flatten().fieldErrors as Record<string, string>,
    };
  }

  // `confirmarPassword` solo se usa para validar que las dos contrasenas
  // coinciden; no se persiste, asi que se descarta del resto.
  const datos = { ...parsed.data };
  delete (datos as Partial<typeof datos>).confirmarPassword;
  const correo = datos.correo.toLowerCase();

  const existentes = await prisma.usuario.findMany({
    where: {
      OR: [{ correo }, { usuario: datos.usuario }],
      ...(datos.dni ? [{ dni: datos.dni }] : []),
    },
    select: { correo: true, usuario: true },
  });

  const erroresCampos: Record<string, string> = {};

  if (existentes.some((u) => u.correo === correo)) {
    erroresCampos.correo = "Ese correo ya esta registrado.";
  }
  if (existentes.some((u) => u.usuario === datos.usuario)) {
    erroresCampos.usuario = "Ese nombre de usuario ya existe.";
  }

  if (Object.keys(erroresCampos).length > 0) {
    return { error: "No pudimos crear la cuenta.", erroresCampos };
  }

  try {
    const passwordHash = await bcrypt.hash(datos.password, 12);

    await registrarCliente({
      nombre: datos.nombre,
      apellido: datos.apellido,
      usuario: datos.usuario,
      correo,
      telefono: datos.telefono || undefined,
      dni: datos.dni ?? null,
      passwordHash,
    });
  } catch {
    // La carrera entre dos registros simultaneos con el mismo correo la
    // resuelve el UNIQUE de la base; aca solo se evita que el error de
    // constraint llegue crudo al usuario.
    return { error: "No pudimos crear la cuenta. Intenta de nuevo." };
  }

  revalidatePath("/login");
  redirect("/login?exito=Cuenta+creada.+Ya+podés+ingresar.");
}

/**
 * Cierre de sesion.
 */
export async function accionCerrarSesion(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
