import type { DefaultSession } from "next-auth";

import type { RolUsuario } from "@/generated/prisma/enums";

/**
 * Ampliacion de los tipos de Auth.js para exponer el rol y metadatos de
 * Refresh Token en la sesion JWT.
 *
 * Sin esto, `session.user.rol` no compila y habria que castear a mano en
 * cada uso, que es justo donde se cuelan los errores de permisos (RNF-08).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
      usuario?: string;
    } & DefaultSession["user"];
    accessTokenExpires?: number;
    error?: "RefreshTokenExpired" | "UserInactive";
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
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshTokenExpired" | "UserInactive";
  }
}

export {};
