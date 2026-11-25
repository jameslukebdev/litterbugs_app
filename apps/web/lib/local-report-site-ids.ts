/** Reserved exclusively for the development-only, on-disk review dataset. */
export const isLocalSiteReport = (id: string) => process.env.NODE_ENV === 'development' && !process.env.VERCEL && /^f0000000-0000-4000-8000-[0-9a-f]{12}$/.test(id);
