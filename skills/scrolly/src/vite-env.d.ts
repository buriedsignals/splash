/// <reference types="vite/client" />
declare const __CONFIG__: unknown;
declare module "*.geojson?raw" {
  const s: string;
  export default s;
}
interface ImportMetaEnv {
  readonly VITE_MAPTILER_KEY: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
