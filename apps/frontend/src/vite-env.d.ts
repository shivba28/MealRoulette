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
  /** API origin for OAuth and Drive sync (e.g. https://api.example.com). Empty = same origin. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
