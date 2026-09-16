import { describe, expect, it } from "vitest";
import { transformLeadData } from "./utils";
import { getLeadRowPrajaId } from "@/lib/realtime/openLeadBus";

describe("transformLeadData praja_id", () => {
  it("does not fall back to user_id when praja_id is missing", () => {
    const row = transformLeadData({
      id: 999,
      data: {
        name: "Lead",
        user_id: "USER-123",
      },
    });

    expect(row.praja_id).toBe("N/A");
    expect(row.praja_id).not.toBe("USER-123");
    expect(row.praja_id).not.toBe(999);
  });

  it("does not keep a top-level praja_id that was only user_id", () => {
    const row = transformLeadData({
      id: 999,
      praja_id: "USER-123",
      data: {
        name: "Lead",
        user_id: "USER-123",
      },
    });

    expect(row.praja_id).toBe("N/A");
  });

  it("uses real praja_id from data when present", () => {
    const row = transformLeadData({
      id: 999,
      data: {
        name: "Lead",
        praja_id: "1793876",
        user_id: "USER-123",
      },
    });

    expect(row.praja_id).toBe("1793876");
  });

  it("with columns config, still prefers data.praja_id over user_id", () => {
    const row = transformLeadData(
      {
        id: 999,
        praja_id: "USER-123",
        data: {
          name: "Lead",
          user_id: "USER-123",
          praja_id: "1793876",
        },
      },
      {
        columns: [
          { key: "name", header: "Name", type: "text" },
          { key: "praja_id", header: "Praja ID", type: "text" },
        ],
      } as any,
    );

    expect(row.praja_id).toBe("1793876");
  });
});

describe("getLeadRowPrajaId", () => {
  it("reads data.praja_id and ignores transformed top-level user_id poison", () => {
    expect(
      getLeadRowPrajaId({
        praja_id: "USER-123",
        data: { user_id: "USER-123", praja_id: "1793876" },
      }),
    ).toBe("1793876");
  });

  it("does not match top-level praja_id when it equals user_id and data.praja is missing", () => {
    expect(
      getLeadRowPrajaId({
        praja_id: "USER-123",
        data: { user_id: "USER-123" },
      }),
    ).toBeNull();
  });

  it("returns null when only user_id exists", () => {
    expect(
      getLeadRowPrajaId({
        id: 1,
        data: { user_id: "USER-123" },
      }),
    ).toBeNull();
  });
});
