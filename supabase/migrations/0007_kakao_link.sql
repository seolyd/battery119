-- 카카오톡 채널 1:1 채팅으로 소식을 받는 고객 표시 (2026-11-24)
-- 고객이 채널에 동·호수를 보내 오면 운영자가 관리자 화면에서 "카톡 연결됨"으로 표시한다.
alter table customers add column if not exists kakao_linked_at timestamptz;
