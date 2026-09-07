import { useEffect, useState } from 'react';

const consulta = '(max-width: 720px), (pointer: coarse) and (max-width: 1024px)';

/** Verdadeiro em telas estreitas ou dispositivos de toque pequenos. Reage a rotação e redimensionamento. */
export function useMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const f = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return mobile;
}
