import { useEffect, useState } from "react";

/** Hora actual como estado (no se llama a Date.now() durante el render). Se actualiza cada `everyMs`. */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
