import { describe, it, expect } from "bun:test";
import { placeholderSourceReason } from "../src/source-guard";

// GUARD 2 (pure core) — a source URL whose host is an RFC 2606 / RFC 6761 reserved
// placeholder domain is a fabricated citation, not a real dataset. Reject it hard.
describe("placeholderSourceReason", () => {
  it("rejects the reserved second-level domains example.com/.org/.net", () => {
    for (const url of [
      "https://example.com",
      "http://example.org/data",
      "https://example.net/table.csv",
    ]) {
      expect(placeholderSourceReason(url)).not.toBeNull();
    }
  });

  it("rejects a subdomain of a reserved example.* domain", () => {
    expect(
      placeholderSourceReason("https://data.example.com/x"),
    ).not.toBeNull();
    expect(placeholderSourceReason("https://www.example.org")).not.toBeNull();
  });

  it("rejects the reserved TLDs .example/.test/.invalid/.localhost", () => {
    for (const url of [
      "https://foo.example",
      "https://dataset.test/page",
      "https://bar.invalid",
      "http://site.localhost/data",
    ]) {
      expect(placeholderSourceReason(url)).not.toBeNull();
    }
  });

  it("rejects a bare localhost host (with or without a port)", () => {
    expect(placeholderSourceReason("http://localhost")).not.toBeNull();
    expect(placeholderSourceReason("http://localhost:3000/x")).not.toBeNull();
  });

  it("rejects a scheme-less placeholder host (e.g. pasted without https://)", () => {
    expect(placeholderSourceReason("example.com/data")).not.toBeNull();
    expect(placeholderSourceReason("foo.test")).not.toBeNull();
  });

  it("names the offending reserved token in the reason", () => {
    expect(placeholderSourceReason("https://example.com")).toContain(
      "example.com",
    );
    expect(placeholderSourceReason("https://x.test")).toContain("test");
  });

  it("PASSES real, specific dataset/page URLs", () => {
    for (const url of [
      "https://ec.europa.eu/eurostat/databrowser/view/env_waspac/default/table",
      "https://www.insee.fr/fr/statistiques/serie/001688527",
      "https://data.gouv.fr/datasets/loyers",
      "https://ourworldindata.org/grapher/co2-emissions",
    ]) {
      expect(placeholderSourceReason(url)).toBeNull();
    }
  });

  it("does NOT false-reject real domains that merely CONTAIN a reserved label", () => {
    // "example" as a non-terminal label of a real registrable domain is fine — only the
    // exact reserved example.com/.org/.net (or the reserved TLDs) are placeholders.
    expect(placeholderSourceReason("https://myexample.com/data")).toBeNull();
    expect(placeholderSourceReason("https://example-data.fr/x")).toBeNull();
    expect(placeholderSourceReason("https://testing.gov.uk/x")).toBeNull();
  });

  it("returns null for an empty or unparseable url (not this guard's concern)", () => {
    expect(placeholderSourceReason("")).toBeNull();
    expect(placeholderSourceReason("   ")).toBeNull();
    expect(placeholderSourceReason("not a url at all")).toBeNull();
  });
});
