#!/usr/bin/env node
/**
 * Empty app storage buckets via the Storage API (Supabase blocks direct SQL on storage.objects).
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 *
 * Run: node --env-file=.env.local scripts/clear-storage-buckets.mjs
 * Or: npm run storage:clear
 */
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["job-photos", "quote-documents"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local or --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/** @param {string} bucket */
/** @param {string} prefix */
async function listAllObjectPaths(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  const paths = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    // Files include size in metadata; prefix "folders" do not
    const isFile =
      item.metadata != null &&
      typeof item.metadata === "object" &&
      item.metadata.size != null;
    if (isFile) {
      paths.push(path);
    } else {
      const nested = await listAllObjectPaths(bucket, path);
      paths.push(...nested);
    }
  }
  return paths;
}

/** @param {string} bucket */
async function emptyBucket(bucket) {
  const paths = await listAllObjectPaths(bucket);
  if (paths.length === 0) {
    console.log(`[${bucket}] already empty`);
    return;
  }
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
  console.log(`[${bucket}] removed ${paths.length} object(s)`);
}

async function main() {
  for (const bucket of BUCKETS) {
    await emptyBucket(bucket);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
