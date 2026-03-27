"use client";

import { useMemo } from "react";

export type CustomerWithAddress = {
  id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type Props = {
  customers: CustomerWithAddress[];
  customerSelectId: string;
  targetIds: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    zip: string;
  };
};

/** Fills project/job site address inputs from the selected customer profile address. */
export function CopyAddressFromCustomerButton({ customers, customerSelectId, targetIds }: Props) {
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  return (
    <button
      type="button"
      className="btn-secondary text-sm"
      onClick={() => {
        const sel = document.getElementById(customerSelectId) as HTMLSelectElement | null;
        const cid = sel?.value;
        if (!cid) return;
        const c = byId.get(cid);
        if (!c) return;
        const set = (id: string, v: string) => {
          const el = document.getElementById(id) as HTMLInputElement | null;
          if (el) el.value = v;
        };
        set(targetIds.address_line1, c.address_line1 ?? "");
        set(targetIds.address_line2, c.address_line2 ?? "");
        set(targetIds.city, c.city ?? "");
        set(targetIds.state, c.state ?? "");
        set(targetIds.zip, c.zip ?? "");
      }}
    >
      Use customer address
    </button>
  );
}
