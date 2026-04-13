-- Urgent RLS fixes for tables that were missing row-level security

-- announcements: public read (published only), admin write via service role
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT TO authenticated USING (is_published = true);

-- lesson_events: own-user insert/select
ALTER TABLE lesson_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_events_insert_own" ON lesson_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_events_select_own" ON lesson_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- pronunciation_scores: own-user insert/select (user_id is text type)
ALTER TABLE pronunciation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pronunciation_scores_insert_own" ON pronunciation_scores FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "pronunciation_scores_select_own" ON pronunciation_scores FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

-- user_learning_profiles: own-user CRUD
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ulp_select_own" ON user_learning_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ulp_insert_own" ON user_learning_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ulp_update_own" ON user_learning_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- target_countries: read-only reference data
ALTER TABLE target_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "target_countries_select_all" ON target_countries FOR SELECT TO authenticated USING (true);
