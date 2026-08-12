import { describe, expect, it } from "vitest";
import {
  adjustToneForMissingKey,
  classifyHttpStatusForHealth,
  classifyLlmError,
  classifyLlmErrorTone,
  isBillingOrQuotaFailure,
  resolveDetailCode,
  resolveHealthFilterKey,
  itemMatchesHealthFilter,
} from "./healthClassify";

describe("isBillingOrQuotaFailure", () => {
  it("detects HTTP 402", () => {
    expect(isBillingOrQuotaFailure(402, "")).toBe(true);
  });

  it("detects OpenRouter / DeepSeek insufficient balance bodies", () => {
    expect(
      isBillingOrQuotaFailure(
        200,
        'HTTP 402: {"error":{"message":"Insufficient Balance","code":402}}',
      ),
    ).toBe(true);
    expect(isBillingOrQuotaFailure(undefined, "insufficient_balance")).toBe(true);
    expect(isBillingOrQuotaFailure(undefined, "Payment Required")).toBe(true);
  });
});

describe("classifyHttpStatusForHealth", () => {
  it("marks 402 as auth (yellow), not ok", () => {
    expect(classifyHttpStatusForHealth(402)).toBe("auth");
  });

  it("marks 401/403 as auth and 5xx as unreachable", () => {
    expect(classifyHttpStatusForHealth(401)).toBe("auth");
    expect(classifyHttpStatusForHealth(403)).toBe("auth");
    expect(classifyHttpStatusForHealth(503)).toBe("unreachable");
  });

  it("keeps 200 as ok when body has no billing signal", () => {
    expect(classifyHttpStatusForHealth(200, "OK")).toBe("ok");
  });
});

describe("resolveDetailCode", () => {
  it("keeps 401 / 402 / 403 distinct for UI grouping", () => {
    expect(resolveDetailCode(401, "")).toBe(401);
    expect(resolveDetailCode(402, "")).toBe(402);
    expect(resolveDetailCode(403, "")).toBe(403);
  });

  it("maps billing body without status to 402", () => {
    expect(resolveDetailCode(undefined, "insufficient_balance")).toBe(402);
  });

  it("maps missing-key auth tone to 401", () => {
    expect(resolveDetailCode(undefined, "OK — нужен API-ключ для чата", "auth")).toBe(401);
  });

  it("maps geo / forbidden text to 403", () => {
    expect(resolveDetailCode(undefined, "Access denied in this region (geo)", "auth")).toBe(403);
  });
});

describe("resolveHealthFilterKey", () => {
  it("splits auth tones into 401/402/403 buckets", () => {
    expect(
      resolveHealthFilterKey({ tone: "auth", httpStatus: 401, detailCode: 401 }),
    ).toBe("401");
    expect(
      resolveHealthFilterKey({ tone: "auth", httpStatus: 402, detailCode: 402 }),
    ).toBe("402");
    expect(
      resolveHealthFilterKey({ tone: "auth", httpStatus: 403, detailCode: 403 }),
    ).toBe("403");
  });

  it("maps ok and unreachable separately", () => {
    expect(resolveHealthFilterKey({ tone: "ok" })).toBe("ok");
    expect(resolveHealthFilterKey({ tone: "unreachable" })).toBe("fail");
  });

  it("maps other auth (e.g. 429) to fail/other", () => {
    expect(resolveHealthFilterKey({ tone: "auth", httpStatus: 429 })).toBe("fail");
  });
});

describe("itemMatchesHealthFilter", () => {
  it("excludes presets from green filter", () => {
    expect(
      itemMatchesHealthFilter({ tone: "ok", kind: "preset" }, "ok"),
    ).toBe(false);
    expect(
      itemMatchesHealthFilter({ tone: "ok", kind: "profile" }, "ok"),
    ).toBe(true);
  });
});

describe("classifyLlmError", () => {
  it("marks chat 402 / insufficient balance with detail 402", () => {
    const r = classifyLlmError(
      'HTTP 402: {"error":{"message":"Insufficient Balance","code":402}}',
    );
    expect(r).toEqual({ tone: "auth", httpStatus: 402, detailCode: 402 });
    expect(classifyLlmErrorTone("Error: insufficient_balance")).toBe("auth");
  });

  it("marks 401 and 403 distinctly", () => {
    expect(classifyLlmError("HTTP 401 Unauthorized")).toEqual({
      tone: "auth",
      httpStatus: 401,
      detailCode: 401,
    });
    expect(classifyLlmError("HTTP 403 Forbidden")).toEqual({
      tone: "auth",
      httpStatus: 403,
      detailCode: 403,
    });
  });

  it("returns null for unrelated errors", () => {
    expect(classifyLlmError("tool parse failed")).toBeNull();
  });
});

describe("adjustToneForMissingKey", () => {
  it("downgrades keyless cloud ok → auth with detail 401", () => {
    const r = adjustToneForMissingKey("openrouter", "", "ok", "OK HTTP 200");
    expect(r.tone).toBe("auth");
    expect(r.detailCode).toBe(401);
    expect(r.message).toMatch(/API-ключ/);
  });

  it("keeps ollama keyless ok", () => {
    expect(adjustToneForMissingKey("ollama", "", "ok", "OK").tone).toBe("ok");
  });

  it("keeps keyed profile ok", () => {
    expect(adjustToneForMissingKey("openrouter", "sk-x", "ok", "OK").tone).toBe("ok");
  });
});
