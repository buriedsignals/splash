# The MapTiler key at delivery, and why a refusal never names a way around itself

## The MapTiler key — the ARTIFACT decides, never the environment

A map × web beat renders with a documented placeholder where its MapTiler key belongs. Delivery
keeps every committable artifact placeholder-only and creates key-bearing bytes only inside one
explicit custody boundary:

- an owned-file delivery keeps the placeholder record at the export root and writes the live page
  under the private, self-ignored `keyed/` directory;
- a hosted delivery substitutes into a `0700`/`0600` temporary file outside every Git worktree, sends
  it to the provider, then removes it on success or failure;
- CMS preparation and source bundles remain placeholder-only.

**`carriesMapKey(html)` is asked first, and it reads the FILE.** An artifact with no key slot is not
a map delivery: it is copied through untouched, and nothing about MapTiler is decided or said for it.
An artifact that does carry the slot receives one of four `mapKeyState` values:

| state | private/live behavior | committable behavior | what the hand-over says |
| --- | --- | --- | --- |
| `none` | no substitution | copied unchanged | nothing — it is not a map delivery |
| `restricted` | `MAPTILER_DELIVERY_KEY` enters only the keyed page or hosted send | placeholder remains | publish the keyed page; its key is restricted to newsroom domains |
| `development` | `MAPTILER_KEY` enters only the keyed page or hosted send | placeholder remains | publish the keyed page; the development key is readable and billed by usage, plus how to record a restricted key |
| `unkeyed` | no live page is produced | placeholder travels through | the baked layer works, but the map does not pan or zoom |

The key-state recommendation does not itself block delivery. Custody checks do: owned-file delivery
fails closed when `keyed/` collides with source material, a Git index already tracks the final keyed
path, or Git ownership cannot be established safely. Hosted delivery refuses a temporary root inside
any Git worktree. These refusals protect where credential bytes may exist; they never turn a
development-key recommendation into a prohibition on publishing the journalist's work.

Say it in the conversation too, in the journalist's own terms, at the moment the delivery lands:
which key their page carries and what it costs them. Never as a refusal, never with a route around
one — the state is a fact about their file, and the decision to create a restricted key is theirs.

## A refusal states the situation. It never names a way around itself.

Every refusal in this path — and there are twenty — stops and informs, and nothing more. It says what
happened and what the situation is; it does not offer a second route to the same delivery.

That is not a style note. The refusal this skill used to raise over the MapTiler key ended with *"…or
unset `MAPTILER_KEY` for this delivery and the page will ship its complete fallback layer"*, and in
the owner's run the model read it, took that route, and said so: *"Je livre par la voie que le refus
lui-même désigne."* A gate that supplies its own bypass is not a gate — it is a suggestion with extra
steps, and the next reader is always in a hurry.

Two things that are NOT this, because the line is fine: restating the CONDITION the gate waits on
("this beat has not been approved yet — show it first") closes the gate rather than going round it,
and naming the CORRECT API ("each output ID derives its own export directory") is where the work
belongs, not a way to skip a check. The offence is specifically *this refusal stands, and here is how
to get the artifact out anyway*. `test/refusals-name-no-detour.test.ts` triggers every refusal in
this path for real, reads the four scripts' `throw`s statically as well, and reddens on all three
shapes the offer usually takes.
