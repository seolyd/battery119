-- 판매가를 업체 원가 + 20,000원으로 맞춘다 (2026-11-22, 기존 + 30,000원에서 변경).
-- 이미 접수된 주문의 결제 금액은 바뀌지 않는다 (주문마다 금액을 따로 저장).
-- 관리자 화면에서 모델별로 직접 바꾼 판매가도 이 규칙으로 다시 덮어쓴다.

update models m
set
  price = m.partner_cost + 20000,
  options = coalesce(
    (
      select jsonb_agg(o || jsonb_build_object('price', (o ->> 'partnerCost')::int + 20000) order by i)
      from jsonb_array_elements(m.options) with ordinality as t(o, i)
    ),
    '[]'::jsonb
  );
