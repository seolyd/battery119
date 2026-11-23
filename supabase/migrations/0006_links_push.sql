-- 문자 바로가기 링크, 웹 푸시 (2026-11-23)

-- 1. 주문마다 문자에 넣을 바로가기 코드 (/s/코드). 로그인 없이 그 주문을 볼 수 있다.
alter table orders add column if not exists access_token text;
update orders
  set access_token = translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_')
  where access_token is null;
alter table orders alter column access_token set not null;
create unique index if not exists orders_access_token on orders (access_token);

-- 2. 웹 푸시를 켠 기기 (고객 기기는 customer_id, 운영자 기기는 admin = true)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete cascade,
  admin boolean not null default false,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_customer on push_subscriptions (customer_id);

-- 3. 발송 기록에 경로(알림톡 / 웹 푸시 / 운영자 문자) 추가
alter table notifications add column if not exists channel text not null default 'alimtalk';
alter table notifications drop constraint if exists notifications_status_check;
alter table notifications add constraint notifications_status_check check (status in ('sent', 'failed', 'skipped', 'manual'));

alter table push_subscriptions enable row level security;
grant select, insert, update, delete on push_subscriptions to service_role;
