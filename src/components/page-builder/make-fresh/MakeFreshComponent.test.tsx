import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MakeFreshComponent, REQUEST_CHUNK_SIZE } from "./MakeFreshComponent";

const post = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

describe("MakeFreshComponent", () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      data: { updated: ["1793876", "1793877"], skipped: [], not_found: [] },
    });
  });

  it("sends pasted praja ids to make-fresh", async () => {
    render(<MakeFreshComponent />);

    fireEvent.change(screen.getByLabelText("Praja ids"), {
      target: { value: "1793876, 1793877" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make fresh" }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/crm-records/leads/make-fresh/", {
        praja_ids: ["1793876", "1793877"],
      });
    });
    expect(await screen.findByText("2 updated.")).toBeTruthy();
  });

  it("sends a long list in chunks and adds up the results", async () => {
    post.mockImplementation((_url: string, body: { praja_ids: string[] }) =>
      Promise.resolve({ data: { updated: body.praja_ids, skipped: [], not_found: [] } })
    );
    const ids = Array.from({ length: REQUEST_CHUNK_SIZE * 2 + 50 }, (_, index) => String(index + 1));
    render(<MakeFreshComponent />);

    fireEvent.change(screen.getByLabelText("Praja ids"), { target: { value: ids.join("\n") } });
    fireEvent.click(screen.getByRole("button", { name: "Make fresh" }));

    expect(await screen.findByText(`${ids.length} updated.`)).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls.map(([, body]) => body.praja_ids.length)).toEqual([
      REQUEST_CHUNK_SIZE,
      REQUEST_CHUNK_SIZE,
      50,
    ]);
  });

  it("keeps unsent ids when a chunk fails", async () => {
    post
      .mockResolvedValueOnce({ data: { updated: [], skipped: [], not_found: [] } })
      .mockRejectedValueOnce(new Error("Network Error"));
    const ids = Array.from({ length: REQUEST_CHUNK_SIZE + 10 }, (_, index) => String(index + 1));
    render(<MakeFreshComponent />);

    fireEvent.change(screen.getByLabelText("Praja ids"), { target: { value: ids.join(",") } });
    fireEvent.click(screen.getByRole("button", { name: "Make fresh" }));

    expect(await screen.findByText("10 leads ready")).toBeTruthy();
  });

  it("adds ids dropped from a csv praja_id column", async () => {
    render(<MakeFreshComponent />);
    const file = new File(["name,id,praja_id\nAda,44,1793876\n"], "leads.csv", { type: "text/csv" });
    const zone = screen.getByRole("button", { name: /drop a csv/i });

    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    expect(screen.queryByText("1793876")).toBeNull();
  });
});
