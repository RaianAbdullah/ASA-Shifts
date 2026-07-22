-- V20: file/image attachments on messages
ALTER TABLE messages
    ALTER COLUMN body DROP NOT NULL,
    ADD COLUMN attachment_path VARCHAR(500) NULL,
    ADD COLUMN attachment_type VARCHAR(20)  NULL,   -- 'image' | 'file'
    ADD COLUMN attachment_name VARCHAR(255) NULL;
