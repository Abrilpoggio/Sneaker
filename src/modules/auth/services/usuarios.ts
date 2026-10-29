import { prisma } from "@/lib/prisma";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Genera un nombre de usuario unico a partir del correo (RN-03: el
 * usuario no se edita, asi que se resuelve una sola vez al crear la cuenta
 * automatica via Google OAuth).
 */
export async function generarUsuarioUnico(
  correo: string,
  tx: Pick<typeof prisma, "usuario"> = prisma,
): Promise<string> {
  const base = (correo.split("@")[0] ?? "usuario")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 20);

  const candidato = base.length >= 3 ? base : `usuario${Date.now().toString(36)}`;

  let candidatoLibre = candidato;
  let sufijo = 1;

  // El UNIQUE de la base sigue siendo la garantia real; esto solo evita
  // depender del error de constraint para el caso normal.
  while (await tx.usuario.findUnique({ where: { usuario: candidatoLibre } })) {
    sufijo += 1;
    candidatoLibre = `${candidato}${sufijo}`.slice(0, 30);
  }

  return candidatoLibre;
}

/**
 * Valida la unicidad de correo, usuario y DNI (RF-12, RN-03).
 * `correo` y `usuario` viven en `Usuario`; `dni` vive en `Cliente`.
 */
export async function verificarDuplicadosRegistro({
  correo,
  usuario,
  dni,
}: {
  correo: string;
  usuario: string;
  dni?: number | null;
}): Promise<Record<string, string>> {
  const correoNormalizado = correo.trim().toLowerCase();
  const usuarioNormalizado = usuario.trim().toLowerCase();

  const [usuariosExistentes, clienteConDni] = await Promise.all([
    prisma.usuario.findMany({
      where: {
        OR: [{ correo: correoNormalizado }, { usuario: usuarioNormalizado }],
      },
      select: { correo: true, usuario: true },
    }),
    dni
      ? prisma.cliente.findUnique({
          where: { dni },
          select: { dni: true },
        })
      : Promise.resolve(null),
  ]);

  const erroresCampos: Record<string, string> = {};

  if (usuariosExistentes.some((u) => u.correo === correoNormalizado)) {
    erroresCampos.correo = "Ese correo ya esta registrado.";
  }
  if (usuariosExistentes.some((u) => u.usuario === usuarioNormalizado)) {
    erroresCampos.usuario = "Ese nombre de usuario ya existe.";
  }
  if (clienteConDni) {
    erroresCampos.dni = "Ese DNI ya esta registrado.";
  }

  return erroresCampos;
}

/**
 * RF-12 / CU2: alta de cliente con credenciales.
 * El rol siempre queda como CLIENTE: RF-50 impide el registro libre de
 * VENDEDOR y el rol ADMIN solo se asigna desde la semilla de datos.
 * Se respeta el nombre de usuario elegido en el registro (RN-03).
 */
export async function registrarCliente(datos: {
  nombre: string;
  apellido: string;
  usuario: string;
  correo: string;
  telefono?: string;
  dni?: number | null;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const correo = datos.correo.trim().toLowerCase();
    const usuario = datos.usuario.trim().toLowerCase();

    const creado = await tx.usuario.create({
      data: {
        usuario,
        correo,
        passwordHash: datos.passwordHash,
        rol: RolUsuario.CLIENTE,
      },
    });

    await tx.cliente.create({
      data: {
        usuarioId: creado.id,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono?.trim() || null,
        dni: datos.dni ?? null,
      },
    });

    return creado;
  });
}
