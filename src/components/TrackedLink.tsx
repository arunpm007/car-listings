"use client";

import { createClient } from "@/lib/supabase/client";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  carId?: number;
  channel: "call" | "whatsapp";
};

/** A link that also counts the tap against the car, so the admin sees which cars get interest. */
export function TrackedLink({ carId, channel, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        if (carId) {
          // Fire and forget: the call or chat must open even if this fails.
          // Supabase queries only run once .then() is called, so `void` alone would send nothing.
          createClient()
            .from("contact_clicks")
            .insert({ car_id: carId, channel })
            .then(() => {});
        }
        onClick?.(e);
      }}
    />
  );
}
