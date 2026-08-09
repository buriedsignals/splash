import { describe, it, expect } from "bun:test";
import {
  buildInsertion,
  assertNotPartialReplace,
  CMS_KINDS,
} from "../scripts/cms-insert.mjs";

describe("assertNotPartialReplace", () => {
  it("should throw when previousBody is empty", () => {
    expect(() =>
      assertNotPartialReplace("", "<p>new</p>", "<p>new</p>"),
    ).toThrow("empty");
  });

  it("should throw when previousBody is only whitespace", () => {
    expect(() =>
      assertNotPartialReplace("   \n  ", "<p>new</p>", "<p>new</p>"),
    ).toThrow("empty");
  });

  it("should throw when the insertion cannot be found in nextBody at all", () => {
    const previous = "<p>Paragraph one.</p>";
    expect(() =>
      assertNotPartialReplace(previous, previous, "<figure>chart</figure>"),
    ).toThrow("does not contain the insertion");
  });

  it("should throw when removing the insertion from nextBody drops part of the previous article", () => {
    const previous = "<p>Paragraph one.</p><p>Paragraph two.</p>";
    const insertion = "<figure>chart</figure>";
    // Paragraph two silently dropped as well as the insertion added — the guard must catch this
    // even though the insertion itself IS present.
    const next = `<p>Paragraph one.</p>${insertion}`;
    expect(() => assertNotPartialReplace(previous, next, insertion)).toThrow(
      "does not equal the previous article body",
    );
  });

  it("should pass when nextBody is exactly the previous body plus the insertion, appended", () => {
    const previous = "<p>Paragraph one.</p><p>Paragraph two.</p>";
    const insertion = "<figure>the chart</figure>";
    const next = `${previous}${insertion}`;
    expect(() =>
      assertNotPartialReplace(previous, next, insertion),
    ).not.toThrow();
  });

  it("should pass when the insertion lands in the middle, as long as everything else survives", () => {
    const previous = "<p>Intro.</p><p>Rest.</p>";
    const insertion = "<figure>the chart</figure>";
    const next = "<p>Intro.</p>" + insertion + "<p>Rest.</p>";
    expect(() =>
      assertNotPartialReplace(previous, next, insertion),
    ).not.toThrow();
  });

  it("should throw when nextBody alters the previous article's own text, not just adds to it", () => {
    const previous = "<p>original text here</p>";
    const insertion = "<figure>chart</figure>";
    const next = "<p>replaced text herexx</p>" + insertion;
    expect(() => assertNotPartialReplace(previous, next, insertion)).toThrow();
  });
});

describe("buildInsertion", () => {
  it("should know exactly two CMS kinds", () => {
    expect(CMS_KINDS).toEqual(["we-publish", "livingdocs"]);
  });

  it("should refuse an unknown CMS kind", () => {
    expect(() =>
      buildInsertion({
        kind: "wordpress",
        articleId: "a1",
        previousBody: "<p>x</p>",
        insertionHtml: "<figure>chart</figure>",
      }),
    ).toThrow("unknown CMS kind");
  });

  it("should refuse an empty insertionHtml", () => {
    expect(() =>
      buildInsertion({
        kind: "livingdocs",
        articleId: "a1",
        insertionHtml: "   ",
      }),
    ).toThrow("nothing to insert");
  });

  it("should build a we-publish mutation as a total-replace, carrying the full previous body forward", () => {
    const previousBody = "<p>Paragraph one.</p>";
    const insertion = buildInsertion({
      kind: "we-publish",
      articleId: "article-42",
      previousBody,
      insertionHtml: "<figure>chart</figure>",
    });
    expect(insertion.mutation).toBe("updateArticle");
    expect(insertion.shape).toBe("total-replace");
    expect(insertion.variables.id).toBe("article-42");
    expect(insertion.variables.body).toContain(previousBody);
    expect(insertion.variables.body).toContain("<figure>chart</figure>");
  });

  it("should insert a we-publish mutation right after the named marker, when the marker is present", () => {
    const previousBody =
      "<p>Intro.</p><!--INSERT-HERE--><p>Rest of the article.</p>";
    const insertion = buildInsertion({
      kind: "we-publish",
      articleId: "article-42",
      previousBody,
      insertionHtml: "<figure>chart</figure>",
      afterMarker: "<!--INSERT-HERE-->",
    });
    const body = insertion.variables.body as string;
    expect(body.indexOf("<!--INSERT-HERE-->")).toBeLessThan(
      body.indexOf("<figure>chart</figure>"),
    );
    expect(body.indexOf("<figure>chart</figure>")).toBeLessThan(
      body.indexOf("<p>Rest of the article.</p>"),
    );
  });

  it("should build a livingdocs mutation as a genuine insertion, never reading previousBody", () => {
    const insertion = buildInsertion({
      kind: "livingdocs",
      articleId: "article-42",
      insertionHtml: "<figure>chart</figure>",
    });
    expect(insertion.mutation).toBe("insertComponent");
    expect(insertion.shape).toBe("insert");
    expect(insertion.variables.articleId).toBe("article-42");
    expect(insertion.variables.component).toEqual({
      type: "html",
      html: "<figure>chart</figure>",
    });
  });

  it("should mark both mutation shapes unproven — neither has ever been sent to a live CMS", () => {
    const we = buildInsertion({
      kind: "we-publish",
      articleId: "a1",
      previousBody: "<p>x</p>",
      insertionHtml: "<figure>chart</figure>",
    });
    const ld = buildInsertion({
      kind: "livingdocs",
      articleId: "a1",
      insertionHtml: "<figure>chart</figure>",
    });
    expect(we.unproven).toBe(true);
    expect(ld.unproven).toBe(true);
  });
});
