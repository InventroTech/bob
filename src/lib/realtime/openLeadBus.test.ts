import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginOpenLeadAction,
  cancelPendingOpenLeadPokes,
  clearLeadHighlightForNotification,
  clearOpenLeadHighlightStash,
  clearRegisteredAllLeadsPath,
  consumePendingOpenLead,
  getActiveLeadHighlight,
  getOpenLeadActionGeneration,
  getPendingOpenLead,
  getRegisteredAllLeadsPath,
  isActiveOpenLeadRequest,
  isOpenLeadActionCurrent,
  normalizeOpenLeadId,
  parsePositiveCrmRecordId,
  PYRO_OPEN_LEAD,
  registerAllLeadsPath,
  requestOpenLead,
  rowMatchesLeadHighlight,
  shouldSupersedeOpenLead,
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

  it("drops the retry poke once an open has already succeeded", () => {
    const opened: string[] = [];
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ record_id: string }>).detail;
      opened.push(detail.record_id);
    };
    window.addEventListener(PYRO_OPEN_LEAD, onOpen);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/app/praja/pages/1" },
    });

    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
    });

    vi.advanceTimersByTime(50);
    expect(opened).toEqual(["111"]);

    // Simulate openLead succeeding and dropping the extra poke.
    expect(
      shouldSupersedeOpenLead({
        isSameLead: true,
        modalTimerPending: true,
        modalAlreadyOpen: false,
      }),
    ).toEqual({ action: "ignore" });
    cancelPendingOpenLeadPokes();

    vi.advanceTimersByTime(400);
    window.removeEventListener(PYRO_OPEN_LEAD, onOpen);

    // Second poke must not fire after success.
    expect(opened).toEqual(["111"]);
  });

  it("does not put lead_name into the navigation query string", () => {
    const navigations: Array<{ search: string }> = [];
    const onNav = (event: Event) => {
      navigations.push(
        (event as CustomEvent<{ search: string }>).detail,
      );
    };
    window.addEventListener("pyro-navigate-to-lead", onNav);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/elsewhere" },
    });

    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Secret Name",
    });

    window.removeEventListener("pyro-navigate-to-lead", onNav);
    expect(navigations[0]?.search).toContain("open_lead=111");
    expect(navigations[0]?.search).toContain("praja_id=PRAJA-A");
    expect(navigations[0]?.search).not.toContain("lead_name");
  });
});

describe("shouldSupersedeOpenLead", () => {
  it("ignores same-lead retry when modal timer is pending", () => {
    expect(
      shouldSupersedeOpenLead({
        isSameLead: true,
        modalTimerPending: true,
        modalAlreadyOpen: false,
      }),
    ).toEqual({ action: "ignore" });
  });

  it("ignores same-lead retry when modal is already open", () => {
    expect(
      shouldSupersedeOpenLead({
        isSameLead: true,
        modalTimerPending: false,
        modalAlreadyOpen: true,
      }),
    ).toEqual({ action: "ignore" });
  });

  it("joins same-lead when card is not pending (retry may still open)", () => {
    expect(
      shouldSupersedeOpenLead({
        isSameLead: true,
        modalTimerPending: false,
        modalAlreadyOpen: false,
      }),
    ).toEqual({ action: "join" });
  });

  it("supersedes when the request is a different lead", () => {
    expect(
      shouldSupersedeOpenLead({
        isSameLead: false,
        modalTimerPending: true,
        modalAlreadyOpen: false,
      }),
    ).toEqual({ action: "supersede" });
  });
});

describe("getOpenLeadActionGeneration", () => {
  it("returns the current generation without bumping", () => {
    const gen = beginOpenLeadAction();
    expect(getOpenLeadActionGeneration()).toBe(gen);
    expect(getOpenLeadActionGeneration()).toBe(gen);
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

describe("openLeadActionGeneration", () => {
  it("invalidates a prior generation when a newer open begins (A then B race)", () => {
    const genA = beginOpenLeadAction();
    expect(isOpenLeadActionCurrent(genA)).toBe(true);

    // Simulates click B (requestOpenLead / openLead) while getLeadById(A) is in flight.
    const genB = beginOpenLeadAction();
    expect(isOpenLeadActionCurrent(genA)).toBe(false);
    expect(isOpenLeadActionCurrent(genB)).toBe(true);
  });

  it("requestOpenLead bumps generation so a late A await must bail", () => {
    const genA = beginOpenLeadAction();
    registerAllLeadsPath("/app/praja/pages/1");
    requestOpenLead({
      record_id: "222",
      praja_id: "PRAJA-B",
      lead_name: "Lead B",
    });
    expect(isOpenLeadActionCurrent(genA)).toBe(false);
    expect(getActiveLeadHighlight()?.record_id).toBe("222");
  });

  it("same lead twice while 450ms modal pending: generation must not bump", () => {
    clearOpenLeadHighlightStash();
    registerAllLeadsPath("/app/praja/pages/1");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/app/praja/pages/1" },
    });

    // Toast click — schedules openLead / 450ms card under firstGen.
    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
      notification_id: 1,
      notification_item_id: "db-1",
    });
    const firstGen = getOpenLeadActionGeneration();
    expect(isActiveOpenLeadRequest({ record_id: "111", praja_id: "PRAJA-A" })).toBe(
      true,
    );

    // openLead would ignore a same-lead poke while the modal timer is pending.
    expect(
      shouldSupersedeOpenLead({
        isSameLead: true,
        modalTimerPending: true,
        modalAlreadyOpen: false,
      }),
    ).toEqual({ action: "ignore" });

    // Inbox click on that same lead before the 450ms timer fires.
    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
      notification_id: 1,
      notification_item_id: "db-1",
    });

    // Must keep firstGen current — otherwise the pending timeout's stillThisOpen
    // fails and ignore never schedules a replacement card.
    expect(getOpenLeadActionGeneration()).toBe(firstGen);
    expect(isOpenLeadActionCurrent(firstGen)).toBe(true);
    expect(getActiveLeadHighlight()?.record_id).toBe("111");
  });

  it("still bumps generation when switching to a different lead", () => {
    clearOpenLeadHighlightStash();
    registerAllLeadsPath("/app/praja/pages/1");
    requestOpenLead({
      record_id: "111",
      praja_id: "PRAJA-A",
      lead_name: "Lead A",
    });
    const genA = getOpenLeadActionGeneration();

    requestOpenLead({
      record_id: "222",
      praja_id: "PRAJA-B",
      lead_name: "Lead B",
    });

    expect(isOpenLeadActionCurrent(genA)).toBe(false);
    expect(getActiveLeadHighlight()?.record_id).toBe("222");
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
        data: { praja_id: "1793876" },
      }),
    ).toBe(true);

    expect(
      rowMatchesLeadHighlight({
        id: "913285",
        praja_id: "1793876",
        data: { user_id: "1793876" },
      }),
    ).toBe(false);

    // Transformed top-level poison must not match when data.praja_id is absent.
    expect(
      rowMatchesLeadHighlight({
        id: "1",
        praja_id: "1793876",
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
