"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Eye, FileText, Loader2, Lock, Share2, Trash2, Upload, X } from "lucide-react";
import clsx from "clsx";
import { deleteDocument, documentLink, recordDocument, savePapers, setDocsConsent, type PapersInput } from "@/app/admin/actions";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/admin/Dialog";
import { formatDate } from "@/lib/format";
import { resizePhoto } from "@/lib/photo-resize";
import { createClient } from "@/lib/supabase/client";
import { watermarkImage } from "@/lib/watermark";
import { DOCUMENT_KINDS, type CarDocument, type DocumentKind } from "@/lib/types";

const KIND_LABEL: Record<DocumentKind, string> = {
  rc: "RC",
  insurance: "Insurance",
  puc: "PUC",
  noc: "Bank NOC",
  service: "Service record",
  other: "Other",
};

type Props = {
  carId: number;
  businessName: string;
  papers: PapersInput;
  consent: boolean;
  documents: CarDocument[];
};

/** The ticks buyers see, and private copies of the papers that only admins can open. */
export function PapersPanel({ carId, businessName, papers: saved, consent, documents }: Props) {
  const router = useRouter();
  const [papers, setPapers] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const set = <K extends keyof PapersInput>(key: K, value: PapersInput[K]) => {
    setDirty(true);
    setMessage(null);
    setPapers((p) => ({ ...p, [key]: value }));
  };

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setMessage({ tone: "error", text: result.error ?? "Something went wrong" });
      else {
        if (success) setMessage({ tone: "ok", text: success });
        router.refresh();
      }
    });
  }

  const checks: { key: keyof PapersInput; label: string; hint: string }[] = [
    { key: "papers_rc_seen", label: "RC original seen", hint: "Matches the car's chassis and engine numbers" },
    { key: "papers_insurance", label: "Insurance valid", hint: "Policy in force" },
    { key: "papers_puc", label: "PUC valid", hint: "Pollution certificate in date" },
    { key: "papers_service_records", label: "Service records", hint: "Service book or bills available" },
  ];

  return (
    <section id="papers" className="scroll-mt-28 space-y-4">
      <h2 className="text-xl font-bold">Papers</h2>
      {message && (
        <p className={clsx("rounded-lg p-3 text-sm", message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>{message.text}</p>
      )}

      {/* What buyers see */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="font-semibold">Checked by you</p>
        <p className="mt-0.5 text-sm text-muted">Buyers see these as ticks on the car page. The documents themselves are never shown.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {checks.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:bg-background">
              <input
                type="checkbox"
                checked={Boolean(papers[c.key])}
                onChange={(e) => set(c.key, e.target.checked as never)}
                className="mt-0.5 size-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="text-xs text-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 max-w-sm">
          <span className="text-sm font-medium">Loan on the car</span>
          <div className="mt-1">
            <Select
              label="Loan on the car"
              value={papers.papers_loan ?? ""}
              onChange={(v) => set("papers_loan", (v || null) as PapersInput["papers_loan"])}
              placeholder="Not checked"
              options={[
                { value: "none", label: "No loan" },
                { value: "closing", label: "Loan being closed — bank NOC to come" },
              ]}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => {
            setDirty(false);
            run(() => savePapers(carId, papers), "Papers list saved. Buyers see the ticks now.");
          }}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Save papers list
        </button>
      </div>

      {/* Private copies */}
      <div className="rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="size-4" aria-hidden /> Document copies — private
          </p>
          <p className="mt-0.5 text-sm text-muted">
            Only admins can open these, through links that expire after 5 minutes. They are deleted 30 days after the car is sold.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              disabled={pending}
              onChange={(e) => run(() => setDocsConsent(carId, e.target.checked))}
              className="mt-0.5 size-4 accent-[var(--accent)]"
            />
            <span>The owner agreed we can keep copies of the papers to verify this sale.</span>
          </label>
        </div>

        {consent ? (
          <UploadRow carId={carId} onDone={(text, ok) => (setMessage({ tone: ok ? "ok" : "error", text }), ok && router.refresh())} />
        ) : (
          <p className="px-5 py-4 text-sm text-muted">Tick the owner&apos;s agreement above to add copies.</p>
        )}

        {documents.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {documents.map((d) => (
              <DocumentRow key={d.id} doc={d} businessName={businessName} pending={pending} run={run} onError={(text) => setMessage({ tone: "error", text })} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function UploadRow({ carId, onDone }: { carId: number; onDone: (text: string, ok: boolean) => void }) {
  const [kind, setKind] = useState<DocumentKind>("rc");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const isPdf = file.type === "application/pdf";
      // Photos are re-encoded (which also drops their location data); PDFs go up as they are.
      const body = isPdf ? file : (await resizePhoto(file)).full;
      const path = `cars/${carId}/${crypto.randomUUID()}.${isPdf ? "pdf" : "jpg"}`;
      const mime = isPdf ? "application/pdf" : "image/jpeg";
      const { error } = await createClient().storage.from("car-documents").upload(path, body, { contentType: mime });
      if (error) throw error;
      const result = await recordDocument(carId, { kind, path, file_name: file.name, mime, size_bytes: body.size });
      if (!result.ok) throw new Error(result.error);
      onDone(`${KIND_LABEL[kind]} copy saved privately.`, true);
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Upload failed", false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 px-5 py-4">
      <div className="w-44">
        <span className="text-sm font-medium">Document</span>
        <div className="mt-1">
          <Select label="Document" value={kind} onChange={(v) => setKind(v as DocumentKind)} options={DOCUMENT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" aria-hidden />} Add photo or PDF
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}

function DocumentRow({
  doc,
  businessName,
  pending,
  run,
  onError,
}: {
  doc: CarDocument;
  businessName: string;
  pending: boolean;
  run: (action: () => Promise<{ ok: boolean; error?: string }>, success?: string) => void;
  onError: (text: string) => void;
}) {
  const confirm = useConfirm();
  const [sharing, setSharing] = useState(false);
  const isImage = doc.mime.startsWith("image/");

  const [preview, setPreview] = useState<string | null>(null);

  async function view() {
    // Shown inside the admin rather than a new tab, so pop-up blockers don't get in the way.
    const result = await documentLink(doc.id);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setPreview(result.url);
  }

  async function shareCopy() {
    setSharing(true);
    try {
      const result = await documentLink(doc.id);
      if (!result.ok) throw new Error(result.error);
      const stamp = `${businessName} — for sale verification only — ${formatDate(new Date().toISOString())}`;
      const blob = await watermarkImage(result.url, stamp);
      const file = new File([blob], `${KIND_LABEL[doc.kind]}-copy.jpg`, { type: "image/jpeg" });
      // Phones: hand it straight to WhatsApp and friends. Computers: download it.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${KIND_LABEL[doc.kind]} copy` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) onError(e instanceof Error ? e.message : "Couldn't make the copy");
    } finally {
      setSharing(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <FileText className="size-5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {KIND_LABEL[doc.kind]} <span className="font-normal text-muted">· {doc.file_name}</span>
        </p>
        <p className="text-xs text-muted">
          Added {formatDate(doc.created_at)} · {Math.max(1, Math.round(doc.size_bytes / 1024))} KB
          {doc.delete_after && <span className="text-amber-800"> · deleted on {formatDate(doc.delete_after)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={view} className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-semibold hover:bg-background">
          <Eye className="size-3.5" aria-hidden /> View
        </button>
        {isImage && (
          <button
            type="button"
            onClick={shareCopy}
            disabled={sharing}
            title="A copy stamped 'for sale verification only', to send to a buyer"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-xs font-semibold hover:bg-background disabled:opacity-60"
          >
            {sharing ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" aria-hidden />} Share copy
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          aria-label={`Delete ${KIND_LABEL[doc.kind]} copy`}
          onClick={async () =>
            (await confirm({ title: `Delete this ${KIND_LABEL[doc.kind]} copy?`, body: "The file is removed for good.", confirmLabel: "Delete copy", danger: true })) &&
            run(() => deleteDocument(doc.id), "Copy deleted.")
          }
          className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {preview && (
        <div role="dialog" aria-modal="true" aria-label={`${KIND_LABEL[doc.kind]} copy`} className="fade-in fixed inset-0 z-50 flex flex-col bg-black/90 p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 text-white">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <Lock className="size-4 shrink-0" aria-hidden /> {KIND_LABEL[doc.kind]} · private, link lasts 5 min
            </p>
            <div className="flex items-center gap-2">
              <a href={preview} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
                New tab
              </a>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
          </div>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`${KIND_LABEL[doc.kind]} copy`} className="mx-auto min-h-0 max-w-full flex-1 rounded-lg object-contain" />
          ) : (
            <iframe src={preview} title={`${KIND_LABEL[doc.kind]} copy`} className="min-h-0 w-full flex-1 rounded-lg bg-white" />
          )}
        </div>
      )}
    </li>
  );
}
