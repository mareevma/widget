-- Add image_url to materials, print_methods, customizations
-- for showing preview thumbnails directly on widget buttons.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE print_methods ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE customizations ADD COLUMN IF NOT EXISTS image_url TEXT;
