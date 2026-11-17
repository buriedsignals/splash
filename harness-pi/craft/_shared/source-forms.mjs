// The credit's forms, longest first: the render sets the longest that fits. A form that names only the basemap
// lets a tight frame credit MapTiler and never the data, so every form must keep the data's source.
const BASEMAP = /©|MapTiler|OpenStreetMap|fond de carte|basemap|\(dataviz\)|^\s*source\s*:|[·\s:,]/gi;
const ATTRIBUTION = "© MapTiler © OpenStreetMap";

const namesOnlyBasemap = (form) => form.replace(BASEMAP, "") === "";
const dataName = (form) =>
  form
    .split(/\s·\s/)
    .map((s) => s.replace(/^\s*source\s*:\s*/i, "").trim())
    .find((s) => s && !namesOnlyBasemap(s));

export function refuseBasemapOnlyCredit(forms) {
  forms.forEach((form, i) => {
    if (!namesOnlyBasemap(form)) return;
    const name = forms
      .slice(0, i)
      .filter((f) => !namesOnlyBasemap(f))
      .map(dataName)
      .filter(Boolean)
      .sort((a, b) => a.length - b.length)[0];
    const fix = name ? `"${name} · ${ATTRIBUTION}"` : `the data's source, then "${ATTRIBUTION}"`;
    throw new Error(`source[${i}] "${form}" names only the basemap: a frame that sets it credits the map and not the data. Write ${fix}`);
  });
}
