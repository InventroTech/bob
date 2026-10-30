import { describe, expect, it } from "vitest";
import { chunkIds, mergePrajaIds, parsePrajaIds } from "./parsePrajaIds";

describe("parsePrajaIds", () => {
  it("reads pasted praja ids separated by commas, spaces, or new lines", () => {
    expect(parsePrajaIds("1793876, 1793877\nPRAJA-1 1793876").ids).toEqual([
      "1793876",
      "1793877",
      "PRAJA-1",
    ]);
  });

  it("uses the praja_id column from a csv and ignores the record id column", () => {
    const csv = "name,id,praja_id\nAda,101,1793876\nBea,102,1793877\n";
    expect(parsePrajaIds(csv).ids).toEqual(["1793876", "1793877"]);
  });

  it("accepts a Praja ID header written with a space", () => {
    expect(parsePrajaIds("Praja ID\n555\n556\n").ids).toEqual(["555", "556"]);
  });

  it("reads a user_id column as praja ids without the header", () => {
    expect(parsePrajaIds("user_id\n57557\n220563\n").ids).toEqual(["57557", "220563"]);
  });

  it("prefers praja_id over user_id when both columns exist", () => {
    expect(parsePrajaIds("user_id,praja_id\n1,1793876\n").ids).toEqual(["1793876"]);
  });

  it("skips an unknown header line", () => {
    expect(parsePrajaIds("lead number\n57557\n220563\n").ids).toEqual(["57557", "220563"]);
  });

  it("rejects a file that only has lead record ids", () => {
    const parsed = parsePrajaIds("id,name\n101,Ada\n");
    expect(parsed.ids).toEqual([]);
    expect(parsed.error).toMatch(/praja_id/i);
  });

  it("keeps every id in a large list", () => {
    const text = Array.from({ length: 5000 }, (_, index) => index + 1).join("\n");
    expect(parsePrajaIds(text).ids).toHaveLength(5000);
  });
});

describe("mergePrajaIds", () => {
  it("appends new ids and drops duplicates", () => {
    expect(mergePrajaIds(["1", "2"], ["2", "3"])).toEqual(["1", "2", "3"]);
  });
});

describe("chunkIds", () => {
  it("splits ids into request-sized groups", () => {
    expect(chunkIds(["1", "2", "3", "4", "5"], 2)).toEqual([["1", "2"], ["3", "4"], ["5"]]);
  });
});
