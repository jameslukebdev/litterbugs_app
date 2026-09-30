import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createContributionResponse } from "../_shared/create-contribution.ts";

Deno.serve((request: Request) => createContributionResponse(request));
