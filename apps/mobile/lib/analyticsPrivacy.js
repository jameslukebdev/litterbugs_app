// Last line of defence before anything leaves the phone (PostHog `before_send`).
// The app's own events are already built from fixed categories; this removes what the
// SDK adds by itself and scrubs error text, which can quote data from the server.
//
// Native crash reports are built by the native SDK and never pass through here: they
// carry native stack frames and the OS crash reason only.

const REDACTIONS = [
  // Links first, so tokens or IDs inside them go with them.
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)]+/gi, '<url>'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g, '<token>'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>'],
  [/\b(?:sk|pk|rk|pi|seti|acct|cus|ch|tok|whsec|phc|phx)_[A-Za-z0-9_]{6,}/g, '<key>'],
  // Coordinates (four or more decimals) before the digit-run rule.
  [/-?\b\d{1,3}\.\d{4,}\b/g, '<number>'],
  [/\+?\d[\d\s().-]{6,}\d/g, '<number>'],
  // Long opaque strings: secrets, signatures, base64.
  [/\b[A-Za-z0-9_\-+/=]{32,}\b/g, '<redacted>'],
];

export function scrubText(value, maxLength = 300) {
  if (typeof value !== 'string') return value;
  let text = value;
  for (const [pattern, replacement] of REDACTIONS) text = text.replace(pattern, replacement);
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

// Properties the SDK may add that can hold a link (shared report links carry the report
// ID; sign-in callbacks can carry tokens) or person data this app never sends.
const DROPPED_PROPERTIES = ['url', '$current_url', '$referrer', '$referring_domain', '$pathname', '$host', '$ip', '$exception_steps', '$set', '$set_once'];

function scrubException(properties) {
  const list = Array.isArray(properties.$exception_list) ? properties.$exception_list : [];
  properties.$exception_list = list.slice(0, 5).map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const next = { ...entry, value: scrubText(entry.value) };
    if (next.stacktrace && Array.isArray(next.stacktrace.frames)) {
      next.stacktrace = {
        ...next.stacktrace,
        // Frames are code locations; drop any captured variable or source-line context.
        frames: next.stacktrace.frames.slice(-60).map(({ vars, context_line, pre_context, post_context, ...frame }) => frame),
      };
    }
    return next;
  });
  for (const key of ['$exception_message', '$exception_type']) {
    if (typeof properties[key] === 'string') properties[key] = scrubText(properties[key]);
  }
  if (Array.isArray(properties.$exception_values)) properties.$exception_values = properties.$exception_values.map(value => scrubText(value));
}

export function scrubAnalyticsEvent(event) {
  try {
    if (!event || typeof event !== 'object') return event;
    const properties = { ...(event.properties || {}) };
    for (const key of DROPPED_PROPERTIES) delete properties[key];
    if (event.event === '$exception') scrubException(properties);
    // Anonymous analytics only (personProfiles: 'never'): never set person properties.
    const { $set, $set_once, ...rest } = event;
    return { ...rest, properties };
  } catch {
    // If scrubbing itself fails, send nothing rather than something unscrubbed.
    return null;
  }
}
