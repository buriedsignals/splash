# Notes for the maintainer

Defects and rough edges found while running this story. **Not for the journalist** — nothing here
was said to them, and nothing here belongs in `export/`. Each entry names the phase it was found in.

## Found at intake

FROZEN SOURCE IS NOT THE PUBLISHER'S BYTES, AND SIX OF NINE COLUMNS VANISH.
Ran: freezeSource({articlePath, dataPath: USDA NASS hony0326.zip -> hony_p03_t020.csv}), the publisher's own release CSV, unmodified.
Expected: a frozen record identical to what was downloaded, and a profile that either describes the table or says it cannot.
Got, measured:
  1. 2481 bytes in -> 2483 bytes out. The one latin-1 0x97 em dash in the release title became a 3-byte U+FFFD. md5 bcc32519f3fe5d5ab9b959b147f935de -> 41769828860857e9135d3ac6a96bcc74. The freeze reads utf-8 and writes utf-8 with no declared encoding and no report of a replacement character. A record that claims to be frozen changed its own bytes.
  2. parseCsv row field-count histogram over the frozen file: {"3": 11, "9": 31}. profileTable took row 0 (a TITLE row, 3 fields) as the header, so the profile has three columns named "20", "t" and the entire release title sentence, and SIX columns - colonies, yield, production, stocks, price, value, i.e. every number the story is about - are dropped with no ragged-row report of any kind.
  3. The table-id column "20" was typed number and given sum: 820. That is an arithmetic total over a table identifier.
  4. panel: null. The release is a state x year panel and the profiler says nothing about it.
Cost: the profile is unusable downstream; the beat has to read source/data.csv with its own tokeniser and the grounding gate at G1 has nothing real to check a takeaway against.
