import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOpenLeadHighlightStash,
  consumePendingOpenLead,
  getActiveLeadHighlight,
  getPendingOpenLead,
  normalizeOpenLeadId,
  requestOpenLead,
  rowMatchesLeadHighlight,
  stashOpenLeadHighlight,
} from "@/lib/realtime/openLeadBus";

describe("normalizeOpenLeadId", () => {
  it("returns empty for null and undefined", () => {
    expect(normalizeOpenLeadId(null)).toBe("");
    expect(normalizeOpenLeadId(undefined)).toBe("");
  });

  it("does not poison missing ids as String(null)/String(undefined)", () => {
    expect(normalizeOpenLeadId("null")).toBe("");
    expect(normalizeOpenLeadId("undefined")).toBe("");
    expect(normalizeOpenLeadId("  null  ")).toBe("");
  });

  it("trims and keeps real ids", () => {
    expect(normalizeOpenLeadId(" 913285 ")).toBe("913285");
    expect(normalizeOpenLeadId(913285)).toBe("913285");
  });
});

describe("stashOpenLeadHighlight", () => {
  beforeEach(() => {
    clearOpenLeadHighlightStash();
    consumePendingOpenLead();
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
    consumePendingOpenLead();
  });

  it("does not inherit a previous lead's record_id on a praja-only open", () => {
    stashOpenLeadHighlight({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
      notification_id: 10,
      notification_item_id: "db-10",
    });

    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "PRAJA-B",
      lead_name: "Lead B",
      notification_id: 20,
      notification_item_id: "db-20",
    });

    expect(getActiveLeadHighlight()).toEqual({
      record_id: "",
      praja_id: "PRAJA-B",
      lead_name: "Lead B",
      notification_id: 20,
      notification_item_id: "db-20",
    });
  });

  it("fills missing record_id from the previous stash only for the same praja", () => {
    stashOpenLeadHighlight({
      record_id: "913285",
      praja_id: "1793876",
      lead_name: "Sneha",
      notification_id: 7,
      notification_item_id: "db-7",
    });

    // Later enrichment for the same lead may omit record_id.
    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "1793876",
      lead_name: null,
      notification_id: null,
      notification_item_id: null,
    });

    expect(getActiveLeadHighlight()).toEqual({
      record_id: "913285",
      praja_id: "1793876",
      lead_name: "Sneha",
      notification_id: 7,
      notification_item_id: "db-7",
    });
  });

  it("ignores requests with no usable identity", () => {
    stashOpenLeadHighlight({
      record_id: "null",
      praja_id: undefined,
    });
    expect(getActiveLeadHighlight()).toBeNull();
  });
});

describe("requestOpenLead", () => {
  beforeEach(() => {
    clearOpenLeadHighlightStash();
    consumePendingOpenLead();
    vi.stubGlobal("window", {
      ...window,
      dispatchEvent: vi.fn(),
      setTimeout: vi.fn(),
      location: { pathname: "/app/praja/pages/1" },
      sessionStorage: { removeItem: vi.fn() },
    });
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
    consumePendingOpenLead();
    vi.unstubAllGlobals();
  });

  it("allows praja-only opens when record_id is missing", () => {
    requestOpenLead({
      record_id: "",
      praja_id: "1793876",
      lead_name: "Sneha",
    });

    expect(getPendingOpenLead()).toMatchObject({
      record_id: "",
      praja_id: "1793876",
    });
    expect(getActiveLeadHighlight()?.praja_id).toBe("1793876");
  });

  it("no-ops when both record_id and praja_id are missing/poisoned", () => {
    requestOpenLead({
      record_id: "null",
      praja_id: null,
    });

    expect(getPendingOpenLead()).toBeNull();
    expect(getActiveLeadHighlight()).toBeNull();
  });
});

describe("rowMatchesLeadHighlight", () => {
  beforeEach(() => {
    clearOpenLeadHighlightStash();
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
  });

  it("matches by praja id and does not treat user_id as praja", () => {
    stashOpenLeadHighlight({
      record_id: "913285",
      praja_id: "1793876",
    });

    expect(
      rowMatchesLeadHighlight({
        id: "999",
        praja_id: "1793876",
      }),
    ).toBe(true);

    expect(
      rowMatchesLeadHighlight({
        id: "913285",
        data: { user_id: "1793876" },
      }),
    ).toBe(false);
  });

  it("falls back to record id only when stash has no praja", () => {
    stashOpenLeadHighlight({
      record_id: "913285",
      praja_id: null,
    });

    expect(rowMatchesLeadHighlight({ id: "913285" })).toBe(true);
    expect(rowMatchesLeadHighlight({ record_id: "913285" })).toBe(true);
    expect(rowMatchesLeadHighlight({ id: "1" })).toBe(false);
  });
});
