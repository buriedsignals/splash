import { useEffect, useRef } from "react";
import {
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  FRAME_FONT,
} from "../theme/map-tokens";
import type { FilterOption, FilterState } from "./map-filter";

export interface MapFilterBarProps {
  options: FilterOption[];
  state: FilterState;
  onChange: (s: FilterState) => void;
  dark?: boolean;
  onHeight?: (px: number) => void;
}

export function MapFilterBar({
  options,
  state,
  onChange,
  dark = false,
  onHeight,
}: MapFilterBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const colors = dark ? FRAME_COLORS_DARK : FRAME_COLORS;

  useEffect(() => {
    const el = ref.current;
    if (!el || !onHeight) return;
    const notify = () => onHeight(el.offsetHeight);
    notify();
    const ro = new ResizeObserver(notify);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  const set = (field: string, value: unknown) =>
    onChange({ ...state, [field]: value });

  return (
    <div
      ref={ref}
      data-testid="map-filterbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        background: colors.pill,
        borderRadius: 6,
        padding: "6px 10px",
        fontFamily: FRAME_FONT,
        fontSize: 12,
        color: colors.ink,
        pointerEvents: "auto",
      }}
    >
      {options.map((o) => {
        if (o.kind === "category") {
          const visible = (state[o.field] as string[] | undefined) ?? o.values;
          return (
            <div
              key={o.field}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <span style={{ color: colors.muted }}>{o.label}:</span>
              {o.values.map((v) => {
                const on = visible.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    data-testid="filter-chip"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on
                        ? visible.filter((x) => x !== v)
                        : [...visible, v];
                      // never empty the map — last visible chip cannot be toggled off
                      if (next.length === 0) return;
                      set(o.field, next);
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 999,
                      border: `1px solid ${colors.muted}`,
                      padding: "2px 10px",
                      background: on ? colors.ink : "transparent",
                      color: on ? colors.pill : colors.ink,
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          );
        }

        if (o.kind === "range") {
          const t =
            (state[o.field] as number | undefined) ??
            (o.mode === "atMost" ? o.max : o.min);
          return (
            <label
              key={o.field}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <span style={{ color: colors.muted }}>{o.label}</span>
              <input
                type="range"
                min={o.min}
                max={o.max}
                step={o.step}
                value={t}
                data-testid="filter-range"
                onChange={(e) => set(o.field, Number(e.target.value))}
              />
              <span>{o.mode === "atMost" ? `≤ ${t}` : `≥ ${t}`}</span>
            </label>
          );
        }

        // kind === "time"
        const sel =
          (state[o.field] as number | undefined) ?? o.steps[o.steps.length - 1];
        const idx = Math.max(0, o.steps.indexOf(sel));
        return (
          <label
            key={o.field}
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <span style={{ color: colors.muted }}>{o.label}</span>
            <input
              type="range"
              min={0}
              max={o.steps.length - 1}
              step={1}
              value={idx}
              data-testid="filter-time"
              onChange={(e) => set(o.field, o.steps[Number(e.target.value)])}
            />
            <span>{sel}</span>
          </label>
        );
      })}
    </div>
  );
}
