-- V19: add optional Arabic middle name to employees
ALTER TABLE employees
    ADD COLUMN middle_name_ar VARCHAR(100) NULL;
