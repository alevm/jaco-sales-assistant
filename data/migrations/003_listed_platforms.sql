-- Track which platforms an item is listed on
ALTER TABLE items ADD COLUMN listed_platforms TEXT DEFAULT '[]';
