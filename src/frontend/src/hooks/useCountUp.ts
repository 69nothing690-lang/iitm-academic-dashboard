import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 800, delay = 100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let raf: number;
    const start = 0;

    const delayTimer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease out cubic
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(start + (target - start) * eased));
        if (progress < 1) {
          raf = requestAnimationFrame(step);
        }
      };
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
