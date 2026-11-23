-- 앱 안 문의 게시판과 알림톡 발송 기록 (2026-11-23)

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('general', 'pin_reset')),
  customer_id uuid references customers (id),
  order_id uuid references orders (id),
  dong text not null,
  ho text not null,
  phone text not null,
  body text not null,
  answer text,
  status text not null default 'open' check (status in ('open', 'answered')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists inquiries_status on inquiries (status, created_at desc);
create index if not exists inquiries_customer on inquiries (customer_id, created_at desc);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  event text not null,
  order_id uuid references orders (id) on delete cascade,
  inquiry_id uuid references inquiries (id) on delete cascade,
  to_masked text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_order on notifications (order_id, created_at);

alter table inquiries enable row level security;
alter table notifications enable row level security;

-- 앱 서버만 읽고 쓴다 (0002와 같은 원칙)
grant select, insert, update, delete on inquiries, notifications to service_role;
grant usage, select on all sequences in schema public to service_role;
