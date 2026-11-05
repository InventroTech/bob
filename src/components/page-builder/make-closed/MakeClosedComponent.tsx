import { useRef, useState } from "react";
import { Ban, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { chunkIds, mergePrajaIds, parsePrajaIds } from "../make-fresh/parsePrajaIds";

export const MAKE_CLOSED_ENDPOINT = "/crm-records/leads/make-closed/";
// Each request must finish inside the backend's 30s worker timeout.
export const CLOSE_REQUEST_CHUNK_SIZE = 2000;

export const DEFAULT_CLOSE_TITLE = "Close leads";
const DEFAULT_DESCRIPTION =
  "Paste praja ids, or drop a CSV with a praja_id or user_id column. Those leads are closed and their assignee and scheduled callbacks are cleared, so no RM gets them again. Call history is kept.";

const REASON_LABELS: Record<string, string> = {
  already_closed: "Already closed",
};

type MakeClosedResponse = {
  updated: string[];
  skipped: Array<{ praja_id: string; reason: string }>;
  not_found: string[];
};

export interface MakeClosedComponentConfig {
  title?: string;
  description?: string;
}

interface MakeClosedComponentProps {
  config?: MakeClosedComponentConfig;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsText(file);
  });
}

function countByReason(skipped: MakeClosedResponse["skipped"]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of skipped) {
    counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  }
  return [...counts.entries()];
}

export function MakeClosedComponent({ config }: MakeClosedComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<MakeClosedResponse | null>(null);

  const title = config?.title?.trim() || DEFAULT_CLOSE_TITLE;
  const description = config?.description?.trim() || DEFAULT_DESCRIPTION;

  const addParsed = (text: string) => {
    const parsed = parsePrajaIds(text);
    if (parsed.error) {
      setParseError(parsed.error);
      return;
    }
    if (parsed.ids.length === 0) {
      setParseError("No praja ids found.");
      return;
    }
    setIds(mergePrajaIds(ids, parsed.ids));
    setParseError(null);
    setResult(null);
  };

  const onDropFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      addParsed(await readFileText(file));
      setDraft("");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Could not read that file.");
    }
  };

  const submit = async () => {
    const parsedDraft = parsePrajaIds(draft);
    if (parsedDraft.error) {
      setParseError(parsedDraft.error);
      return;
    }
    const allIds = mergePrajaIds(ids, parsedDraft.ids);
    if (allIds.length === 0) {
      setParseError("Add at least one praja id.");
      return;
    }

    setIds(allIds);
    setDraft("");
    setParseError(null);
    setResult(null);
    setSubmitting(true);
    setProgress({ done: 0, total: allIds.length });

    const totals: MakeClosedResponse = { updated: [], skipped: [], not_found: [] };
    let sent = 0;
    try {
      for (const chunk of chunkIds(allIds, CLOSE_REQUEST_CHUNK_SIZE)) {
        const response = await apiClient.post<MakeClosedResponse>(MAKE_CLOSED_ENDPOINT, {
          praja_ids: chunk,
        });
        totals.updated.push(...(response.data.updated ?? []));
        totals.skipped.push(...(response.data.skipped ?? []));
        totals.not_found.push(...(response.data.not_found ?? []));
        sent += chunk.length;
        setProgress({ done: sent, total: allIds.length });
      }
      setIds([]);
      toast.success(
        totals.updated.length === 1 ? "1 lead is closed." : `${totals.updated.length} leads are closed.`
      );
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (error instanceof Error ? error.message : "Could not close those leads.");
      setIds(allIds.slice(sent));
      toast.error(
        sent > 0 ? `${message} ${sent} ids were processed. Press Close leads to retry the rest.` : message
      );
    } finally {
      setResult(sent > 0 ? totals : null);
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <Card className="w-full border border-[#D5DEE8] bg-white text-[#1A2333] shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold !text-[#0B1F4D]">
          <Ban className="h-5 w-5 text-black" />
          {title}
        </CardTitle>
        <CardDescription className="!text-[#333C4E]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(false);
            void onDropFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 text-center text-sm text-[#333C4E]",
            dragging ? "border-black bg-[#EDEDED]" : "border-black bg-[#F7F7F7]"
          )}
        >
          <Upload className="mb-2 h-6 w-6 text-black" />
          Drop a CSV or text file here, or click to browse
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              void onDropFile(file);
              event.target.value = "";
            }}
          />
        </div>

        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="1793876, 1793877"
          aria-label="Praja ids"
          className="border-[#D5DEE8] bg-white text-[#1A2333] placeholder:text-[#5C6B7A]"
        />

        {parseError ? <p className="text-sm !text-[#C2410C]">{parseError}</p> : null}

        {ids.length > 0 ? (
          <div className="flex items-center justify-between text-sm text-[#1A2333]">
            <span>
              {ids.length.toLocaleString()} lead{ids.length === 1 ? "" : "s"} ready
            </span>
            <Button type="button" variant="ghost" size="sm" className="text-[#1B6FE8]" onClick={() => setIds([])}>
              Clear
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="border-0 bg-black text-white hover:bg-black/85 hover:text-white"
        >
          {submitting
            ? progress && progress.total > CLOSE_REQUEST_CHUNK_SIZE
              ? `Closing ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}…`
              : "Closing…"
            : "Close leads"}
        </Button>

        {result ? (
          <div className="space-y-1 text-sm text-[#333C4E]">
            <p>{result.updated.length} updated.</p>
            {result.not_found.length > 0 ? <p>{result.not_found.length} not found.</p> : null}
            {countByReason(result.skipped).map(([reason, count]) => (
              <p key={reason}>
                {count} skipped ({REASON_LABELS[reason] ?? reason}).
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default MakeClosedComponent;
