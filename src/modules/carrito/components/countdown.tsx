"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * RN-04: temporizador visible de la reserva. El stock real se libera
 * en el servidor por vencimiento (`reservaExpiracion` deja de
 * computar); este componente solo informa el tiempo restante.
 */
export function CountdownReserva({ expiracionISO }: { expiracionISO: string }) {
  const [restanteSeg, setRestanteSeg] = useState<number | null>(null);
  const [expiro, setExpiro] = useState(false);

  useEffect(() => {
    const expiracion = new Date(expiracionISO).getTime();

    const calcular = () => {
      const restante = Math.max(Math.round((expiracion - Date.now()) / 1000), 0);
      setRestanteSeg(restante);
      if (restante === 0) setExpiro(true);
    };

    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [expiracionISO]);

  if (expiro) {
    return (
      <div className="rounded-md border border-[#CF1A1F] bg-[#FFCDD2] px-4 py-3">
        <p className="text-base font-semibold leading-[16px] text-[#7C0300]">
          La reserva expiró: las unidades quedaron liberadas (RN-04).
        </p>
        <Link
          href="/carrito"
          className="mt-2 inline-block text-base font-semibold text-[#CF1A1F] underline"
        >
          Volver al carrito para volver a iniciar la compra
        </Link>
      </div>
    );
  }

  const minutos = restanteSeg === null ? "--" : String(Math.floor(restanteSeg / 60));
  const segundos = restanteSeg === null ? "--" : String(restanteSeg % 60).padStart(2, "0");

  return (
    <p
      role="timer"
      className="inline-block rounded bg-[#CF1A1F] px-4 py-2 text-lg font-semibold leading-[16px] text-white"
      suppressHydrationWarning
    >
      Reservado por {minutos}:{segundos} minutos
    </p>
  );
}
