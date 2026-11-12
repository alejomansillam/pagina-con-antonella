ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES public.announcements(id) ON DELETE SET NULL;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_end_after_start CHECK (end_date IS NULL OR end_date >= event_date);