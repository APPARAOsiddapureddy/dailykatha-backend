INSERT INTO users (id, phone, name, content_language, religion_id)
VALUES
  ('11111111-1111-4111-8111-111111111111', '8000000000', 'Demo User', 'te', 'hindu'),
  ('22222222-2222-4222-8222-222222222222', '8000000001', 'Peer User', 'te', 'hindu')
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  content_language = EXCLUDED.content_language,
  religion_id = EXCLUDED.religion_id,
  updated_at = NOW();

INSERT INTO user_interests (user_id, interest_id, rank) VALUES
  ('11111111-1111-4111-8111-111111111111', 'goodmorning', 0),
  ('11111111-1111-4111-8111-111111111111', 'bhakti', 1),
  ('11111111-1111-4111-8111-111111111111', 'love', 2),
  ('22222222-2222-4222-8222-222222222222', 'goodmorning', 0),
  ('22222222-2222-4222-8222-222222222222', 'bhakti', 1),
  ('22222222-2222-4222-8222-222222222222', 'motivation', 2)
ON CONFLICT (user_id, interest_id) DO NOTHING;

INSERT INTO cards (section, category, mood, is_festival, festival, quote, author)
SELECT
  CASE
    WHEN i % 11 = 0 THEN 'festival'
    WHEN i % 5 = 0 THEN 'morning'
    ELSE 'trending'
  END,
  (ARRAY['goodmorning','goodnight','love','bhakti','motivation','cinema','festival','friendship','heroes','poetry','family'])[1 + ((i - 1) % 11)],
  CASE WHEN i % 3 = 0 THEN 'calm' WHEN i % 3 = 1 THEN 'warm' ELSE 'devotional' END,
  (i % 11 = 0),
  CASE WHEN i % 11 = 0 THEN 'Ugadi' ELSE NULL END,
  jsonb_build_object(
    'te', 'శుభోదయం కోట్ ' || i::text || E'\nరోజు మంచిది.',
    'en', 'Good morning quote ' || i::text,
    'hi', 'सुप्रभात ' || i::text
  ),
  jsonb_build_object('te', '— దైనిక కథ', 'en', '— Daily Katha')
FROM generate_series(1, 72) AS g(i)
WHERE (SELECT COUNT(*) FROM cards) < 5;

INSERT INTO interactions (user_id, card_id, action, created_at)
SELECT '22222222-2222-4222-8222-222222222222'::uuid, c.id, 'liked', NOW() - (random() * INTERVAL '6 days')
FROM cards c
WHERE c.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM interactions x WHERE x.user_id = '22222222-2222-4222-8222-222222222222'::uuid AND x.card_id = c.id AND x.action = 'liked'
  )
ORDER BY random()
LIMIT 40;

WITH one_card AS (SELECT id FROM cards ORDER BY created_at LIMIT 1)
INSERT INTO interactions (user_id, card_id, action)
SELECT '11111111-1111-4111-8111-111111111111'::uuid, id, 'skipped' FROM one_card
UNION ALL
SELECT '11111111-1111-4111-8111-111111111111'::uuid, id, 'skipped' FROM one_card;

INSERT INTO interactions (user_id, card_id, action)
SELECT '11111111-1111-4111-8111-111111111111'::uuid, c.id, 'viewed'
FROM cards c
ORDER BY c.created_at DESC
LIMIT 3;
