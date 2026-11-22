-- 앱 서버(service_role)에 표 권한을 준다.
-- 최근 Supabase 프로젝트는 SQL로 만든 표에 권한을 자동으로 주지 않아서,
-- 이게 없으면 앱에서 "permission denied for table models" 오류가 난다.
-- anon / authenticated(공개 키)에는 주지 않으므로 브라우저에서는 여전히 접근할 수 없다.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
