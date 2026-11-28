import { createClient, type User } from "npm:@supabase/supabase-js@2.87.1";
import Stripe from "npm:stripe@22.5.0";

export const MIN_CLEANUP_CONTRIBUTION_CENTS = 100;
export const MAX_CLEANUP_CONTRIBUTION_CENTS = 100_000;

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, stripe-signature, x-financial-maintenance-secret, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

export const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

export const serviceClient = () => createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const authenticatedUser = async (
  request: Request,
  admin = serviceClient(),
): Promise<User | null> => {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
};

export const userClient = (request: Request) => createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_ANON_KEY"),
  {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

export const stripeClient = () => new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-07-29.dahlia",
  appInfo: { name: "Litterbugs funded cleanups", version: "1.0.0" },
});

export const stripeV2 = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`https://api.stripe.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requiredEnv("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/json",
      "Stripe-Version": requiredEnv("STRIPE_V2_API_VERSION"),
      ...init.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : `Stripe v2 returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
};

export type StripeRecipientAccount = {
  id: string;
  defaults?: {
    profile?: {
      business_url?: string | null;
      product_description?: string | null;
    } | null;
  } | null;
  identity?: {
    country?: string | null;
    entity_type?: "company" | "government_entity" | "individual" | "non_profit" | null;
  } | null;
  requirements?: {
    entries?: Array<{
      awaiting_action_from?: "user" | "stripe" | null;
      description?: string | null;
      minimum_deadline?: {
        status?: "currently_due" | "eventually_due" | "past_due" | null;
      } | null;
    }> | null;
  } | null;
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string | null } | null;
          payouts?: { status?: string | null } | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export const stripeRecipientState = (account: StripeRecipientAccount) => {
  const requirementsDue = (account.requirements?.entries ?? [])
    .filter((entry) => entry.awaiting_action_from === "user"
      && entry.minimum_deadline?.status !== "eventually_due")
    .map((entry) => entry.description ?? "Additional Stripe information is required");
  const transferStatus = account.configuration?.recipient?.capabilities
    ?.stripe_balance?.stripe_transfers?.status;
  const payoutStatus = account.configuration?.recipient?.capabilities
    ?.stripe_balance?.payouts?.status;
  // Capabilities are Stripe's authority on what the account can do now.
  // Future volume thresholds must not lock members out of enabled payouts.
  const payoutsEnabled = transferStatus === "active" && payoutStatus === "active";
  return {
    payoutsEnabled,
    onboardingStatus: payoutsEnabled
      ? "enabled"
      : requirementsDue.length > 0 || transferStatus === "pending" || payoutStatus === "pending"
        ? "pending"
        : "restricted",
    requirementsDue: [...new Set(requirementsDue)],
  };
};

export const retrieveStripeRecipientAccount = (accountId: string) => {
  const includes = new URLSearchParams({
    "include[0]": "configuration.recipient",
    "include[1]": "identity",
    "include[2]": "requirements",
    "include[3]": "defaults",
  });
  return stripeV2<StripeRecipientAccount>(
    `/core/accounts/${encodeURIComponent(accountId)}?${includes.toString()}`,
    { method: "GET" },
  );
};

export const legacyRecipientProfileReset = (account: StripeRecipientAccount) => {
  const profile = account.defaults?.profile;
  const reset: { url?: ""; product_description?: "" } = {};
  // Remove only exact values previously injected by Litterbugs. Preserve
  // any website or service description the member has supplied themselves.
  if (profile?.business_url === "https://litterbugs.app/cleanup-policy") reset.url = "";
  if ([
    "Individual litter cleanup services coordinated and rewarded through the Litterbugs community cleanup platform.",
    "Individual litter reporting and cleanup services rewarded after verified cleanups through the Litterbugs community cleanup platform.",
  ].includes(profile?.product_description ?? "")) reset.product_description = "";
  return reset;
};

export const LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION =
  "Individual participation in litter reporting and community cleanups coordinated through Litterbugs. Litterbugs pays rewards for eligible, verified activity.";

export const recipientProfileUpdate = (account: StripeRecipientAccount) => {
  const reset = legacyRecipientProfileReset(account);
  const profile = account.defaults?.profile;
  const individual = !account.identity?.entity_type || account.identity.entity_type === "individual";
  const hasMemberWebsite = Boolean(profile?.business_url?.trim()) && reset.url !== "";
  const hasMemberDescription = Boolean(profile?.product_description?.trim())
    && reset.product_description !== "";
  const needsActivityDescription = (account.requirements?.entries ?? []).some((entry) =>
    entry.awaiting_action_from === "user"
    && /^(defaults\.profile\.(business_url|product_description)|business_profile\.(url|product_description))$/.test(entry.description ?? "")
  );
  const replacingLegacyProfile = Object.keys(reset).length > 0;
  return {
    ...reset,
    // Describe the member's reward activity rather than inventing a website or
    // asking them to write a business pitch. Stripe shows this for review.
    // Stripe can redact profile values after onboarding begins. A missing
    // value alone is not permission to overwrite a member's existing details.
    ...(individual && !hasMemberWebsite && !hasMemberDescription
        && (needsActivityDescription || replacingLegacyProfile)
      ? { product_description: LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION }
      : {}),
  };
};

