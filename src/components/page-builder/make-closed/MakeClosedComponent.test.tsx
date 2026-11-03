import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { MakeClosedConfig } from "@/components/page-builder/component-config/MakeClosedConfig";
import {
  CLOSE_REQUEST_CHUNK_SIZE,
  DEFAULT_CLOSE_TITLE,
  MAKE_CLOSED_ENDPOINT,
  MakeClosedComponent,
} from "./MakeClosedComponent";
const post = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiClient: { post: (...args: unknown[]) => post(...args) },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

const typeIds = (value: string) =>
  fireEvent.change(screen.getByLabelText("Praja ids"), { target: { value } });

const closeButton = () => screen.getByRole("button", { name: /close leads|closing/i });

const dropZone = () => screen.getByRole("button", { name: /drop a csv/i });

const dropFile = (contents: string, name = "leads.csv", type = "text/csv") =>
  fireEvent.drop(dropZone(), { dataTransfer: { files: [new File([contents], name, { type })] } });

const okResponse = (
  updated: string[] = [],
  skipped: Array<{ praja_id: string; reason: string }> = [],
  notFound: string[] = []
) => ({
  data: { updated, skipped, not_found: notFound },
});

/** A post mock that reports every id it is sent as updated. */
const echoUpdated = (_url: string, body: { praja_ids: string[] }) => Promise.resolve(okResponse(body.praja_ids));

const idRange = (count: number, start = 1) => Array.from({ length: count }, (_, index) => String(index + start));

const sentIds = (call = 0) => post.mock.calls[call][1].praja_ids as string[];

const submitIds = async (value: string) => {
  render(<MakeClosedComponent />);
  typeIds(value);
  fireEvent.click(closeButton());
  await waitFor(() => expect(post).toHaveBeenCalled());
};

