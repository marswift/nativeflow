# Implementation Spec: Lesson Architecture with Next.js, Supabase, WebRTC, and OpenAI

## 1. Architecture Summary
A real-time conversational lesson system:
- **Next.js App Router** (UI + route handlers)
- **Supabase** (DB + Auth + Realtime)
- **WebRTC + MediaRecorder** (audio capture)
- **Edge Functions** (AI orchestration)
- **OpenAI** (Whisper + streaming ChatCompletions)

Core loop: **audio → Whisper → GPT (stream) → feedback → transcript → summary**

---

## 2. Feature Breakdown
### Dashboard CTA
- Render CTA → `/lessons`
- Analytics `lesson_cta_clicked`

### Lesson List
- Fetch lessons & join completion state
- Grid render

### Pre-Lesson Modal
- `getUserMedia` permission
- Mic retry flow

### Live Lesson
Backend: create session / stream AI / persist transcript
Frontend: record audio / websocket / conversation UI / feedback bubble
Edge cases: reconnect, > 15 s silence

### Summary
- Compute scores
- Fetch transcript
- Render summary

---

## 3. Supabase SQL

```sql
create type speaker_enum as enum ('user','ai');

create table lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level text not null,
  estimated_minutes int not null
);

create table lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  lesson_id uuid references lessons(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  score_fluency float,
  score_accuracy float,
  score_pronunciation float,
  completed boolean default false,
  connection_quality jsonb
);

create table lesson_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references lesson_sessions(id) on delete cascade,
  speaker speaker_enum,
  utterance_text text,
  start_ms int,
  end_ms int,
  ai_feedback jsonb
);

create table lesson_feedback (
  session_id uuid primary key references lesson_sessions(id) on delete cascade,
  user_id uuid,
  strengths jsonb,
  improvements jsonb
);

alter table lesson_sessions      enable row level security;
alter table lesson_transcripts   enable row level security;
alter table lesson_feedback      enable row level security;

create policy "owner_session" on lesson_sessions
  using (user_id = auth.uid());

create policy "owner_transcript" on lesson_transcripts
  using (session_id in (select id from lesson_sessions where user_id = auth.uid()));

create policy "owner_feedback" on lesson_feedback
  using (user_id = auth.uid());

-- lessons are public-read
create policy "read lessons" on lessons for select using (true);
```
