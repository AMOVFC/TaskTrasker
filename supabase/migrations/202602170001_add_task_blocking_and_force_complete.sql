alter table public.tasks
  add column if not exists blocking_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists force_completed boolean not null default false;

create index if not exists idx_tasks_user_blocking_task on public.tasks (user_id, blocking_task_id)
where blocking_task_id is not null;
