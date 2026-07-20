-- V12: Two-stage vacation approval (dept manager → main manager)

-- Expand status column to fit new longer values
ALTER TABLE vacation_requests ALTER COLUMN status TYPE VARCHAR(30);

-- Department-manager review columns (first stage)
ALTER TABLE vacation_requests
    ADD COLUMN dept_reviewed_by   UUID         REFERENCES employees(id),
    ADD COLUMN dept_reviewed_at   TIMESTAMPTZ,
    ADD COLUMN dept_review_notes  TEXT;

-- Migrate any existing PENDING rows to the first-stage status
UPDATE vacation_requests SET status = 'PENDING_DEPT_MANAGER' WHERE status = 'PENDING';
