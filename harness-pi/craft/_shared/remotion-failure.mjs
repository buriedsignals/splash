/**
 * What a failed Remotion run printed, told so the beat's author can act on it: the lines that name an error first,
 * then the rest of the output's tail — never the react-dom stack frames that buried the one actionable line.
 *
 * @param output  the run's stdout and stderr, concatenated
 * @param keep    how many lines of tail to keep after the error lines
 */
export function remotionFailure(output, keep = 12) {
  const lines = String(output).trim().split("\n");
  const frame = /^\s*at\s+\S.*\(.*:\d+(?::\d+)?\)\s*$|^\s*at\s+\S+\s*\(?node_modules\//;
  const errors = lines.filter((l) => /\bError\b/.test(l) && !frame.test(l) && !/^\s*\d+\s*│/.test(l)).map((l) => l.trim());
  const rest = lines.filter((l) => !frame.test(l) && !errors.includes(l.trim())).slice(-keep);
  return [...errors, ...rest].join("\n").trim() || lines.slice(-keep).join("\n");
}
