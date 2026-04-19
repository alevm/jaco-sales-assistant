export const FEEDBACK_STATUSES = [
  "new",
  "under_review",
  "accepted",
  "declined",
  "done",
  "needs_info",
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
