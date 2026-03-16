CREATE TABLE IF NOT EXISTS lots (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    total_cogs  REAL NOT NULL,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
    id              TEXT PRIMARY KEY,
    lot_id          TEXT REFERENCES lots(id) ON DELETE SET NULL,

    -- Recognition data (REL-01)
    item_type       TEXT,
    brand           TEXT,
    era             TEXT,
    material        TEXT,
    color           TEXT,
    size            TEXT,
    condition       TEXT,

    -- Pricing (SRC-03 + SEL-04)
    cogs            REAL,
    sale_price      REAL,
    sold_price      REAL,
    marketplace     TEXT,
    status          TEXT NOT NULL DEFAULT 'draft',
    sold_at         TEXT,

    -- Descriptions (SEL-01)
    description_it  TEXT,
    description_en  TEXT,

    -- AI metadata
    recognition_raw TEXT,

    -- Images
    image_paths     TEXT DEFAULT '[]',

    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    value    TEXT NOT NULL,
    UNIQUE(item_id, category, value)
);

CREATE INDEX IF NOT EXISTS idx_tags_value ON tags(value);
CREATE INDEX IF NOT EXISTS idx_tags_category_value ON tags(category, value);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_lot_id ON items(lot_id);
CREATE INDEX IF NOT EXISTS idx_items_marketplace ON items(marketplace);
CREATE INDEX IF NOT EXISTS idx_items_sold_at ON items(sold_at);
