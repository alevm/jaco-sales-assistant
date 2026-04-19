-- Adds PM-response fields to the feedback table so Jacopo can see replies
-- in the /feedback UI. Also migrates any legacy status='open' values to 'new'
-- so they match the new enum (new/under_review/accepted/declined/done/needs_info).
-- Safe to run once; guarded by the _migrations table.

ALTER TABLE feedback ADD COLUMN pm_response TEXT DEFAULT NULL;
ALTER TABLE feedback ADD COLUMN pm_responded_at TEXT DEFAULT NULL;
UPDATE feedback SET status = 'new' WHERE status = 'open';
