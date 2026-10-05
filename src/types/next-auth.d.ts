import type { DefaultSession } from "next-auth";

import type { RolUsuario } from "@/generated/prisma/enums";

/**
 * Ampliacion de los tipos de Auth.js para exponer el rol en la sesion.
 *
 * Sin esto, `session.user.rol` no compila y Habria que castear a mano en
 * cada uso, que es justo donde se cuelan los errores de permisos.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
      usuario?: string;
    } & DefaultSession["user"];
  }

  interface User {
    rol?: RolUsuario;
    usuario?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: RolUsuario;
    usuario?: string;
  }
}

export {};
