-- V17: Group chat messages — any active employee can send and receive
CREATE TABLE messages (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id  UUID        NOT NULL REFERENCES employees(id),
    body       TEXT        NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
