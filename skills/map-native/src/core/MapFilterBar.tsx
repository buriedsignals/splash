import { useEffect, useRef } from "react";
import {
  FRAME_COLORS,
  FRAME_COLORS_DARK,
  FRAME_FONT,
} from "../theme/map-tokens";
import { toggleCategory } from "./map-filter";
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
  const onHeightRef = useRef(onHeight);
  onHeightRef.current = onHeight;
  const colors = dark ? FRAME_COLORS_DARK : FRAME_COLORS;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const notify = () => {
      if (onHeightRef.current) onHeightRef.current(el.offsetHeight);
    };
    notify();
    const ro = new ResizeObserver(notify);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                      set(o.field, toggleCategory(visible, v));
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
          if (o.mode === "between") {
            const [lo, hi] =
              (state[o.field] as [number, number] | undefined) ??
              ([o.min, o.max] as [number, number]);
            return (
              <div
                key={o.field}
                style={{ display: "flex", gap: 6, alignItems: "center" }}
              >
                <span style={{ color: colors.muted }}>{o.label}</span>
                <input
                  type="range"
                  min={o.min}
                  max={o.max}
                  step={o.step}
                  value={lo}
                  data-testid="filter-range-lo"
                  onChange={(e) => {
                    const next = Math.min(Number(e.target.value), hi);
                    set(o.field, [next, hi]);
                  }}
                />
                <span>{lo}</span>
                <span>–</span>
                <input
                  type="range"
                  min={o.min}
                  max={o.max}
                  step={o.step}
                  value={hi}
                  data-testid="filter-range-hi"
                  onChange={(e) => {
                    const next = Math.max(Number(e.target.value), lo);
                    set(o.field, [lo, next]);
                  }}
                />
                <span>{hi}</span>
              </div>
            );
          }
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
        const step = o.steps[idx];
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
            <span>{step}</span>
          </label>
        );
      })}
    </div>
  );
}
