import type { NextConfig } from 'next';
import { HTML_LIMITED_BOT_UA_RE } from 'next/dist/shared/lib/router/utils/html-bots';

// Answer-engine and search crawlers that read the served HTML without running
// JavaScript. Setting `htmlLimitedBots` replaces Next's own list, so extend it:
// these agents then get the title, description, canonical and robots tags in
// <head> instead of streamed into <body>. Googlebot renders pages, but is
// listed so its first pass also reads the canonical from <head>.
const ANSWER_ENGINE_CRAWLERS = [
  'Googlebot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'CCBot', 'Amazonbot', 'meta-externalagent',
  'meta-externalfetcher', 'cohere-ai', 'DuckAssistBot', 'MistralAI-User', 'YouBot', 'Bytespider', 'PetalBot',
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|${ANSWER_ENGINE_CRAWLERS.join('|')}`, 'i'),
  transpilePackages: ['@litterbugs/report-contract'],
  redirects: async () => [
    { source: '/locations', destination: '/communities', permanent: true },
    { source: '/locations/us-nc-boone', destination: '/communities/us/nc/boone', permanent: true },
    { source: '/how-it-works', destination: '/about', permanent: true },
    { source: '/safety', destination: '/cleanup-safety', permanent: true },
    { source: '/account/privacy', destination: '/privacy', permanent: true },
    // Report share images moved under an id when they gained per-report alt text;
    // previews already cached by social and messaging apps still ask for the old address.
    { source: '/reports/:id/opengraph-image', destination: '/reports/:id/opengraph-image/card', permanent: false },
  ],
};

export default nextConfig;
