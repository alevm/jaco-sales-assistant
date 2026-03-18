-- P0-1: Multi-marketplace listings table
CREATE TABLE IF NOT EXISTS item_listings (
    id          TEXT PRIMARY KEY,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    marketplace TEXT NOT NULL,
    sale_price  REAL,
    sold_price  REAL,
    shipping_cost REAL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'draft',
    listed_at   TEXT,
    sold_at     TEXT,
    description_it TEXT,
    description_en TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(item_id, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_item_listings_item_id ON item_listings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_listings_marketplace ON item_listings(marketplace);
CREATE INDEX IF NOT EXISTS idx_item_listings_status ON item_listings(status);

-- P0-2: Shipping cost on items (for backward compat / simple single-marketplace use)
ALTER TABLE items ADD COLUMN shipping_cost REAL DEFAULT 0;

-- P1-11: Era sub-style field
ALTER TABLE items ADD COLUMN era_style TEXT;
