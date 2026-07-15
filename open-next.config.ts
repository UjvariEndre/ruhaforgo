import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: az app végig dinamikus SSR (nincs ISR/statikus cache),
// így nem kell R2 incremental cache. Később bővíthető.
export default defineCloudflareConfig();
