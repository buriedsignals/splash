# SVG xmlns requirement for rasteriser

An SVG handed to the rasteriser must carry an explicit `xmlns="http://www.w3.org/2000/svg"` on its root element.

## The requirement

Every `<svg>` tag produced by a beat or a component must include the namespace declaration:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="..." height="...">
  <!-- content -->
</svg>
```

Without this attribute, the rasteriser (@resvg/resvg-js) fails with: `"SVG data parsing failed cause the document does not have a root node"`.

This error message does not name the cause; it suggests the SVG structure is broken when the actual problem is the missing namespace declaration. A beat author can spend time debugging the SVG's shape, only to discover the xmlns was never there.

## How to check

Before calling `renderStill`, verify the SVG root element. A quick test:

```js
const hasXmlns = svgString.includes('xmlns="http://www.w3.org/2000/svg"');
```

The `renderStill` function in `#shared/chart-beat/render-still.mjs` enforces this by wrapping the component in a proper SVG element with xmlns before passing it to the rasteriser. If you are testing SVG rendering outside of `renderStill`, you must ensure the xmlns is present yourself.
