import { describe, expect, it } from "vitest";
import {
  langFromPath,
  monacoLangToLsp,
  resolveServerSpec,
  DEFAULT_LSP_SERVERS,
} from "@/services/lsp/languages";
import { pathToUri, uriToPath } from "@/services/lsp/LspClient";

describe("langFromPath", () => {
  it("maps C++/C#/Go/HTML", () => {
    expect(langFromPath("a.cpp")).toBe("cpp");
    expect(langFromPath("a.cs")).toBe("csharp");
    expect(langFromPath("a.go")).toBe("go");
    expect(langFromPath("a.html")).toBe("html");
    expect(langFromPath("a.py")).toBe("python");
    expect(langFromPath("a.rs")).toBe("rust");
  });

  it("does not fall to plaintext for common IDE langs", () => {
    expect(langFromPath("x.hpp")).not.toBe("plaintext");
    expect(langFromPath("Main.java")).toBe("java");
  });
});

describe("resolveServerSpec", () => {
  it("returns defaults for wave1/wave2", () => {
    expect(resolveServerSpec("python")?.command).toContain("basedpyright");
    expect(resolveServerSpec("cpp")?.command).toBe("clangd");
    expect(resolveServerSpec("csharp")?.command).toBe("csharp-ls");
    expect(resolveServerSpec("rust")?.command).toBe("rust-analyzer");
  });

  it("honors overrides", () => {
    const s = resolveServerSpec("python", {
      python: { command: "pyright-langserver", args: ["--stdio"] },
    });
    expect(s?.command).toBe("pyright-langserver");
  });

  it("covers DEFAULT_LSP_SERVERS keys", () => {
    expect(Object.keys(DEFAULT_LSP_SERVERS).length).toBeGreaterThanOrEqual(10);
  });
});

describe("uri helpers", () => {
  it("roundtrips windows path", () => {
    const p = "C:\\Users\\a\\file.ts";
    const uri = pathToUri(p);
    expect(uri.startsWith("file:///")).toBe(true);
    expect(uriToPath(uri).toLowerCase()).toContain("file.ts");
  });
});

describe("monacoLangToLsp", () => {
  it("maps shell", () => {
    expect(monacoLangToLsp("shell")).toBe("shellscript");
    expect(monacoLangToLsp("typescript")).toBe("typescript");
  });
});
