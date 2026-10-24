"use client";

import { useTransition } from "react";
import { deleteCar } from "@/app/admin/actions";
import { useConfirm } from "@/components/admin/Dialog";

/** Only shown for removed cars and ones never put on sale; everything else is taken off the site instead. */
export function DeleteCarButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirm({
          title: "Delete this car for good?",
          body: "Its photos, private papers and owner details are erased and can't be brought back. Buyers who asked about it stay in Leads.",
          confirmLabel: "Delete for good",
          danger: true,
        });
        if (ok) startTransition(() => deleteCar(id));
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Delete for good
    </button>
  );
}
