import { createClient } from '@supabase/supabase-js'

type DailyStoryRunRow = {
  id: string
  user_id: string
  story_date: string
  status: string
  created_at: string
  updated_at: string
}

type DailyStoryPhaseProgressRow = {
  id: string
  run_id: string
  phase_id: string
  status: string
  lesson_id: string | null
  started_at: string | null
  completed_at: string | null
}

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createDailyStoryRun(input: {
  userId: string
  storyDate: string
}): Promise<DailyStoryRunRow> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('daily_story_runs')
    .insert({
      user_id: input.userId,
      story_date: input.storyDate,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DailyStoryRunRow
}

export async function getDailyStoryRun(input: {
  userId: string
  storyDate: string
}): Promise<DailyStoryRunRow | null> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('daily_story_runs')
    .select('*')
    .eq('user_id', input.userId)
    .eq('story_date', input.storyDate)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DailyStoryRunRow | null
}

export async function getPhaseProgress(input: {
  runId: string
  phaseId: string
}): Promise<DailyStoryPhaseProgressRow | null> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('daily_story_phase_progress')
    .select('*')
    .eq('run_id', input.runId)
    .eq('phase_id', input.phaseId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as DailyStoryPhaseProgressRow | null
}

export async function createPhaseProgress(input: {
  runId: string
  phaseId: string
  lessonId?: string
}): Promise<DailyStoryPhaseProgressRow> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('daily_story_phase_progress')
    .insert({
      run_id: input.runId,
      phase_id: input.phaseId,
      lesson_id: input.lessonId ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as DailyStoryPhaseProgressRow
}

export async function markPhaseStarted(input: {
  runId: string
  phaseId: string
}): Promise<void> {
  const supabase = getServerSupabase()
  const { error } = await supabase
    .from('daily_story_phase_progress')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('run_id', input.runId)
    .eq('phase_id', input.phaseId)

  if (error) throw new Error(error.message)
}

export async function markPhaseCompleted(input: {
  runId: string
  phaseId: string
}): Promise<void> {
  const supabase = getServerSupabase()
  const { error } = await supabase
    .from('daily_story_phase_progress')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('run_id', input.runId)
    .eq('phase_id', input.phaseId)

  if (error) throw new Error(error.message)
}

export async function listPhaseProgressByRun(input: {
  runId: string
}): Promise<DailyStoryPhaseProgressRow[]> {
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('daily_story_phase_progress')
    .select('*')
    .eq('run_id', input.runId)

  if (error) throw new Error(error.message)
  return (data ?? []) as DailyStoryPhaseProgressRow[]
}

export async function markDailyStoryRunCompleted(input: {
  runId: string
}): Promise<void> {
  const supabase = getServerSupabase()
  const { error } = await supabase
    .from('daily_story_runs')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.runId)

  if (error) throw new Error(error.message)
}

export async function setPhaseProgressLessonId(input: {
  runId: string
  phaseId: string
  lessonId: string
}): Promise<void> {
  const supabase = getServerSupabase()
  const { error } = await supabase
    .from('daily_story_phase_progress')
    .update({ lesson_id: input.lessonId })
    .eq('run_id', input.runId)
    .eq('phase_id', input.phaseId)

  if (error) throw new Error(error.message)
}
