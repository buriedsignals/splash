import type { Decor } from "../newsroom/decor";
import type { RunManifest, FormOption } from "./manifest";

// Thin proposal for the data→chart branch: legal chart-native forms, each with a grounded WHY
// the journalist can judge. It OFFERS — it never chooses (P1: instrument). The full typology
// + FT/perception grounding is the proposal-cerveau sub-project.
//
// The decor supplies the CAPACITÉ axis (spec §3.4): a form whose capability is not ready is
// offered MARKED, never silently dropped and never silently offered. Dropping it would decide
// for the journalist; offering it bare would promise something the install cannot do.
const CHART_NATIVE = "chart-native";

export function propose(m: RunManifest, decor?: Decor): FormOption[] {
  const profile = m.orient?.profile;
  if (!profile) return [];
  const cols = profile.numericColumns;
  const options: FormOption[] = [];
  if (cols.length === 2) {
    options.push(
      {
        id: "slope",
        nativeType: "slope",
        why: `Two points in time (${cols[0]} → ${cols[1]}) — a slope shows each row's change and whether the gap widens or narrows.`,
        requires: [CHART_NATIVE],
      },
      {
        id: "dumbbell",
        nativeType: "dumbbell",
        why: "A dumbbell marks the two endpoints per row — better when the size of each gap matters more than the trajectory.",
        requires: [CHART_NATIVE],
      },
    );
  } else if (cols.length >= 3) {
    options.push({
      id: "line",
      nativeType: "line",
      why: `${cols.length} points over time — a line traces each series' trajectory.`,
      requires: [CHART_NATIVE],
    });
  }
  return decor ? options.map((o) => annotate(o, decor)) : options;
}

// The worst status among what the form requires is the status of the form: a form is only as
// available as its least available capability.
const SEVERITY = { ready: 0, unverified: 1, disabled: 2, missing: 3 } as const;

function annotate(option: FormOption, decor: Decor): FormOption {
  const relevant = decor.readiness.filter((r) =>
    (option.requires ?? []).includes(r.id),
  );
  if (!relevant.length) return option;
  const worst = relevant.reduce((a, b) =>
    SEVERITY[b.status] > SEVERITY[a.status] ? b : a,
  );
  return {
    ...option,
    readiness: { status: worst.status, reason: worst.reason },
  };
}
