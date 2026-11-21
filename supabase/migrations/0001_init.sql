-- 파크리오 배터리 119 초기 스키마
-- 앱 서버만 서비스 롤 키로 접근한다. 모든 테이블에 RLS를 켜고 정책을 두지 않아
-- 브라우저(anon 키)에서는 읽거나 쓸 수 없다.
-- 로그인은 Supabase Auth를 쓰지 않고, 앱이 동·호수 + 4자리 비밀번호로 직접 처리한다.

create extension if not exists pgcrypto;

create table partners (
  id text primary key,
  name text not null,
  region text not null,
  contact text,
  created_at timestamptz not null default now()
);

-- 한 세대(동·호수) = 한 계정
create table customers (
  id uuid primary key default gen_random_uuid(),
  dong text not null check (dong ~ '^[0-9]{3}$'),
  ho text not null check (ho ~ '^[0-9]{3,4}$'),
  pin_hash text not null,       -- scrypt, 앱에서 해시
  failed_count integer not null default 0,
  locked_until timestamptz,
  name text,
  phone text,
  door_code_enc text,           -- AES-256-GCM, 앱에서 암호화
  created_at timestamptz not null default now(),
  unique (dong, ho)
);

-- 로그인 실패 기록 (같은 접속지에서 여러 세대를 돌아가며 찍는 시도 제한)
create table login_failures (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index login_failures_ip_at on login_failures (ip, at);

create table models (
  id text primary key,
  category text not null check (category in ('cordless', 'robot')),
  brand text not null,
  name text not null,
  partner_id text references partners (id),
  partner_cost integer not null check (partner_cost >= 0),
  price integer not null check (price >= 0),
  options jsonb not null default '[]'::jsonb,   -- [{label, partnerCost, price}]
  protect_circuit_fee integer,
  active boolean not null default true,
  source_url text,
  updated_at timestamptz not null default now()
);
create index models_category_brand on models (category, brand) where active;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  customer_id uuid not null references customers (id),
  category text not null check (category in ('cordless', 'robot')),
  brand text not null,
  model_id text references models (id),
  model_name text not null,
  option_label text,
  symptoms text[] not null default '{}',
  usage_age text,
  memo text,
  price integer,
  partner_cost integer,
  partner_id text references partners (id),
  status text not null check (status in (
    'REQUESTED','PAYMENT_PENDING','PAID','PICKED_UP','AT_PARTNER','REPAIRING','QC',
    'NOT_REPAIRABLE','DELIVERY_SCHEDULED','DELIVERED','AS_REQUESTED','CANCELED')),
  dong text not null,
  ho text not null,
  phone text not null,
  packaging_agreed_at timestamptz not null,
  depositor_name text,
  paid_at timestamptz,
  pickup_date date,
  delivery_date date,
  delivered_at timestamptz,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer on orders (customer_id, created_at desc);
create index orders_status on orders (status);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text not null check (actor in ('customer', 'admin', 'system')),
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order on order_events (order_id, created_at);

create table inspections (
  order_id uuid primary key references orders (id) on delete cascade,
  charge_ok boolean not null,
  runtime_min integer,
  heat_ok boolean not null,
  exterior_ok boolean not null,
  passed boolean not null,
  note text,
  created_at timestamptz not null default now()
);

-- 수거·배송을 쉬는 날
create table closed_dates (
  date date primary key,
  reason text
);

-- 주문번호: PR-YYMMDD-NN (서울 날짜 기준, 날마다 01부터)
create table order_counters (
  day text primary key,
  seq integer not null
);

create or replace function set_order_no() returns trigger
language plpgsql as $$
declare
  d text := to_char(now() at time zone 'Asia/Seoul', 'YYMMDD');
  n integer;
begin
  insert into order_counters (day, seq) values (d, 1)
  on conflict (day) do update set seq = order_counters.seq + 1
  returning seq into n;
  new.order_no := 'PR-' || d || '-' || lpad(n::text, 2, '0');
  return new;
end $$;

create trigger orders_order_no before insert on orders
  for each row when (new.order_no is null) execute function set_order_no();

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on orders for each row execute function touch_updated_at();
create trigger models_touch before update on models for each row execute function touch_updated_at();

alter table partners enable row level security;
alter table customers enable row level security;
alter table models enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table inspections enable row level security;
alter table closed_dates enable row level security;
alter table order_counters enable row level security;
alter table login_failures enable row level security;
