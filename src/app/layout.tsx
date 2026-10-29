import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";

import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/providers";

// 48 de los 68 estilos de texto del mockup usan Montserrat, asi que es la
// tipografia oficial del proyecto. El archivo de Figma arrastraba tambien
// Inter, Work Sans, Lexend y Boldonse con 1 a 13 usos cada una.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // RNF-03: el nombre del negocio va en el titulo y en la pestaña del
  // navegador, no en el texto de la pagina.
  title: {
    default: "Sneaker · Calzado deportivo y urbano",
    template: "%s · Sneaker",
  },
  description:
    "Tienda online de calzado deportivo y urbano, accesorios y kits. Envios a todo el pais.",
  // RNF-04: el alcance comercial es Argentina.
  keywords: ["sneakers", "zapatillas", "calzado deportivo", "Argentina"],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="es-AR"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip">
        <Providers>
          {/* Skip link: RNF-02, permite saltar al contenido con teclado. */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-marca focus:px-4 focus:py-2 focus:text-marca-contraste"
          >
            Saltar al contenido
          </a>

          <Header />

          <main
            id="contenido"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"
          >
            {children}
          </main>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}
