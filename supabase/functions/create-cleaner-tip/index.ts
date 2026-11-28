import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCleanerTipResponse } from "../_shared/cleaner-tip.ts";

Deno.serve((request: Request) => createCleanerTipResponse(request));
