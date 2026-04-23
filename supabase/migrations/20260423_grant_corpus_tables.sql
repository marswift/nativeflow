-- Grant corpus tables read access for authenticated users
-- Corpus is reference data — all authenticated users can read

GRANT SELECT ON public.corpus_conversations TO authenticated;
GRANT SELECT ON public.corpus_turns TO authenticated;
GRANT SELECT ON public.corpus_chunks TO authenticated;
GRANT SELECT ON public.corpus_translations TO authenticated;
GRANT SELECT ON public.corpus_audio_assets TO authenticated;

-- RLS policies for corpus tables (RLS enabled but no policies existed)
CREATE POLICY corpus_conversations_read ON public.corpus_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY corpus_turns_read ON public.corpus_turns FOR SELECT TO authenticated USING (true);
CREATE POLICY corpus_chunks_read ON public.corpus_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY corpus_translations_read ON public.corpus_translations FOR SELECT TO authenticated USING (true);
CREATE POLICY corpus_audio_assets_read ON public.corpus_audio_assets FOR SELECT TO authenticated USING (true);
