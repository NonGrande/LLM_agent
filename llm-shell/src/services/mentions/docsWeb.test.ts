import { describe, expect, it } from "vitest";
import {
  buildSpecialAndFileItems,
  decodeBasicEntities,
  extractTitleFromHtml,
  formatDocsForPrompt,
  formatWebForPrompt,
  getActiveDocsWebMention,
  htmlToPlainText,
  looksLikeUrl,
  normalizeWebUrl,
  parseDocsMentions,
  parseWebMentions,
} from "./docsWeb";

describe("docsWeb helpers", () => {
  it("strips html to plain text", () => {
    const plain = htmlToPlainText("<html><head><title>T</title></head><body><h1>Hi</h1><p>World &amp; more</p></body></html>");
    expect(plain).toContain("Hi");
    expect(plain).toContain("World & more");
    expect(plain).not.toContain("<h1>");
  });

  it("extracts title", () => {
    expect(extractTitleFromHtml("<title> Docs &amp; Web </title>")).toBe("Docs & Web");
  });

  it("decodes basic entities", () => {
    expect(decodeBasicEntities("&lt;tag&gt;")).toBe("<tag>");
  });

  it("normalizes and detects urls", () => {
    expect(normalizeWebUrl("example.com/a")).toBe("https://example.com/a");
    expect(normalizeWebUrl("https://x.test")).toBe("https://x.test");
    expect(looksLikeUrl("https://a.b")).toBe(true);
    expect(looksLikeUrl("not a url")).toBe(false);
  });

  it("parses leftover @web and @docs mentions", () => {
    expect(parseWebMentions("see @web https://ex.com/p and @web example.org")).toEqual([
      "https://ex.com/p",
      "https://example.org",
    ]);
    expect(parseDocsMentions("read @docs docs/STATUS.md and @docs USER.md")).toEqual([
      "docs/STATUS.md",
      "USER.md",
    ]);
  });

  it("detects active @docs / @web mention at cursor", () => {
    const docs = "check @docs STAT";
    expect(getActiveDocsWebMention(docs, docs.length)).toEqual({
      query: "STAT",
      start: docs.indexOf("@docs"),
      mode: "docs",
    });
    const web = "open @web https://a.b/c";
    expect(getActiveDocsWebMention(web, web.length)).toEqual({
      query: "https://a.b/c",
      start: web.indexOf("@web"),
      mode: "web",
    });
  });

  it("builds specials + file picker items", () => {
    const items = buildSpecialAndFileItems("do", ["src/foo.ts"]);
    expect(items.some((i) => i.value === "docs")).toBe(true);
    expect(items.some((i) => i.kind === "file")).toBe(true);
  });

  it("formats web and docs prompt blocks", () => {
    const web = formatWebForPrompt([
      { url: "https://ex.com", title: "Ex", content: "Hello" },
    ]);
    expect(web).toContain("## Web context");
    expect(web).toContain("https://ex.com");
    expect(web).toContain("Hello");

    const docs = formatDocsForPrompt([{ path: "docs/A.md", content: "# A" }]);
    expect(docs).toContain("## Docs context");
    expect(docs).toContain("docs/A.md");
    expect(docs).toContain("# A");
  });
});
