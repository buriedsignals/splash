import { describe, it, expect, beforeEach } from "bun:test";
import {
  registerPublisher,
  lookupPublisher,
  allPublishers,
  resetPublishersForTest,
  type Publisher,
} from "./publishers";
import { ok } from "./verbs/types";

function stub(id: string, implemented = true): Publisher {
  return {
    id,
    kind: "package",
    implemented,
    publish: async () =>
      ok({
        publisherId: id,
        kind: "package" as const,
        path: "/tmp/x.zip",
        snippet: "",
        publishedAt: "1980-01-01T00:00:00.000Z",
      }),
  };
}

describe("publisher registry", () => {
  beforeEach(() => resetPublishersForTest());

  it("should return the publisher that was registered under its id", () => {
    const p = stub("zip");
    registerPublisher(p);
    expect(lookupPublisher("zip")).toBe(p);
  });

  it("should return undefined for an id nobody registered", () => {
    expect(lookupPublisher("embed-nowhere")).toBeUndefined();
  });

  it("should throw on a duplicate id rather than shadow the first registration", () => {
    registerPublisher(stub("zip"));
    expect(() => registerPublisher(stub("zip"))).toThrow(
      "publisher already registered: zip",
    );
  });

  it("should list every registered publisher, declared-but-unimplemented ones included", () => {
    registerPublisher(stub("zip"));
    registerPublisher(stub("embed-fly", false));
    expect(
      allPublishers()
        .map((p) => p.id)
        .sort(),
    ).toEqual(["embed-fly", "zip"]);
  });
});
