create table if not exists evidence (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    file_name text not null,
    file_path text not null,
    file_type text,
    created_at timestamptz default now(),
    ai_summary text,
    ai_labels text [],
    ai_severity text,
    ai_details jsonb,
    analyzed_at timestamptz
);
-- Enable RLS
alter table evidence enable row level security;
-- Policies
create policy "Users can view their own evidence" on evidence for
select using (auth.uid() = user_id);
create policy "Users can insert their own evidence" on evidence for
insert with check (auth.uid() = user_id);
create policy "Users can update their own evidence" on evidence for
update using (auth.uid() = user_id);
create policy "Users can delete their own evidence" on evidence for delete using (auth.uid() = user_id);
-- Storage bucket setup (if not exists)
insert into storage.buckets (id, name)
values ('evidence-files', 'evidence-files') on conflict do nothing;
create policy "Evidence files are accessible by owner" on storage.objects for
select using (
        bucket_id = 'evidence-files'
        and auth.uid()::text = (storage.foldername(name)) [1]
    );
create policy "Evidence files can be uploaded by owner" on storage.objects for
insert with check (
        bucket_id = 'evidence-files'
        and auth.uid()::text = (storage.foldername(name)) [1]
    );
create policy "Evidence files can be deleted by owner" on storage.objects for delete using (
    bucket_id = 'evidence-files'
    and auth.uid()::text = (storage.foldername(name)) [1]
);