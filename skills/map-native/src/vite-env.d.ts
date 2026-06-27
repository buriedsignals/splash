/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_MAPTILER_KEY: string;
}

declare module "__map__" {
  const value: unknown;
  export default value;
}
