import { test, expect } from "bun:test";
import { intentsFromAngle } from "./rank-intent";

test("a French takeaway about an evolution yields change-over-time", () => {
  expect(intentsFromAngle("Les prix ont évolué depuis 2019")).toContain(
    "change-over-time",
  );
});

test("a takeaway with no cue yields nothing, never a guess", () => {
  expect(intentsFromAngle("Les chats aiment le fromage")).toEqual([]);
});

test("a takeaway naming a canton yields spatial", () => {
  expect(intentsFromAngle("Un canton se démarque des autres")).toContain(
    "spatial",
  );
});
