import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLeadHighlightForNotification,
  clearOpenLeadHighlightStash,
  clearRegisteredAllLeadsPath,
  consumePendingOpenLead,
  getActiveLeadHighlight,
  getPendingOpenLead,
  getRegisteredAllLeadsPath,
  isActiveOpenLeadRequest,
  normalizeOpenLeadId,
  parsePositiveCrmRecordId,
  PYRO_OPEN_LEAD,
  registerAllLeadsPath,
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

describe("parsePositiveCrmRecordId", () => {
  it("rejects empty / zero / non-numeric so Number(\"\") cannot become 0", () => {
    expect(parsePositiveCrmRecordId("")).toBeNull();
    expect(parsePositiveCrmRecordId("   ")).toBeNull();
    expect(parsePositiveCrmRecordId(null)).toBeNull();
    expect(parsePositiveCrmRecordId(undefined)).toBeNull();
    expect(parsePositiveCrmRecordId("0")).toBeNull();
    expect(parsePositiveCrmRecordId(0)).toBeNull();
    expect(parsePositiveCrmRecordId("null")).toBeNull();
    expect(parsePositiveCrmRecordId("12.5")).toBeNull();
    expect(parsePositiveCrmRecordId("-3")).toBeNull();
  });

  it("accepts positive integer ids", () => {
    expect(parsePositiveCrmRecordId("913285")).toBe(913285);
    expect(parsePositiveCrmRecordId(42)).toBe(42);
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
    clearRegisteredAllLeadsPath();
    registerAllLeadsPath("/app/praja/pages/1");
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
    consumePendingOpenLead();
    clearRegisteredAllLeadsPath();
    vi.useRealTimers();
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

  it("cancels lead A delayed pokes when lead B is opened", () => {
    const opened: Array<{ record_id: string; praja_id?: string | null }> = [];
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ record_id: string; praja_id?: string | null }>)
        .detail;
      opened.push({
        record_id: detail.record_id,
        praja_id: detail.praja_id,
      });
    };
    window.addEventListener(PYRO_OPEN_LEAD, onOpen);

    // Pretend we are already on All Leads so short delays apply.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/app/praja/pages/1" },
    });

    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
    });
    requestOpenLead({
      record_id: "222",
      praja_id: "PRAJA-B",
      lead_name: "Lead B",
    });

    vi.advanceTimersByTime(1500);
    window.removeEventListener(PYRO_OPEN_LEAD, onOpen);

    expect(opened.every((item) => item.record_id === "222")).toBe(true);
    expect(opened.some((item) => item.record_id === "111")).toBe(false);
    expect(getActiveLeadHighlight()?.record_id).toBe("222");
  });
});

describe("isActiveOpenLeadRequest", () => {
  beforeEach(() => {
    clearOpenLeadHighlightStash();
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
  });

  it("returns false for a stale lead A after stash moved to lead B", () => {
    stashOpenLeadHighlight({
      record_id: "111",
      praja_id: "PRAJA-A",
    });
    expect(
      isActiveOpenLeadRequest({ record_id: "111", praja_id: "PRAJA-A" }),
    ).toBe(true);

    stashOpenLeadHighlight({
      record_id: "222",
      praja_id: "PRAJA-B",
    });
    expect(
      isActiveOpenLeadRequest({ record_id: "111", praja_id: "PRAJA-A" }),
    ).toBe(false);
    expect(
      isActiveOpenLeadRequest({ record_id: "222", praja_id: "PRAJA-B" }),
    ).toBe(true);
  });

  it("matches praja-only stash against the same praja", () => {
    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "PRAJA-A",
    });
    expect(
      isActiveOpenLeadRequest({ record_id: "", praja_id: "PRAJA-A" }),
    ).toBe(true);
    expect(
      isActiveOpenLeadRequest({ record_id: "", praja_id: "PRAJA-B" }),
    ).toBe(false);
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

describe("registered All Leads path", () => {
  afterEach(() => {
    clearRegisteredAllLeadsPath();
  });

  it("registers and clears the path", () => {
    registerAllLeadsPath("/app/praja/pages/42?x=1");
    expect(getRegisteredAllLeadsPath()).toBe("/app/praja/pages/42");

    clearRegisteredAllLeadsPath();
    expect(getRegisteredAllLeadsPath()).toBeNull();
  });
});

describe("clearLeadHighlightForNotification", () => {
  beforeEach(() => {
    clearOpenLeadHighlightStash();
  });

  afterEach(() => {
    clearOpenLeadHighlightStash();
  });

  it("does not treat two empty record_ids as the same lead", () => {
    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "PRAJA-A",
      notification_id: 1,
      notification_item_id: "db-1",
    });

    clearLeadHighlightForNotification({
      id: "db-2",
      notificationId: 2,
      payload: { record_id: "", praja_id: "PRAJA-B" },
    });

    expect(getActiveLeadHighlight()?.praja_id).toBe("PRAJA-A");
  });

  it("clears when praja ids match even if record_id is empty", () => {
    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "PRAJA-A",
      notification_id: 1,
      notification_item_id: "db-1",
    });

    clearLeadHighlightForNotification({
      id: "db-2",
      notificationId: 2,
      payload: { record_id: "", praja_id: "PRAJA-A" },
    });

    expect(getActiveLeadHighlight()).toBeNull();
  });

  it("clears when notification item id matches", () => {
    stashOpenLeadHighlight({
      record_id: "",
      praja_id: "PRAJA-A",
      notification_id: 1,
      notification_item_id: "db-1",
    });

    clearLeadHighlightForNotification({
      id: "db-1",
      notificationId: 1,
      payload: { record_id: "", praja_id: "PRAJA-OTHER" },
    });

    expect(getActiveLeadHighlight()).toBeNull();
  });
});
