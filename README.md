# 파크리오 배터리 119

청소기 배터리, 이제 들고 나가지 마세요.
잠실 파크리오 주민이 무선청소기·로봇청소기를 집 앞에서 맡기고 집 앞에서 돌려받는 배터리 교체 서비스입니다.

- **고객 앱** (모바일 웹): 카카오 로그인 → 청소기 종류 → 제조사 → 모델 → 조건 → 수거 정보 → 견적 확인 → 계좌이체
- **관리자 화면** (`/admin`): 오늘 수거·배송 루트, 입금 확인, 상태 변경, 품질검사, 모델별 원가·판매가 관리

## 바로 실행해 보기 (데모 모드)

환경 변수 없이 실행하면 데모 모드로 동작합니다. 데이터는 서버 메모리에 저장되고, 카카오 대신 데모 계정 버튼으로 로그인합니다.

```bash
npm install
npm run dev
# http://localhost:3000
```

- 로그인 화면에서 **데모 고객으로 시작하기** → 수리 신청
- **데모 운영자로 시작하기** → `/admin`에서 입금 확인부터 배송 완료까지 처리

## 운영 규칙 (코드에 반영된 것)

| 항목 | 규칙 | 위치 |
|---|---|---|
| 서비스 대상 | 무선청소기, 로봇청소기 | `src/lib/domain.ts` |
| 수거 | 월~목 19~22시. **18시 전에 입금이 확인되면 당일**, 아니면 다음 수거일 | `src/lib/schedule.ts` |
| 배송 | 월~토 19~22시 | `src/lib/schedule.ts` |
| 결제 | 주문 시 계좌이체. 운영자가 입금 확인 | `src/lib/orderRules.ts` |
| 주소 | 동·호수, 공동현관 비밀번호(AES-256-GCM 암호화 저장) | `src/lib/crypto.ts` |
| 포장 | 고객이 박스로 직접 포장. 동의해야 신청 가능, 동의 시각 기록 | `src/lib/orderRules.ts` |
| 협력업체 | 모델별로 지정. **고객 화면에는 보이지 않음** | `models.partner_id` |
| 교체 불가 | 전액 환불 + 무료 반송 | 관리자 주문 상세 |
| 보증 | 배송일부터 3개월, 고객이 무상 재점검 요청 가능 | `src/lib/domain.ts` |

서버 시간대와 상관없이 모든 날짜 계산은 서울 시간으로 합니다.

### 주문 상태

```
REQUESTED(목록 밖 모델, 견적 필요) → PAYMENT_PENDING(입금 대기) → PAID(수거 예정)
→ PICKED_UP → AT_PARTNER(고객에게는 '배터리 진단') → REPAIRING → QC(품질검사)
→ DELIVERY_SCHEDULED → DELIVERED → (보증 기간 중) AS_REQUESTED
갈림길: AT_PARTNER → NOT_REPAIRABLE → 환불 후 반송 / 수거 전 CANCELED
```

## 모델·가격 데이터

`src/data/models.json`에 191개 모델(무선 148, 로봇 43)이 들어 있습니다.
asbattery.com 배터리리필 메뉴의 공개 리필가(2026-11-21 조사)를 업체 원가로, **원가 + 30,000원**을 판매가로 넣은 예시 값입니다.
실제 협력 단가와 판매가가 정해지면 관리자 화면의 **모델·가격**에서 바꾸면 됩니다.

JSON을 고친 뒤 Supabase용 SQL을 다시 만들려면:

```bash
npm run seed:sql   # supabase/seed.sql 생성
```

## 실제 운영 설정 (Supabase + 카카오 로그인)

1. **Supabase 프로젝트 만들기** (https://supabase.com, 리전은 Northeast Asia (Seoul) 추천)
2. **DB 만들기**: SQL Editor에서 `supabase/migrations/0001_init.sql`, 그다음 `supabase/seed.sql`을 실행
3. **카카오 로그인 켜기**
   - https://developers.kakao.com 에서 애플리케이션 추가
   - 카카오 로그인 활성화, Redirect URI에 `https://<프로젝트>.supabase.co/auth/v1/callback` 등록
   - 동의 항목: 닉네임(필수)
   - Supabase 대시보드 → Authentication → Providers → Kakao에 REST API 키와 Client Secret 입력
   - Authentication → URL Configuration의 Site URL과 Redirect URLs에 앱 주소(예: `https://battery119.vercel.app/auth/callback`) 추가
4. **환경 변수**: `.env.example`을 `.env.local`로 복사해서 채우기

   | 변수 | 설명 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키. 공개 저장소나 브라우저 코드에 넣지 마세요 |
   | `DOOR_CODE_KEY` | 공동현관 비밀번호 암호화 키. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` 로 생성. **바꾸면 기존 비밀번호를 읽을 수 없어요** |
   | `ADMIN_USER_IDS` | 관리자 Supabase 사용자 ID (쉼표 구분). 한 번 로그인한 뒤 Authentication → Users에서 확인 |
   | `BANK_ACCOUNT` | 고객에게 보여 줄 입금 계좌 |
5. **배포**: Vercel에 저장소를 연결하고 같은 환경 변수를 넣으면 됩니다.

### 보안 설계

- 브라우저는 DB에 직접 접근하지 않습니다. 모든 읽기·쓰기는 서버(서버 컴포넌트·서버 액션)에서 서비스 롤 키로 하고, 테이블은 RLS를 켜고 정책을 두지 않아 anon 키로는 접근할 수 없습니다.
- 권한 확인은 서버 액션마다 합니다. 고객은 자기 주문만, 관리자 화면은 관리자만.
- 가격은 고객이 보낸 값을 쓰지 않고 서버의 모델 정보로 다시 계산합니다.
- 공동현관 비밀번호는 암호화해서 저장하고, 관리자 주문 상세에서 **보기**를 눌렀을 때만 풀어서 보여 줍니다.

## 개발

```bash
npm run dev     # 개발 서버
npm test        # 단위 테스트 (일정 규칙, 주문 규칙, 암호화, 저장소)
npm run lint    # 타입 검사
npm run build   # 프로덕션 빌드
```

```
src/
  app/(app)/        고객 화면: 홈, 신청(order), 내 주문(orders), 내 정보(me), 가격표(prices), 로그인
  app/admin/        관리자: 오늘, 주문, 모델·가격
  app/auth/         카카오 로그인 시작·콜백·로그아웃
  components/       신청 마법사(OrderWizard), 관리자 주문 처리, 공통 UI
  lib/domain.ts     타입, 상태, 고객용 라벨
  lib/schedule.ts   수거·배송일 계산 (서울 시간)
  lib/orderRules.ts 주문 생성 검증, 상태 변경 규칙
  lib/store/        저장소 (memory: 데모, supabase: 운영)
supabase/           스키마 마이그레이션과 초기 데이터
```

## 다음 단계 (2단계)

- 카카오 알림톡 자동 발송 (입금 안내, 수거 전날, 배송 안내)
- 수거·교체 전후 사진 업로드 (Supabase Storage)
- 휴무일 관리 화면 (`closed_dates` 테이블은 이미 있음)
- 협력업체 전용 화면, 월별 정산·통계
- 앱 안 카드 결제 (토스페이먼츠)
