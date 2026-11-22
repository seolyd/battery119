# 파크리오 배터리 119

청소기 배터리, 이제 들고 나가지 마세요.
잠실 파크리오 주민이 무선청소기·로봇청소기를 집 앞에서 맡기고 집 앞에서 돌려받는 배터리 교체 서비스입니다.

- **고객 앱** (모바일 웹): 동·호수 + 4자리 비밀번호로 가입·로그인 → 청소기 종류 → 제조사 → 모델 → 조건 → 수거 정보 → 견적 확인 → 계좌이체
- **관리자 화면** (`/admin-login` → `/admin`): 오늘 수거·배송 루트, 입금 확인, 상태 변경, 품질검사, 모델별 원가·판매가 관리

## 바로 실행해 보기 (데모 모드)

환경 변수 없이 실행하면 데모 모드로 동작합니다. 데이터는 서버 메모리에 저장되고, 서버를 다시 시작하면 사라집니다.

```bash
npm install
npm run dev
# http://localhost:3000
```

- 로그인 화면의 **처음이에요**에서 아무 동·호수와 비밀번호로 가입 → 수리 신청
- `/admin-login`에서 비밀번호 `admin-demo`로 관리자 로그인 → 입금 확인부터 배송 완료까지 처리

## 운영 규칙 (코드에 반영된 것)

| 항목 | 규칙 | 위치 |
|---|---|---|
| 서비스 대상 | 무선청소기, 로봇청소기 | `src/lib/domain.ts` |
| 계정 | 한 세대(동·호수) = 한 계정, 숫자 4자리 비밀번호 | `src/lib/loginRules.ts` |
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
asbattery.com 배터리리필 메뉴의 공개 리필가(2026-11-21 조사)를 업체 원가로, **원가 + 20,000원**을 판매가로 넣었습니다.
실제 협력 단가와 판매가가 정해지면 관리자 화면의 **모델·가격**에서 바꾸면 됩니다.

JSON을 고친 뒤 Supabase용 SQL을 다시 만들려면:

```bash
npm run seed:sql   # supabase/seed.sql 생성
```

## 로그인 방식

카카오 로그인 대신 **동·호수 + 숫자 4자리 비밀번호**를 씁니다. 4자리는 경우의 수가 적어서 다음을 함께 적용했습니다.

- 같은 세대에서 5번 틀리면 15분 잠금
- 같은 접속지(IP)에서 1시간에 20번 틀리면 1시간 차단 (여러 세대를 돌아가며 찍는 시도 방지)
- 1234, 0000, 1212처럼 쉬운 번호는 가입 불가
- 비밀번호는 scrypt 해시로 저장, 로그인 상태는 서명한 쿠키(180일)로 유지
- **저장된 공동현관 비밀번호는 고객 화면으로 다시 보내지 않습니다.** 누가 남의 계정에 들어가더라도 공동현관 번호는 볼 수 없고, 운영자만 관리자 화면에서 볼 수 있습니다.
- 비밀번호를 잊은 고객은 카카오톡 채널 등으로 본인을 확인한 뒤, 관리자 주문 상세의 **로그인 비밀번호 새로 정하기**로 바꿔 줍니다.
- 이미 누가 가입한 동·호수로는 다시 가입할 수 없습니다. 다른 사람이 먼저 가입했다는 문의가 오면 운영자가 비밀번호를 새로 정해 실제 입주민에게 알려 주세요.

운영자는 `/admin-login`에서 `ADMIN_PASSWORD`로 로그인합니다 (12시간 유지).

## 실제 운영 설정 (Supabase 무료 + Vercel 무료)

### 1. Supabase 프로젝트 만들기
1. https://supabase.com 가입 → **New project**
2. 이름 `battery119`, Database Password는 아무거나 길게 (따로 저장해 두기), Region은 **Northeast Asia (Seoul)**
3. 만들어지기까지 1~2분 기다리기

### 2. 표 만들기 (SQL 세 번 실행)
1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 `supabase/migrations/0001_init.sql` 내용을 전부 붙여 넣고 **Run**
3. 새 쿼리에 `supabase/migrations/0002_grants.sql` 내용을 붙여 넣고 **Run** (앱 서버에 표 권한 주기. 빠뜨리면 `permission denied for table` 오류가 나요)
4. 새 쿼리에 `supabase/seed.sql` 내용을 붙여 넣고 **Run** (협력업체 4곳, 모델 191개)
5. 왼쪽 **Table Editor**에서 `models` 표에 191줄이 보이면 성공

