# Bar and column, composed — the `gestures` field

DRAFT for the composition probe (U10). U4 completes it with the plate's other fields.

The bars are drawn from the rows below, one per row, on one scale from zero. YOU decide the staging: an ordered
list `gestures`, in the order the story tells it. Nothing is staged that you do not write.

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

## How to write one

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "bracket", mark: "Alpha", of: "whole", note: "60 of 100" },
  { do: "compare", marks: ["Alpha", "Beta"], note: "three times Beta's 20" },
]
```

| field | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as the rows name it |
| `marks` | several rows. For `compare`: the subject first, then the row it is compared with. For `bracket`: rows that sit together |
| `of` | what a bracket or compare measures against: `"whole"` (the total of every row) or a list of rows |
| `value` | a number (a reference line's level, a rescale's new top), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture |

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the rows (a value, a sum, a share, a difference, a ratio), written at
  the precision you choose. A number the rows do not give is refused.
- "twice", "three times", "half" in a note are checked against the ratio of the two rows.
- A gesture that changes nothing (the same highlight twice) and two notes on one row are refused.
- Choose the gestures that make the takeaway visible on the plate.
