import { describe, expect, it } from "vitest";
import { extractToolCallsFromText } from "./parseTextToolCalls";

describe("extractToolCallsFromText", () => {
  it("parses TOOL_CALL block", () => {
    const text = `TOOL_CALL
{"name":"read_file","arguments":{"filePath":"C:\\\\Users\\\\a\\\\docs\\\\TZ.md"}}`;
    const { toolCalls, cleanedContent } = extractToolCallsFromText(text);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe("read_file");
    expect(JSON.parse(toolCalls[0].function.arguments).filePath).toContain("TZ.md");
    expect(cleanedContent).not.toMatch(/TOOL_CALL/);
  });

  it("parses bare JSON tool call", () => {
    const text = `I will read now
{"name":"list_files","arguments":{"dirPath":"C:\\\\proj"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(toolCalls.some((t) => t.function.name === "list_files")).toBe(true);
  });

  it("normalizes path alias for read_file", () => {
    const text = `{"name":"read_file","arguments":{"path":"C:\\\\a.txt"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(JSON.parse(toolCalls[0].function.arguments).filePath).toBe("C:\\a.txt");
  });

  it("normalizes path alias for write_file", () => {
    const text = `{"name":"write_file","arguments":{"path":"C:\\\\a.txt","content":"hi"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(JSON.parse(toolCalls[0].function.arguments).filePath).toBe("C:\\a.txt");
  });

  it("normalizes file_path and filepath aliases", () => {
    const text = `{"name":"read_file","arguments":{"file_path":"C:\\\\b.txt"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(JSON.parse(toolCalls[0].function.arguments).filePath).toBe("C:\\b.txt");
  });

  it("normalizes dir aliases for list_files", () => {
    const text = `{"name":"list_files","arguments":{"directory":"C:\\\\proj"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(JSON.parse(toolCalls[0].function.arguments).dirPath).toBe("C:\\proj");
  });

  it("parses apply_patch as known tool", () => {
    const text = `{"name":"apply_patch","arguments":{"filePath":"C:\\\\a.ts","patch":"@@"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(toolCalls[0].function.name).toBe("apply_patch");
  });

  it("ignores unknown tool names", () => {
    const text = `{"name":"hack_system","arguments":{}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(toolCalls).toHaveLength(0);
  });

  it("parses take_screenshot", () => {
    const text = `TOOL_CALL
{"name":"take_screenshot","arguments":{"target":"primary"}}`;
    const { toolCalls } = extractToolCallsFromText(text);
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe("take_screenshot");
  });
});
