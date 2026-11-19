import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-[#CF1A1F]">
        Error 404
      </p>
      <h1 className="text-3xl font-bold text-[#2C2C2C] sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="text-base text-[#6B6B6B]">
        El enlace puede haber cambiado o el producto ya no se encuentra disponible.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-[#2C2C2C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Volver al inicio
        </Link>
        <Link
          href="/catalogo"
          className="rounded-md bg-[#CF1A1F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
