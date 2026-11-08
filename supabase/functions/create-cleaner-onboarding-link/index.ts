import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { cleanerOnboardingResponse } from "../_shared/cleaner-onboarding.ts";

Deno.serve((request: Request) => cleanerOnboardingResponse(request));
