"use client";

import { useTransition } from "react";
import { deleteRequest, setRequestStatus } from "@/app/admin/actions";
import { useConfirm } from "@/components/admin/Dialog";
import type { RequestStatus } from "@/lib/types";

export function RequestActions({ id, status }: { id: number; status: RequestStatus }) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const move = (to: RequestStatus) => startTransition(() => setRequestStatus(id, to));
  const button = "h-9 rounded-md px-3 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "new" && (
        <button type="button" disabled={pending} onClick={() => move("contacted")} className={`${button} border border-line bg-surface`}>
          Mark contacted
        </button>
      )}
      {(status === "new" || status === "contacted") && (
        <button type="button" disabled={pending} onClick={() => move("rejected")} className={`${button} border border-line bg-surface`}>
          Not taking it
        </button>
      )}
      {status === "rejected" && (
        <button type="button" disabled={pending} onClick={() => move("contacted")} className={`${button} border border-line bg-surface`}>
          Reopen
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (await confirm({ title: "Delete this request?", body: "The request and its photos are removed for good.", confirmLabel: "Delete", danger: true }))
            startTransition(() => deleteRequest(id));
        }}
        className="ml-auto text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
