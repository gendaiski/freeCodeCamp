-- Arabic-aware full-text search: strip diacritics/tatweel, normalise alef/taa-marbuta/alef-maqsura,
-- and turn Arabic punctuation (، ؛ ؟) into separators so "المتعاقدين،" tokenises as "المتعاقدين".
CREATE OR REPLACE FUNCTION ar_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(regexp_replace(translate(regexp_replace(t, '[ًٌٍَُِّْـ]', '', 'g'), 'أإآٱةى،؛؟«»', 'ااااهي     '), '[[:punct:]]+', ' ', 'g'))
$$;
ALTER TABLE law_articles DROP COLUMN tsv_ar;
ALTER TABLE law_articles ADD COLUMN tsv_ar tsvector GENERATED ALWAYS AS (to_tsvector('simple', ar_norm(coalesce(text_ar,'')))) STORED;
CREATE INDEX law_articles_tsv_ar_idx ON law_articles USING GIN (tsv_ar);
