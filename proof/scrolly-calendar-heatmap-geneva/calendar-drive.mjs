// The painting function for this beat's one visual, inlined by `renderScrolly`'s `reveal` option.
//
// A STATE, field by field:
//   streak  how much of the headline's run is outlined, in the order of its days   0..1
//
// The outline is one box per month the run crosses. It draws itself day by day: each box grows from
// its left edge once the boxes before it are complete, so a run that wraps from July into August is
// traced as the one continuous stretch of days it is.

export function applyCalendarState(root, state) {
  const boxes = Array.from(root.querySelectorAll('[data-part="run"]'));
  const total = boxes.reduce((sum, box) => sum + Number(box.getAttribute("data-days")), 0);
  let before = 0;
  for (const box of boxes) {
    const length = Number(box.getAttribute("data-days"));
    const shown = Math.min(Math.max(state.streak * total - before, 0), length) / length;
    // A clip, not a scale: a scaled box thins its own left and right borders as it grows. The negative
    // insets keep the halo, which sits outside the box, whole on the sides already drawn.
    box.style.clipPath = shown >= 1 ? "none" : `inset(-6px calc(${(1 - shown) * 100}% + 0px) -6px -6px)`;
    box.style.opacity = shown > 0 ? "1" : "0";
    before += length;
  }
}
