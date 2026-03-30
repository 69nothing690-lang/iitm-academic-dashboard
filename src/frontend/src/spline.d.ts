declare module "@splinetool/react-spline" {
  import type { CSSProperties } from "react";
  interface SplineProps {
    scene: string;
    onLoad?: (spline: unknown) => void;
    style?: CSSProperties;
    className?: string;
  }
  export default function Spline(props: SplineProps): JSX.Element;
}
