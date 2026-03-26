/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  interface Options {
    colors?: string[];
    origin?: { x?: number; y?: number };
    spread?: number;
    particleCount?: number;
  }
  const confetti: (options?: Options) => void;
  export default confetti;
}

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_URL?: string;
  readonly VITE_ANALYTICS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
