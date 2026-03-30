import { createSupabaseServerClient } from "@/lib/supabase/server";

import { insertQuoteRevisionRecord } from "./quote-revision-record";

/**
 * Records a new revision after a successful edit when the live snapshot differs from the latest revision.
 * Fails silently (logs) so normal saves are not blocked.
 */
export async function autoRecordQuoteRevisionIfChanged(quoteId: string, reason: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const label = `Auto — ${reason}`;
    const res = await insertQuoteRevisionRecord(supabase, quoteId, label, user?.id ?? null, {
      skipIfUnchanged: true,
    });
    if (!res.ok) {
      console.warn("[autoRecordQuoteRevisionIfChanged]", quoteId, res.message);
    }
  } catch (e) {
    console.warn("[autoRecordQuoteRevisionIfChanged]", quoteId, e);
  }
}

/**
 * Always inserts a revision (e.g. milestone). Use when the state may match the last snapshot but you still want a labeled revision.
 */
export async function recordQuoteRevisionForced(quoteId: string, label: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const res = await insertQuoteRevisionRecord(supabase, quoteId, label, user?.id ?? null, {
      skipIfUnchanged: false,
    });
    if (!res.ok) {
      console.warn("[recordQuoteRevisionForced]", quoteId, res.message);
    }
  } catch (e) {
    console.warn("[recordQuoteRevisionForced]", quoteId, e);
  }
}