> `supabase/migrations/0003_price_margin_20000.sql`은 11월 22일 전에 이미 DB를 만든 경우에만 실행합니다 (판매가를 원가 + 30,000원 → + 20,000원으로 변경). 새로 만들 때는 `seed.sql`에 이미 반영돼 있어요.

### 3. 키 두 개 복사하기
- **Project Settings → Data API**: Project URL → `SUPABASE_URL`
- **Project Settings → API Keys**: `service_role` (secret) 키 → `SUPABASE_SERVICE_ROLE_KEY`
  - 이 키는 DB를 마음대로 읽고 쓸 수 있는 열쇠예요. 저장소나 채팅에 붙여 넣지 말고 Vercel 설정에만 넣으세요.

### 4. Vercel에 배포하기
1. https://vercel.com 에 GitHub 계정으로 가입 → **Add New → Project** → `battery119` 저장소 **Import**
2. **Environment Variables**에 아래 값을 넣고 **Deploy**

   | 변수 | 값 |
   |---|---|
   | `SUPABASE_URL` | 3번의 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | 3번의 service_role 키 |
   | `SESSION_SECRET` | 아무 긴 문자열 (아래 명령으로 생성 가능) |
   | `DOOR_CODE_KEY` | 아래 명령으로 생성. **한 번 정하면 바꾸지 마세요** (바꾸면 저장된 공동현관 번호를 못 읽어요) |
   | `ADMIN_PASSWORD` | 관리자 비밀번호 (10자 이상) |
   | `BANK_ACCOUNT` | 예: `카카오뱅크 3333-00-0000000 (예금주: 홍길동)` |

   `SESSION_SECRET`과 `DOOR_CODE_KEY` 만들기: Supabase **SQL Editor**에서 아래를 실행하면 나오는 값을 하나씩 쓰세요 (두 번 실행해서 서로 다른 값으로).
   ```sql
   select encode(gen_random_bytes(32), 'base64');
   ```
3. 배포가 끝나면 나오는 주소(예: `battery119.vercel.app`)로 접속해서 가입·신청·관리자 로그인 확인

### 무료 플랜에서 알아둘 점
- Supabase 무료 프로젝트는 **7일 동안 아무 요청이 없으면 일시 정지**됩니다. `vercel.json`에 하루 한 번 `/api/health`를 부르는 예약 작업을 넣어 두어서 잠들지 않습니다.
- 무료 플랜 용량(DB 500MB)은 이 서비스 규모에서 충분합니다.
- 무료 플랜은 자동 백업이 없으니, 가끔 **Table Editor → orders → Export to CSV**로 내려받아 두세요.

### 보안 설계

- 브라우저는 DB에 직접 접근하지 않습니다. 모든 읽기·쓰기는 서버에서 서비스 롤 키로 하고, 테이블은 RLS를 켜고 정책을 두지 않아 외부 키로는 접근할 수 없습니다.
- 권한 확인은 서버 액션마다 합니다. 고객은 자기 주문만, 관리자 화면은 관리자 세션만.
- 가격은 고객이 보낸 값을 쓰지 않고 서버의 모델 정보로 다시 계산합니다.

## 개발

```bash
npm run dev     # 개발 서버
npm test        # 단위 테스트 (일정 규칙, 주문 규칙, 로그인·잠금, 암호화, 저장소)
npm run lint    # 타입 검사
npm run build   # 프로덕션 빌드
```

```
src/
  app/(app)/        고객 화면: 홈, 신청(order), 내 주문(orders), 내 정보(me), 가격표(prices), 로그인
  app/admin/        관리자: 오늘, 주문, 모델·가격
  app/admin-login/  관리자 로그인
  app/api/health/   상태 확인 (Supabase 잠들지 않게 하루 한 번 호출)
  components/       신청 마법사(OrderWizard), 관리자 주문 처리, 공통 UI
  lib/domain.ts     타입, 상태, 고객용 라벨
  lib/schedule.ts   수거·배송일 계산 (서울 시간)
  lib/orderRules.ts 주문 생성 검증, 상태 변경 규칙
  lib/loginRules.ts 동·호수, 4자리 비밀번호, 잠금 규칙
  lib/pin.ts        비밀번호 해시 / lib/session.ts 서명 쿠키
  lib/store/        저장소 (memory: 데모, supabase: 운영)
supabase/           스키마 마이그레이션과 초기 데이터
```

## 다음 단계 (2단계)

- 카카오 알림톡 자동 발송 (입금 안내, 수거 전날, 배송 안내)
- 수거·교체 전후 사진 업로드 (Supabase Storage)
- 휴무일 관리 화면 (`closed_dates` 테이블은 이미 있음)
- 협력업체 전용 화면, 월별 정산·통계
- 앱 안 카드 결제 (토스페이먼츠)
