import { motion } from "motion/react";

interface Props {
  percentage: number;
  color?: string;
}

export function ProgressBar({ percentage, color }: Props) {
  const c =
    color ??
    (percentage >= 75 ? "#2ED47A" : percentage >= 65 ? "#F2C94C" : "#FF7A59");
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        height: 8,
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ height: "100%", borderRadius: 8, background: c }}
      />
    </div>
  );
}
