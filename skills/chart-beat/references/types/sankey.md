# Sankey

## What it is for

A sankey diagram answers "how does a quantity flow and split as it moves through a sequence of
stages" — energy from source to sector, users from signup to churn, a budget from allocation to
spend — with each stage laid out as its own column of nodes and ribbons flowing between them whose
THICKNESS is proportional to the amount flowing. Unlike a chord diagram, which arranges nodes around a
circle with no implied stage order, a sankey's left-to-right columns state the sequence explicitly;
unlike a flow-route map, the flow here is abstract quantity moving between categorical stages, not a
path through real geography.

## When NOT to use it, and what to use instead

If the flow doesn't actually move through distinct SEQUENTIAL stages — it's really just many-to-many
relationships with no inherent before-and-after — a chord diagram, which makes no ordering claim, is
the more honest shape. And past about six distinct flow categories, the ribbons stop being individually
colour-trackable across the diagram; at that point either aggregate the smaller flows into a neutral
"other" ribbon or accept that most ribbons will render in an unaccented neutral grey rather than trying
to give every one its own hue. If the story is really about a running total accumulating through a
sequence of signed changes — a budget build, not a population split — that's a waterfall's job, not a
sankey's: a waterfall's bars are cumulative deltas along one axis; a sankey's ribbons are simultaneous
splits of a quantity across stages.

## The one thing that goes wrong

A sankey makes an implicit arithmetic promise at every node: everything flowing IN equals everything
flowing OUT (or, at a source/sink, the node's own stated total). That conservation has to actually
hold — a node's height is set by whichever is larger, its total inflow or its total outflow, and if
those two don't genuinely match, the diagram is quietly asserting a balance that isn't real, in a
shape where a reader has no easy way to audit the arithmetic just by looking, the same blind spot a
waterfall's running-total step has. Verify the flow actually conserves at every node before shipping,
the same way a waterfall's bridge has to be replayed and checked.

## What the drawing actually needs

Nodes sit in explicit columns — the stage a node belongs to is a stated property, not inferred from
layout — with one shared pixels-per-unit scale across every column so ribbon thickness means the same
quantity everywhere on the diagram, not a locally-rescaled thickness per column. Links between nodes
render as smooth curved ribbons, ordered to minimise how often they cross each other, since a tangle of
crossing ribbons defeats the "follow the flow" reading this type exists for. Colour splits into two
roles: a small set of categorical hues (capped near six) for flows the story wants to name and track
individually, and a neutral, unaccented grey for the rest — those neutral ribbons are scaffolding, the
same way an unhighlighted context line is on a bump chart, and are exempt from the categorical-palette
cap because they're not claiming to be a tracked category at all.

## The accessibility trap

A hover or tooltip naming a flow must never paint that name in the flow's own hue on a dark tooltip
background — a specific, previously shipped failure on this exact type, along with several siblings,
measuring under the WCAG text-contrast floor. The fix that holds generally across this family: render
the name in plain white or ink, and if the colour association still needs to travel with the tooltip,
carry it on a small decorative swatch exempt from the text-contrast rule rather than on the text
itself. Because sankey ribbons carry both category (via hue) and quantity (via thickness) at once, a
reader relying on colour alone to track one flow across the diagram needs the swatch-and-neutral-name
pattern just as much as any bar-family label does.
