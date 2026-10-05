import { prisma } from "@/lib/prisma";
import { RolUsuario } from "@/generated/prisma/enums";
import { generarUsuarioUnico } from "./usuarios";

/**
 * RF-13: login con Google.
 *
 * El identificador unico de Google es el correo, asi que se decide por ahi:
 *  - si el correo ya existe, se vincula el `googleSub` a esa cuenta
 *    (por ejemplo un cliente que ya se registro con password);
 *  - si no existe, se da de alta el usuario y su Cliente en una transaccion,
 *    para no dejar un Usuario huerfano sin su fila en clientes.
 *
 * La columna `passwordHash` queda en null: esa cuenta solo entra por Google.
 */
export async function vincularCuentaGoogle({
  correo,
  googleSub,
  nombre,
}: {
  correo: string;
  googleSub: string;
  nombre: string;
}): Promise<boolean> {
  const correoNormalizado = correo.toLowerCase();

  const existente = await prisma.usuario.findUnique({
    where: { correo: correoNormalizado },
    include: { cliente: true },
  });

  if (existente) {
    if (existente.googleSub !== googleSub) {
      await prisma.usuario.update({
        where: { id: existente.id },
        data: { googleSub },
      });
    }

    // RN-01: un cliente dado de baja no puede entrar ni por Google.
    return existente.activo;
  }

  const [nombreParte, ...apellidoPartes] = nombre.split(" ");

  await prisma.$transaction(async (tx) => {
    const usuarioNombre = await generarUsuarioUnico(correoNormalizado, tx);

    const creado = await tx.usuario.create({
      data: {
        usuario: usuarioNombre,
        correo: correoNormalizado,
        googleSub,
        rol: RolUsuario.CLIENTE,
      },
    });

    await tx.cliente.create({
      data: {
        usuarioId: creado.id,
        nombre: nombreParte?.trim() || "Cliente",
        apellido: apellidoPartes.join(" ").trim() || "Sneaker",
        telefono: null,
        dni: null,
      },
    });
  });

  return true;
}
