-- Add group_name column to tasks for user-defined grouping / tagging.
-- group_name is free-form text (e.g. "school", "home", "youtube").
-- NULL means the task has no group (shows in All view only).

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS group_name text;

-- Index for efficient per-user group filtering.
CREATE INDEX IF NOT EXISTS tasks_group_name_idx
  ON public.tasks (user_id, group_name)
  WHERE group_name IS NOT NULL;
