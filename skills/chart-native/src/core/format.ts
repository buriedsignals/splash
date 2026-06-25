// core/format — make a chart adapt to its CANVAS aspect ratio. The fixed layout
// is tuned for landscape (~840×480); on a square (1:1) or portrait (4:5, 9:16)
// social video the text would be tiny and the plot stretched. resolveFrame
// scales the typography/margins by `scale` and, on a tall canvas, keeps the plot
// at a sane aspect by padding it into a centred band (so the data is never
// vertically stretched). Shared by line / bar / scatter.
import { TYPE } from "./tokens";

export interface Pad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResolvedFrame {
  scale: number;
  pad: Pad; // scaled, and vertically centred on tall canvases
  type: { title: number; axis: number; label: number; source: number };
}

/**
 * @param plotAspect  target plot height / width (≈0.6 = the landscape default).
 *                    The plot never gets taller than innerWidth * plotAspect;
 *                    extra height becomes top/bottom margin (centres the band).
 */
export function resolveFrame(
  width: number,
  height: number,
  basePad: Pad,
  scale = 1,
  plotAspect = 0.8,
): ResolvedFrame {
  const s = scale;
  const pad: Pad = {
    top: basePad.top * s,
    right: basePad.right * s,
    bottom: basePad.bottom * s,
    left: basePad.left * s,
  };
  const innerW = width - pad.left - pad.right;
  const availH = height - pad.top - pad.bottom;
  const idealH = innerW * plotAspect;
  if (availH > idealH) {
    const extra = (availH - idealH) / 2;
    pad.top += extra;
    pad.bottom += extra;
  }
  return {
    scale: s,
    pad,
    type: {
      title: TYPE.title * s,
      axis: TYPE.axis * s,
      label: TYPE.label * s,
      source: TYPE.source * s,
    },
  };
}
