-- Seed catalog for the Shopee Live Producer demo.
-- Official specs sourced 2026-06-06 (see docs/prd/shopee-live-producer.md).
-- Price/stock/vouchers/promotions/restricted_claims are demo seller fields.
--
-- Idempotent: re-running upserts by slug so `db:push` can be repeated safely.

insert into public.catalog_products (
  slug, name, brand, category, currency, price, original_price, image_emoji,
  official_specs, variants, stock, seller_notes, shipping_notes, return_notes,
  vouchers, promotions, faqs, restricted_claims
) values
(
  'sony-wh-1000xm6',
  'Sony WH-1000XM6 Wireless Noise Cancelling Headphones',
  'Sony',
  'Headphones',
  'SGD',
  559.00,
  649.00,
  '🎧',
  '[
    {"label": "Battery (NC on)", "value": "Up to 30 hours music playback"},
    {"label": "Battery (NC off)", "value": "Up to 40 hours music playback"},
    {"label": "Bluetooth", "value": "Bluetooth 5.3"},
    {"label": "Audio formats", "value": "SBC, AAC, LDAC, LC3"},
    {"label": "Wearing style", "value": "Over-ear"},
    {"label": "In the box", "value": "Carrying case, connection cable, USB cable, warranty card, reference guide"}
  ]'::jsonb,
  '[{"name": "Color", "options": ["Black", "Platinum Silver", "Midnight Blue"]}]'::jsonb,
  '{"Black": 24, "Platinum Silver": 11, "Midnight Blue": 0}'::jsonb,
  'Flagship ANC headphones. Demo hero product for premium audio Q&A.',
  'Free standard shipping within Singapore. Ships in 1-2 business days.',
  '7-day change-of-mind returns if unopened and in original packaging.',
  '[{"code": "XM6LIVE40", "description": "S$40 off when you check out during the live stream"}]'::jsonb,
  '[{"label": "Live bundle", "description": "Free carry pouch with every live-stream order today"}]'::jsonb,
  '[
    {"q": "Does it support LDAC?", "a": "Yes, the WH-1000XM6 supports LDAC alongside SBC, AAC, and LC3."},
    {"q": "How long does the battery last?", "a": "Up to 30 hours with noise cancelling on, and up to 40 hours with it off."},
    {"q": "Is it over-ear?", "a": "Yes, it is an over-ear wearing style and comes with a carrying case."}
  ]'::jsonb,
  '[
    "Do not claim it cures, treats, or prevents any hearing condition or medical issue.",
    "Do not claim it is medically certified for hearing protection.",
    "Do not promise lifetime warranty or guaranteed resale value."
  ]'::jsonb
),
(
  'logitech-mx-master-3s',
  'Logitech MX Master 3S Wireless Performance Mouse',
  'Logitech',
  'Mouse',
  'SGD',
  189.00,
  null,
  '🖱️',
  '[
    {"label": "Tracking", "value": "8K DPI sensor, tracks on virtually any surface"},
    {"label": "Glass tracking", "value": "Works on glass at least 4 mm thick"},
    {"label": "Quiet clicks", "value": "90% less click noise vs MX Master 3"},
    {"label": "Scrolling", "value": "MagSpeed electromagnetic scroll, up to 1,000 lines per second"},
    {"label": "Software", "value": "Logi Options+ on Windows and macOS"},
    {"label": "Color", "value": "Graphite (Singapore listing)"}
  ]'::jsonb,
  '[{"name": "Color", "options": ["Graphite", "Pale Grey"]}]'::jsonb,
  '{"Graphite": 37, "Pale Grey": 6}'::jsonb,
  'Productivity mouse. Demo product for compatibility and feature Q&A.',
  'Free standard shipping within Singapore. Ships same business day before 3pm.',
  '7-day change-of-mind returns if unopened and in original packaging.',
  '[{"code": "MX3SLIVE15", "description": "S$15 off during the live stream only"}]'::jsonb,
  '[{"label": "Live bundle", "description": "Bundle with a desk mat for S$25 extra during the stream"}]'::jsonb,
  '[
    {"q": "Does it work on glass?", "a": "Yes, it tracks on glass surfaces that are at least 4 mm thick."},
    {"q": "Is it quiet?", "a": "Yes, the clicks are about 90% quieter than the MX Master 3."},
    {"q": "What software does it use?", "a": "Logi Options+ on both Windows and macOS."}
  ]'::jsonb,
  '[
    "Do not promise compatibility with devices or operating systems not listed.",
    "Do not promise lifetime warranty or guaranteed performance figures beyond the listed specs."
  ]'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  currency = excluded.currency,
  price = excluded.price,
  original_price = excluded.original_price,
  image_emoji = excluded.image_emoji,
  official_specs = excluded.official_specs,
  variants = excluded.variants,
  stock = excluded.stock,
  seller_notes = excluded.seller_notes,
  shipping_notes = excluded.shipping_notes,
  return_notes = excluded.return_notes,
  vouchers = excluded.vouchers,
  promotions = excluded.promotions,
  faqs = excluded.faqs,
  restricted_claims = excluded.restricted_claims;
