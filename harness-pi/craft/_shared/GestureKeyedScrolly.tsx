/**
 * A keyed family's scrolly visual (interval, multiples, flow, profile): ONE fixed graphic, the family's scene, its every
 * mark, ring, word, overlay and note tagged for the drive (`applyKeyedState`, gesture-keyed.mjs), which repaints fills
 * and opacities continuously as the reader scrolls from one card's state to the next — never a slideshow of plates.
 * What is rendered here is the closing card's picture, for a reader without a script: the whole chart, every overlay.
 */
import { KeyedLayer, type KeyedColours, type KeyedState, type Register, type Scene } from "./GestureKeyedPlate.tsx";

export function GestureKeyedScrolly({ scene, still, colours, svgRegs, alt }: { scene: Scene; still: KeyedState; colours: KeyedColours; svgRegs: Record<string, Register>; alt: string }) {
  const top = scene.topRoom ?? 0;
  return (
    <div role="img" aria-label={alt} data-keyed="1" style={{ position: "absolute", inset: 0, background: colours.ground, padding: "16px var(--prose-gutter, clamp(16px, 6vw, 56px))", boxSizing: "border-box" }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-4 ${-4 - top} ${scene.width + 8} ${scene.height + 8 + top}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <KeyedLayer scene={scene} state={still} colours={colours} regs={svgRegs} tag="scrolly" />
      </svg>
    </div>
  );
}
