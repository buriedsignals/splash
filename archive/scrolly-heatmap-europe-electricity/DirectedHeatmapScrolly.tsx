/**
 * Europe's 2024 electricity mix, twelve countries × nine sources, drawn THROUGH the design base as a heatmap and
 * CHOREOGRAPHED by the scroll. The `heatmap` type in the scrolly format: the subject of
 * `static-heatmap-europe-electricity` — seven countries above 94 % low-carbon by three routes — told with the
 * gestures a scroll can make (`scrolly/references/directed-type-choreography.md`): the cells filled family by
 * family, the rows re-sorted on their low-carbon share, the seven regrouped into their three routes, one column
 * read on its own.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one hue in six classes with printed breaks, lightness falling the whole
 * way; columns grouped by family under a rule; the row order is the low-carbon share, printed in its own column;
 * the region named with a bracket in the ink, outside the ramp.
 *
 * `heatmap-drive.mjs` lays out every cell in the reader's pixels on each paint. What is rendered here is the last
 * card's picture in percentages, for a reader without a script.
 */

import type { CSSProperties } from "react";
import {
  adjustToContrast,
  mix,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";

export type Row = {
  key: string;
  label: string;
  shares: number[];
  lowCarbon: number;
  share: string;
};
type Style = Record<string, string | number>;

export function DirectedHeatmapScrolly({
  rows,
  sources,
  families,
  familyShort,
  breaks,
  orders,
  routes,
  focusColumn,
  focusRow,
  words,
  alt,
  regs,
  stroke,
  ground,
  accent,
  ink,
  muted,
}: {
  rows: Row[];
  sources: { label: string; short: string; family: number }[];
  families: string[];
  familyShort: string[];
  breaks: { value: number; label: string }[];
  orders: { alpha: string[]; sorted: string[]; grouped: string[][] };
  routes: string[];
  focusColumn: number;
  focusRow: string;
  words: {
    unit: string;
    region: string;
    sortNote: string;
    routeNote: string;
    focusNote: string;
  };
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  stroke: { rule?: number; hairline?: number };
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const low = mix(accent, ground, 0.9);
  const high = mix(accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  const classOf = (v: number) => breaks.filter((b) => v >= b.value).length;
  const accentInk =
    adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const rule = stroke.rule ?? 1;
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const slot: CSSProperties = {
    gridArea: "1 / 1",
    justifySelf: "end",
    textAlign: "right",
  };
  const n = rows.length;

  return (
    <div
      role="img"
      aria-label={alt}
      data-heatmap={JSON.stringify({
        rows: rows.map(({ key, shares }) => ({
          key,
          classes: shares.map(classOf),
        })),
        families: sources.map((s) => s.family),
        fills: Array.from({ length: classCount }, (_, i) => classFill(i)),
        empty: low,
        orders,
        focusColumn,
        focusRow,
        colours: { accentInk, inkOnGround, mutedInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gridTemplateColumns: "minmax(0, 1fr)",
        rowGap: "8px",
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "4px 16px",
        }}
      >
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>
          {words.unit}
        </span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {(["sortNote", "routeNote", "focusNote"] as const).map((k) => (
            <span
              key={k}
              data-note={k}
              style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}
            >
              {words[k]}
            </span>
          ))}
        </span>
      </div>

      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        {families.map((f, i) => (
          <span
            key={f}
            data-family={i}
            data-short={familyShort[i]}
            style={abs({
              ...regs.annot,
              top: 0,
              left: 0,
              whiteSpace: "nowrap",
              color: mutedInk,
              borderBottom: `${rule}px solid ${mutedInk}`,
              textAlign: "center",
            })}
          >
            {f}
          </span>
        ))}
        {sources.map((s, i) => (
          <span
            key={s.label}
            data-source={i}
            data-full={s.label}
            data-short={s.short}
            style={abs({
              ...regs.axis,
              top: "2.4em",
              left: `${22 + i * 7}%`,
              width: "7%",
              textAlign: "center",
              whiteSpace: "nowrap",
              color: inkOnGround,
            })}
          >
            {s.label}
          </span>
        ))}
        <span
          data-part="share-head"
          style={abs({
            ...regs.axis,
            top: "2.4em",
            left: "88%",
            whiteSpace: "nowrap",
            color: inkOnGround,
          })}
        >
          bas-carbone
        </span>
        {rows.map((r) => {
          const i = orders.sorted.indexOf(r.key);
          const top = `calc(4.4em + (100% - 4.4em) * ${i / n})`;
          return (
            <div
              key={r.key}
              data-row={r.key}
              style={abs({
                left: 0,
                right: 0,
                top,
                height: `calc((100% - 4.4em) / ${n})`,
              })}
            >
              <span
                data-part="name"
                style={abs({
                  ...regs.axis,
                  left: 0,
                  width: "20%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  color: inkOnGround,
                })}
              >
                {r.label}
              </span>
              {r.shares.map((v, c) => (
                <div
                  key={c}
                  data-cell={c}
                  style={abs({
                    left: `${22 + c * 7}%`,
                    width: "6.6%",
                    top: "4%",
                    height: "92%",
                    background: classFill(classOf(v)),
                  })}
                />
              ))}
              <span
                data-part="share"
                style={abs({
                  ...regs.value,
                  left: "88%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  whiteSpace: "nowrap",
                  color:
                    i < orders.grouped.flat().length ? accentInk : mutedInk,
                })}
              >
                {r.share}
              </span>
            </div>
          );
        })}
        <div
          data-part="bracket"
          style={abs({
            width: "6px",
            borderTop: `${rule * 1.5}px solid ${accentInk}`,
            borderBottom: `${rule * 1.5}px solid ${accentInk}`,
            borderRight: `${rule * 1.5}px solid ${accentInk}`,
          })}
        />
        <span
          data-part="region"
          style={abs({ ...regs.annot, whiteSpace: "nowrap", color: accentInk })}
        >
          {words.region}
        </span>
        {routes.map((r, i) => (
          <span
            key={r}
            data-route={i}
            style={abs({
              ...regs.annot,
              whiteSpace: "nowrap",
              color: accentInk,
              opacity: 0,
            })}
          >
            {r}
          </span>
        ))}
        <div
          data-part="focus"
          style={abs({
            boxShadow: `inset 0 0 0 2px ${inkOnGround}`,
            opacity: 0,
          })}
        />
      </div>

      <div
        data-part="legend"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "4px 14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${classCount}, 48px)`,
            gap: "2px",
            paddingBottom: "1.4em",
          }}
        >
          {Array.from({ length: classCount }, (_, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                height: "10px",
                background: classFill(i),
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...regs.axis,
                    position: "absolute",
                    left: "100%",
                    top: "12px",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    color: mutedInk,
                  }}
                >
                  {breaks[i].label}
                </span>
              )}
            </div>
          ))}
        </div>
        <span style={{ ...regs.axis, color: mutedInk }}>
          part de la production du pays
        </span>
        <span data-part="abbreviations" style={{ ...regs.axis, color: mutedInk, flexBasis: "100%" }}>
          {sources.map((src) => `${src.short} ${src.label.toLowerCase()}`).join(" · ")}
        </span>
      </div>
    </div>
  );
}