beforeEach(() => {
  post.mockReset();
  post.mockImplementation(echoUpdated);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("display", () => {
  it("shows the default title, description and button", () => {
    render(<MakeClosedComponent />);

    expect(screen.getAllByText(DEFAULT_CLOSE_TITLE)).toHaveLength(2);
    expect(screen.getByText(/no RM gets them again/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close leads" })).toBeTruthy();
  });

  it("uses a custom title and description", () => {
    render(<MakeClosedComponent config={{ title: "Close dead leads", description: "Ops only" }} />);

    expect(screen.getByText("Close dead leads")).toBeTruthy();
    expect(screen.getByText("Ops only")).toBeTruthy();
  });

  it("falls back to the defaults for a blank title and description", () => {
    render(<MakeClosedComponent config={{ title: "   ", description: "  " }} />);

    expect(screen.getAllByText(DEFAULT_CLOSE_TITLE)).toHaveLength(2);
    expect(screen.getByText(/no RM gets them again/i)).toBeTruthy();
  });

  it("shows no result and no ready count before anything is added", () => {
    render(<MakeClosedComponent />);

    expect(screen.queryByText(/updated\./)).toBeNull();
    expect(screen.queryByText(/ready/)).toBeNull();
  });

  it("labels the text box for screen readers and shows an example placeholder", () => {
    render(<MakeClosedComponent />);

    expect(screen.getByLabelText("Praja ids").getAttribute("placeholder")).toBe("1793876, 1793877");
  });

  it("never shows a make-fresh button", () => {
    render(<MakeClosedComponent />);

    expect(screen.queryByRole("button", { name: /make fresh/i })).toBeNull();
  });
});

describe("drop area and file picker", () => {
  it("opens the file picker on click", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    render(<MakeClosedComponent />);

    fireEvent.click(dropZone());

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("opens the file picker with Enter or Space", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    render(<MakeClosedComponent />);

    fireEvent.keyDown(dropZone(), { key: "Enter" });
    fireEvent.keyDown(dropZone(), { key: " " });

    expect(click).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    render(<MakeClosedComponent />);

    fireEvent.keyDown(dropZone(), { key: "a" });
    fireEvent.keyDown(dropZone(), { key: "Escape" });

    expect(click).not.toHaveBeenCalled();
  });

  it("highlights while a file is dragged over and clears on leave", () => {
    render(<MakeClosedComponent />);

    fireEvent.dragEnter(dropZone());
    expect(dropZone().className).toContain("bg-[#EDEDED]");

    fireEvent.dragLeave(dropZone());
    expect(dropZone().className).toContain("bg-[#F7F7F7]");
  });

  it("clears the highlight after a drop", async () => {
    render(<MakeClosedComponent />);

    fireEvent.dragOver(dropZone());
    dropFile("praja_id\n1793876\n");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    expect(dropZone().className).not.toContain("bg-[#EDEDED]");
  });

  it("accepts csv, txt and tsv files in the picker", () => {
    const { container } = render(<MakeClosedComponent />);

    const accept = container.querySelector('input[type="file"]')?.getAttribute("accept") ?? "";
    for (const ext of [".csv", ".txt", ".tsv"]) expect(accept).toContain(ext);
  });

  it("adds ids from a file chosen in the picker and resets the picker", async () => {
    const { container } = render(<MakeClosedComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(["praja_id\n1\n2\n"], "a.csv")] } });

    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("does nothing when a drop has no file", () => {
    render(<MakeClosedComponent />);

    fireEvent.drop(dropZone(), { dataTransfer: { files: [] } });

    expect(screen.queryByText(/ready/)).toBeNull();
    expect(screen.queryByText(/No praja ids found/)).toBeNull();
  });
});

describe("pasted ids", () => {
  it("reads ids separated by commas, new lines, spaces and semicolons", async () => {
    await submitIds("1,2\n3 4;5\r\n6");

    expect(sentIds()).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("sends a duplicated id once", async () => {
    await submitIds("1793876, 1793876\n1793876");

    expect(sentIds()).toEqual(["1793876"]);
  });

  it("trims spaces around ids", async () => {
    await submitIds("   1793876   ");

    expect(sentIds()).toEqual(["1793876"]);
  });

  it("ignores words without digits such as headers", async () => {
    await submitIds("praja_id\n1793876\nname");

    expect(sentIds()).toEqual(["1793876"]);
  });

  it("ignores ids with special characters or longer than 64 characters", async () => {
    await submitIds(`1793876 90'01 ${"9".repeat(65)} 12.5`);

    expect(sentIds()).toEqual(["1793876"]);
  });

  it("keeps letters, dashes and underscores in ids", async () => {
    await submitIds("PRAJA_1-a");

    expect(sentIds()).toEqual(["PRAJA_1-a"]);
  });

  it("asks for an id when the text box has only words", () => {
    render(<MakeClosedComponent />);

    typeIds("hello world");
    fireEvent.click(closeButton());

    expect(screen.getByText("Add at least one praja id.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects pasted text that has only lead record ids", () => {
    render(<MakeClosedComponent />);

    typeIds("id,name\n55,Ada");
    fireEvent.click(closeButton());

    expect(screen.getByText(/lead record ids/)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("files", () => {
  it("uses only the praja_id column of a csv", async () => {
    render(<MakeClosedComponent />);

    dropFile("name,id,praja_id\nAda,44,1793876\nBen,45,1793877\n");

    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    fireEvent.click(closeButton());
    await waitFor(() => expect(sentIds()).toEqual(["1793876", "1793877"]));
  });

  it("uses a user_id column as praja ids", async () => {
    render(<MakeClosedComponent />);

    dropFile("user_id,name\n991,Ada\n");
    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    fireEvent.click(closeButton());

    await waitFor(() => expect(sentIds()).toEqual(["991"]));
  });

  it("prefers praja_id over user_id when both columns exist", async () => {
    render(<MakeClosedComponent />);

    dropFile("user_id,praja_id\n111,222\n");
    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    fireEvent.click(closeButton());

    await waitFor(() => expect(sentIds()).toEqual(["222"]));
  });

  it("matches header names regardless of capitals and spaces", async () => {
    render(<MakeClosedComponent />);

    dropFile("Name,Praja ID\nAda,1793876\n");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
  });

  it("reads quoted csv values with commas inside", async () => {
    render(<MakeClosedComponent />);

    dropFile('name,praja_id\n"Doe, Jane","445"\n');
    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    fireEvent.click(closeButton());

    await waitFor(() => expect(sentIds()).toEqual(["445"]));
  });

  it("reads tab-separated files", async () => {
    render(<MakeClosedComponent />);

    dropFile("name\tpraja_id\nAda\t991\n", "leads.tsv", "text/tab-separated-values");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
  });

  it("reads a plain text file with one id per line", async () => {
    render(<MakeClosedComponent />);

    dropFile("6595216\n3493542\n1672646\n", "ids.txt", "text/plain");

    expect(await screen.findByText("3 leads ready")).toBeTruthy();
  });

  it("ignores a byte-order mark at the start of the file", async () => {
    render(<MakeClosedComponent />);

    dropFile("\uFEFFpraja_id\n1793876\n");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
  });

  it("rejects a csv with only lead record id columns", async () => {
    render(<MakeClosedComponent />);

    dropFile("id,record_id,name\n1,2,Ada\n");

    expect(await screen.findByText(/This file has lead record ids/)).toBeTruthy();
    expect(screen.queryByText(/ready/)).toBeNull();
  });

  it("says no praja ids were found in an empty file", async () => {
    render(<MakeClosedComponent />);

    dropFile("");

    expect(await screen.findByText("No praja ids found.")).toBeTruthy();
  });

  it("says no praja ids were found in a file with only words", async () => {
    render(<MakeClosedComponent />);

    dropFile("name\nAda\nBen\n");

    expect(await screen.findByText("No praja ids found.")).toBeTruthy();
  });

  it("shows an error when the file cannot be read", async () => {
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
    });
    render(<MakeClosedComponent />);

    dropFile("praja_id\n1\n");

    expect(await screen.findByText("Could not read that file.")).toBeTruthy();
  });

  it("merges two dropped files without duplicates", async () => {
    render(<MakeClosedComponent />);

    dropFile("1\n2\n");
    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    dropFile("2\n3\n");

    expect(await screen.findByText("3 leads ready")).toBeTruthy();
  });

  it("clears an earlier file error once a good file is dropped", async () => {
    render(<MakeClosedComponent />);

    dropFile("");
    expect(await screen.findByText("No praja ids found.")).toBeTruthy();
    dropFile("1793876\n");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    expect(screen.queryByText("No praja ids found.")).toBeNull();
  });

  it("Clear removes the ready list", async () => {
    render(<MakeClosedComponent />);

    dropFile("1\n2\n");
    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByText(/ready/)).toBeNull();
  });
});

describe("submitting", () => {
  it("posts to make-closed and never to make-fresh", async () => {
    await submitIds("1793876, 1793877");

    expect(post).toHaveBeenCalledWith(MAKE_CLOSED_ENDPOINT, { praja_ids: ["1793876", "1793877"] });
    expect(MAKE_CLOSED_ENDPOINT).toBe("/crm-records/leads/make-closed/");
    expect(post.mock.calls.some(([url]) => String(url).includes("make-fresh"))).toBe(false);
  });

  it("asks for at least one id when nothing was added", () => {
    render(<MakeClosedComponent />);

    fireEvent.click(closeButton());

    expect(screen.getByText("Add at least one praja id.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends file ids and typed ids together without duplicates", async () => {
    render(<MakeClosedComponent />);

    dropFile("1\n2\n");
    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    typeIds("2, 3");
    fireEvent.click(closeButton());

    await waitFor(() => expect(sentIds()).toEqual(["1", "2", "3"]));
  });

  it("empties the text box after sending", async () => {
    render(<MakeClosedComponent />);

    typeIds("1793876");
    fireEvent.click(closeButton());

    await waitFor(() => expect((screen.getByLabelText("Praja ids") as HTMLTextAreaElement).value).toBe(""));
  });

  it("sends exactly one request for a full chunk", async () => {
    await submitIds(idRange(CLOSE_REQUEST_CHUNK_SIZE).join("\n"));

    await screen.findByText(`${CLOSE_REQUEST_CHUNK_SIZE} updated.`);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("splits a long list into chunks and adds up the results", async () => {
    const ids = idRange(CLOSE_REQUEST_CHUNK_SIZE * 2 + 50);
    await submitIds(ids.join("\n"));

    expect(await screen.findByText(`${ids.length} updated.`)).toBeTruthy();
    expect(post.mock.calls.map(([, body]) => body.praja_ids.length)).toEqual([
      CLOSE_REQUEST_CHUNK_SIZE,
      CLOSE_REQUEST_CHUNK_SIZE,
      50,
    ]);
  });

  it("sends a single leftover id in its own chunk", async () => {
    await submitIds(idRange(CLOSE_REQUEST_CHUNK_SIZE + 1).join("\n"));

    await screen.findByText(`${CLOSE_REQUEST_CHUNK_SIZE + 1} updated.`);
    expect(post.mock.calls.map(([, body]) => body.praja_ids.length)).toEqual([CLOSE_REQUEST_CHUNK_SIZE, 1]);
  });

  it("shows Closing and disables the button while a request is running", async () => {
    let resolve: (value: unknown) => void = () => {};
    post.mockImplementation(() => new Promise((r) => (resolve = r)));
    render(<MakeClosedComponent />);

    typeIds("1793876");
    fireEvent.click(closeButton());

    const busy = await screen.findByRole("button", { name: "Closing…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    resolve(okResponse(["1793876"]));
    expect(await screen.findByRole("button", { name: "Close leads" })).toBeTruthy();
  });

  it("shows chunk progress for long lists", async () => {
    const pending: Array<() => void> = [];
    post.mockImplementation((_url: string, body: { praja_ids: string[] }) =>
      new Promise((r) => pending.push(() => r(okResponse(body.praja_ids))))
    );
    const total = CLOSE_REQUEST_CHUNK_SIZE + 50;
    render(<MakeClosedComponent />);

    typeIds(idRange(total).join("\n"));
    fireEvent.click(closeButton());

    expect(await screen.findByText(`Closing 0 of ${total.toLocaleString()}…`)).toBeTruthy();
    pending[0]();
    expect(
      await screen.findByText(`Closing ${CLOSE_REQUEST_CHUNK_SIZE.toLocaleString()} of ${total.toLocaleString()}…`)
    ).toBeTruthy();
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1]();
    expect(await screen.findByText(`${total} updated.`)).toBeTruthy();
  });

  it("does not send twice when the button is clicked again while closing", async () => {
    let resolve: (value: unknown) => void = () => {};
    post.mockImplementation(() => new Promise((r) => (resolve = r)));
    render(<MakeClosedComponent />);

    typeIds("1793876");
    fireEvent.click(closeButton());
    await screen.findByRole("button", { name: "Closing…" });
    fireEvent.click(closeButton());
    fireEvent.click(closeButton());

    expect(post).toHaveBeenCalledTimes(1);
    resolve(okResponse(["1793876"]));
  });

  it("clears the ready list after a successful run", async () => {
    render(<MakeClosedComponent />);

    dropFile("1\n2\n");
    expect(await screen.findByText("2 leads ready")).toBeTruthy();
    fireEvent.click(closeButton());

    await screen.findByText("2 updated.");
    expect(screen.queryByText(/ready/)).toBeNull();
  });
});

describe("results", () => {
  it("says how many leads were closed (plural)", async () => {
    await submitIds("1, 2");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("2 leads are closed."));
  });

  it("says one lead was closed (singular)", async () => {
    await submitIds("1793876");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 lead is closed."));
  });

  it("says zero leads were closed when everything was skipped", async () => {
    post.mockResolvedValue(okResponse([], [{ praja_id: "1", reason: "already_closed" }]));
    await submitIds("1");

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("0 leads are closed."));
    expect(screen.getByText("0 updated.")).toBeTruthy();
  });

  it("shows updated, not found and already-closed counts", async () => {
    post.mockResolvedValue(
      okResponse(
        ["1"],
        [
          { praja_id: "2", reason: "already_closed" },
          { praja_id: "3", reason: "already_closed" },
        ],
        ["4"]
      )
    );
    await submitIds("1,2,3,4");

    expect(await screen.findByText("1 updated.")).toBeTruthy();
    expect(screen.getByText("1 not found.")).toBeTruthy();
    expect(screen.getByText("2 skipped (Already closed).")).toBeTruthy();
  });

  it("hides the not-found line when every id was found", async () => {
    await submitIds("1, 2");

    await screen.findByText("2 updated.");
    expect(screen.queryByText(/not found/)).toBeNull();
  });

  it("shows an unknown skip reason as it is", async () => {
    post.mockResolvedValue(okResponse([], [{ praja_id: "1", reason: "locked_by_partner" }]));
    await submitIds("1");

    expect(await screen.findByText("1 skipped (locked_by_partner).")).toBeTruthy();
  });

  it("handles a response with missing lists", async () => {
    post.mockResolvedValue({ data: {} });
    await submitIds("1");

    expect(await screen.findByText("0 updated.")).toBeTruthy();
  });

  it("hides the old result when new ids are added", async () => {
    render(<MakeClosedComponent />);

    typeIds("1");
    fireEvent.click(closeButton());
    await screen.findByText("1 updated.");
    dropFile("2\n");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    expect(screen.queryByText("1 updated.")).toBeNull();
  });
});

describe("errors and retry", () => {
  it("shows the backend error message", async () => {
    post.mockRejectedValue({ response: { data: { error: "praja_ids[0] is not a valid praja id." } } });
    await submitIds("1793876");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("praja_ids[0] is not a valid praja id."));
  });

  it("shows a network error message", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    await submitIds("1793876");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Network Error"));
  });

  it("shows the request error when the endpoint is missing (404)", async () => {
    post.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 404"), {
        response: { status: 404, data: "<html>Not Found</html>" },
      })
    );
    await submitIds("1793876");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Request failed with status code 404"));
  });

  it("falls back to a generic message for an unknown failure", async () => {
    post.mockRejectedValue({});
    await submitIds("1793876");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not close those leads."));
  });

  it("keeps the ids and shows no result when nothing was sent", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    await submitIds("1793876");

    expect(await screen.findByText("1 lead ready")).toBeTruthy();
    expect(screen.queryByText(/updated\./)).toBeNull();
  });

  it("enables the button again after a failure", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    await submitIds("1793876");

    const button = await screen.findByRole("button", { name: "Close leads" });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps only the unsent ids when a later chunk fails", async () => {
    post.mockImplementationOnce(echoUpdated).mockRejectedValueOnce(new Error("Network Error"));
    await submitIds(idRange(CLOSE_REQUEST_CHUNK_SIZE + 10).join(","));

    expect(await screen.findByText("10 leads ready")).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith(
      `Network Error ${CLOSE_REQUEST_CHUNK_SIZE} ids were processed. Press Close leads to retry the rest.`
    );
  });

  it("shows the result of the chunks that did succeed", async () => {
    post.mockImplementationOnce(echoUpdated).mockRejectedValueOnce(new Error("Network Error"));
    await submitIds(idRange(CLOSE_REQUEST_CHUNK_SIZE + 10).join(","));

    expect(await screen.findByText(`${CLOSE_REQUEST_CHUNK_SIZE} updated.`)).toBeTruthy();
  });

  it("retry sends only the ids that were not sent", async () => {
    post.mockImplementationOnce(echoUpdated).mockRejectedValueOnce(new Error("Network Error"));
    const ids = idRange(CLOSE_REQUEST_CHUNK_SIZE + 10);
    await submitIds(ids.join(","));
    await screen.findByText("10 leads ready");

    fireEvent.click(closeButton());

    await waitFor(() => expect(post).toHaveBeenCalledTimes(3));
    expect(sentIds(2)).toEqual(ids.slice(CLOSE_REQUEST_CHUNK_SIZE));
    expect(await screen.findByText("10 updated.")).toBeTruthy();
  });
});

describe("settings panel", () => {
  it("shows Close leads as the title placeholder", () => {
    render(<MakeClosedConfig localConfig={{}} handleInputChange={vi.fn()} />);

    expect(screen.getByLabelText("Title").getAttribute("placeholder")).toBe("Close leads");
  });

  it("shows the saved title and description", () => {
    render(<MakeClosedConfig localConfig={{ title: "Close dead leads", description: "Ops only" }} handleInputChange={vi.fn()} />);

    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Close dead leads");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Ops only");
  });

  it("reports title and description edits", () => {
    const handleInputChange = vi.fn();
    render(<MakeClosedConfig localConfig={{}} handleInputChange={handleInputChange} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Close dead leads" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Ops only" } });

    expect(handleInputChange).toHaveBeenCalledWith("title", "Close dead leads");
    expect(handleInputChange).toHaveBeenCalledWith("description", "Ops only");
  });

  it("has no action setting, so it can never switch to make-fresh", () => {
    render(<MakeClosedConfig localConfig={{}} handleInputChange={vi.fn()} />);

    expect(screen.queryByLabelText("Action")).toBeNull();
  });
});
