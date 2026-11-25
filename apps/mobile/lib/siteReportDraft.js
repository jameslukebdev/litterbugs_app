import { saveLocalReportDraft, loadLocalReportDraft, clearLocalReportDraft } from './savedReportDraft';
// Reuse durable, container-relative photo copies without consuming ordinary drafts
// or sending a recurrence draft through the ordinary cloud-draft record.
const namespace = (sourceId, userId) => `${userId}/sites/${sourceId}`;
export const saveSiteReportDraft = (sourceId, userId, draft) => saveLocalReportDraft(namespace(sourceId, userId), draft);
export const loadSiteReportDraft = (sourceId, userId) => loadLocalReportDraft(namespace(sourceId, userId));
export const clearSiteReportDraft = (sourceId, userId) => clearLocalReportDraft(namespace(sourceId, userId));
