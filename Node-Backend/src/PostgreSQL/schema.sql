-- PostgreSQL Schema: Financial Ledger & Invariant Integrity
-- Enforces:
-- 1. Integer paise storage (BIGINT)
-- 2. Non-negative amounts
-- 3. Strict transactional double-entry balance: SUM(DEBIT) === SUM(CREDIT)
-- 4. Row-Level Security (RLS) for tenant isolation

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ledger Accounts Table
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    account_code VARCHAR(32) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(64) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    parent_group VARCHAR(128) NOT NULL, -- Sundry Creditors, Duties & Taxes, Direct Expenses, etc.
    is_msme_vendor BOOLEAN DEFAULT false,
    msme_category VARCHAR(16), -- Micro, Small, Medium
    udyam_registration_number VARCHAR(32),
    gstin VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_client_account_code UNIQUE (client_id, account_code)
);

-- 2. Vouchers Header Table
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    voucher_number VARCHAR(64) NOT NULL,
    voucher_type VARCHAR(32) NOT NULL CHECK (voucher_type IN ('Purchase', 'Sales', 'Payment', 'Receipt', 'Journal', 'Contra')),
    voucher_date DATE NOT NULL,
    source_document_id VARCHAR(64),
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise >= 0),
    narration TEXT,
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    posted_by VARCHAR(64),
    rules_applied JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_client_voucher_number UNIQUE (client_id, voucher_number)
);

-- 3. Voucher Entries / Ledger Lines
CREATE TABLE IF NOT EXISTS voucher_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    entry_type VARCHAR(8) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    hsn_sac VARCHAR(16),
    gst_rate_basis_points INT DEFAULT 0,
    source_page_number INT DEFAULT 1,
    source_bounding_box JSONB, -- [x0, y0, x1, y1]
    is_located_in_source BOOLEAN DEFAULT true,
    line_order INT NOT NULL
);

-- 4. Deferred Transaction Trigger: Guaranteed Double-Entry Balance
CREATE OR REPLACE FUNCTION verify_voucher_balanced()
RETURNS TRIGGER AS $$
DECLARE
    v_debits BIGINT;
    v_credits BIGINT;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_paise ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_paise ELSE 0 END), 0)
    INTO v_debits, v_credits
    FROM voucher_lines
    WHERE voucher_id = NEW.voucher_id;

    IF v_debits <> v_credits THEN
        RAISE EXCEPTION 'Double-entry balance violation: Total Debits (% paise) != Total Credits (% paise)', v_debits, v_credits;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_voucher_balanced ON voucher_lines;
CREATE CONSTRAINT TRIGGER trg_ensure_voucher_balanced
AFTER INSERT OR UPDATE ON voucher_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verify_voucher_balanced();

-- 5. Row-Level Security Setup (Defense-in-Depth)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant Policy: Session variables 'app.current_firm_id' and 'app.current_client_id'
DROP POLICY IF EXISTS tenant_voucher_isolation ON vouchers;
CREATE POLICY tenant_voucher_isolation ON vouchers
    USING (firm_id = CURRENT_SETTING('app.current_firm_id', true) AND client_id = CURRENT_SETTING('app.current_client_id', true));

DROP POLICY IF EXISTS tenant_accounts_isolation ON ledger_accounts;
CREATE POLICY tenant_accounts_isolation ON ledger_accounts
    USING (firm_id = CURRENT_SETTING('app.current_firm_id', true) AND client_id = CURRENT_SETTING('app.current_client_id', true));