export const configureStripeRecipientAsIndividual = async (
  account: StripeRecipientAccount,
) => {
  const profileUpdate = recipientProfileUpdate(account);
  const updateProfile = Object.keys(profileUpdate).length > 0;
  if (updateProfile) {
    // Accounts v1 supports empty-string field removal; Stripe documents that
    // v1 updates to a v2 account update its corresponding v2 properties.
    await stripeClient().accounts.update(account.id, { business_profile: profileUpdate });
  }
  if (account.identity?.entity_type) {
    // Never overwrite an entity type the member has already supplied.
    return updateProfile ? retrieveStripeRecipientAccount(account.id) : account;
  }
  return stripeV2<StripeRecipientAccount>(`/core/accounts/${encodeURIComponent(account.id)}`, {
    method: "POST",
    body: JSON.stringify({
      identity: { country: account.identity?.country ?? "us", entity_type: "individual" },
      include: ["configuration.recipient", "identity", "requirements", "defaults"],
    }),
  });
};

export type StripeAccountLink = { url: string; expires_at: string };

const textEncoder = new TextEncoder();

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const base64UrlToBytes = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid base64url value");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64Url(bytes) !== value) {
    throw new Error("Non-canonical base64url value");
  }
  return bytes;
};

const onboardingSigningKey = () => crypto.subtle.importKey(
  "raw",
  textEncoder.encode(requiredEnv("STRIPE_ONBOARDING_STATE_SECRET")),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

export type StripeOnboardingReturnTarget = "mobile" | "web";

export const createStripeOnboardingState = async (
  accountId: string,
  returnTarget: StripeOnboardingReturnTarget = "mobile",
) => {
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) throw new Error("Invalid Stripe account ID");
  const payload = bytesToBase64Url(textEncoder.encode(JSON.stringify({
    accountId,
    returnTarget,
    expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  })));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await onboardingSigningKey(),
    textEncoder.encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
};

export const verifyStripeOnboardingState = async (state: string) => {
  const [payload, signature, extra] = state.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await onboardingSigningKey(),
      base64UrlToBytes(signature),
      textEncoder.encode(payload),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    const returnTarget = parsed?.returnTarget ?? "mobile";
    if (
      !/^acct_[A-Za-z0-9]+$/.test(parsed?.accountId)
      || (returnTarget !== "mobile" && returnTarget !== "web")
      || !Number.isInteger(parsed?.expiresAt)
      || parsed.expiresAt < Math.floor(Date.now() / 1000)
    ) return null;
    return {
      accountId: parsed.accountId as string,
      returnTarget: returnTarget as StripeOnboardingReturnTarget,
    };
  } catch {
    return null;
  }
};

const stripeOnboardingUrls = async (
  accountId: string,
  returnTarget: StripeOnboardingReturnTarget,
) => {
  const baseUrl = new URL(requiredEnv("STRIPE_ONBOARDING_REDIRECT_BASE_URL"));
  if (baseUrl.protocol !== "https:") throw new Error("Stripe onboarding redirect must use HTTPS");
  const state = await createStripeOnboardingState(accountId, returnTarget);
  const createUrl = (mode: "return" | "refresh") => {
    const url = new URL(baseUrl);
    url.searchParams.set("mode", mode);
    url.searchParams.set("state", state);
    return url.toString();
  };
  return { returnUrl: createUrl("return"), refreshUrl: createUrl("refresh") };
};

export const createStripeRecipientOnboardingLink = async (
  accountId: string,
  returnTarget: StripeOnboardingReturnTarget = "mobile",
) => {
  const { returnUrl, refreshUrl } = await stripeOnboardingUrls(accountId, returnTarget);
  return stripeV2<StripeAccountLink>("/core/account_links", {
    method: "POST",
    body: JSON.stringify({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          collection_options: { fields: "currently_due", future_requirements: "omit" },
          return_url: returnUrl,
          refresh_url: refreshUrl,
        },
      },
    }),
  });
};

export const isUuid = (value: unknown): value is string =>
  typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    error
    && typeof error === "object"
    && "message" in error
    && typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Unexpected error";
};

export const hasExactOriginalPhotoReuse = (
  reportHashes: readonly string[],
  cleanupHashes: readonly string[],
) => cleanupHashes.some((hash) => reportHashes.includes(hash));

export const secureSecretEqual = async (
  candidate: string | null,
  expected: string | undefined,
) => {
  if (!candidate || !expected) return false;
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", textEncoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};
