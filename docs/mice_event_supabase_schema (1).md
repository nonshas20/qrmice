# MICE Event Attendance Tracking - Supabase Database Schema

## Database Tables Structure

### Students Table
```sql
create table public.students (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  email text not null,
  qr_code_data text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id),
  constraint email_unique unique (email)
);

-- Enable Row Level Security
alter table public.students enable row level security;

-- Create policy for authenticated users
create policy "Students are viewable by authenticated users"
  on public.students
  for select
  to authenticated
  using (true);

create policy "Students are editable by authenticated users"
  on public.students
  for all
  to authenticated
  using (true);
```

### Events Table
```sql
create table public.events (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable Row Level Security
alter table public.events enable row level security;

-- Create policy for authenticated users
create policy "Events are viewable by authenticated users"
  on public.events
  for select
  to authenticated
  using (true);

create policy "Events are editable by authenticated users"
  on public.events
  for all
  to authenticated
  using (true);
```

### Attendance Records Table
```sql
create table public.attendance_records (
  id uuid not null default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  time_in timestamp with time zone,
  time_out timestamp with time zone,
  email_sent_in boolean not null default false,
  email_sent_out boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id),
  constraint unique_attendance_record unique (student_id, event_id)
);

-- Enable Row Level Security
alter table public.attendance_records enable row level security;

-- Create policy for authenticated users
create policy "Attendance records are viewable by authenticated users"
  on public.attendance_records
  for select
  to authenticated
  using (true);

create policy "Attendance records are editable by authenticated users"
  on public.attendance_records
  for all
  to authenticated
  using (true);
```

### Users (Secretaries/Admins) Table
```sql
-- This table is automatically created by Supabase Auth
-- We can extend it with additional fields if needed

-- Create profile table linked to auth.users
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  name text,
  role text not null default 'secretary',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policy for viewing own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);
```

## Indexes

```sql
-- Create indexes for better performance
create index idx_students_email on public.students(email);
create index idx_students_qr_code on public.students(qr_code_data);
create index idx_attendance_student_id on public.attendance_records(student_id);
create index idx_attendance_event_id on public.attendance_records(event_id);
create index idx_events_date on public.events(date);
```

## Functions

### Record Time In Function
```sql
create or replace function public.record_time_in(
  p_student_id uuid,
  p_event_id uuid
) returns public.attendance_records as $$
declare
  v_record public.attendance_records;
begin
  -- Upsert attendance record
  insert into public.attendance_records (student_id, event_id, time_in)
  values (p_student_id, p_event_id, now())
  on conflict (student_id, event_id)
  do update set time_in = now(), email_sent_in = false
  returning * into v_record;
  
  return v_record;
end;
$$ language plpgsql security definer;
```

### Record Time Out Function
```sql
create or replace function public.record_time_out(
  p_student_id uuid,
  p_event_id uuid
) returns public.attendance_records as $$
declare
  v_record public.attendance_records;
begin
  -- Update attendance record with time out
  update public.attendance_records
  set time_out = now(), email_sent_out = false
  where student_id = p_student_id and event_id = p_event_id
  returning * into v_record;
  
  return v_record;
end;
$$ language plpgsql security definer;
```

## Triggers

### Update Timestamp Trigger
```sql
create or replace function public.update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to tables
create trigger update_students_timestamp
before update on public.students
for each row execute procedure public.update_timestamp();

create trigger update_events_timestamp
before update on public.events
for each row execute procedure public.update_timestamp();

create trigger update_attendance_timestamp
before update on public.attendance_records
for each row execute procedure public.update_timestamp();

create trigger update_profiles_timestamp
before update on public.profiles
for each row execute procedure public.update_timestamp();
```

## Views

### Attendance Report View
```sql
create or replace view public.attendance_report as
select 
  a.id as attendance_id,
  e.id as event_id,
  e.name as event_name,
  e.date as event_date,
  s.id as student_id,
  s.name as student_name,
  s.email as student_email,
  a.time_in,
  a.time_out,
  a.email_sent_in,
  a.email_sent_out,
  case when a.time_in is not null then true else false end as is_present,
  case when a.time_out is not null then true else false end as has_left,
  case 
    when a.time_in is not null and a.time_out is not null 
    then extract(epoch from (a.time_out - a.time_in))/3600 
    else null 
  end as hours_present
from 
  public.events e
cross join 
  public.students s
left join 
  public.attendance_records a on a.student_id = s.id and a.event_id = e.id;
```