// 첫 화면 홍보 문구. 사실과 다른 광고는 표시광고법 문제가 될 수 있어서,
// 확인된 내용만 적고 바꿀 때는 이 파일 한 곳만 고친다.

export const BRAND = {
  name: "파크리오 배터리 119",
  nameEn: "BATTERY 119",
  place: "잠실 파크리오",
};

/** 한마디 요약 */
export const TAGLINE = "문 앞에 두면, 새 배터리로 돌아옵니다";

export const HERO = {
  eyebrow: "잠실 파크리오 입주민 전용",
  title: ["무선청소기 배터리 교체,", "난감하시죠?"],
  body: "그냥 문 앞에 내어 두세요. 저희가 수거하고 배터리를 새로 리필해서 다시 문 앞까지 돌려드립니다.",
};

/** 배터리 셀 문구.
 * 공급사에서 전 모델이 삼성SDI 셀이라고 확인해 주면 detail을 바꾸세요.
 * "100% 국내산"은 생산지가 확인될 때만 쓰세요 (삼성SDI 셀은 해외 공장에서도 생산됩니다). */
export const CELL_CLAIM = {
  title: "삼성SDI 배터리 셀",
  detail: "시중의 출처 모를 배터리 대신 삼성SDI 셀을 사용해요. 모델별 셀 사양과 용량을 교체 내역으로 알려 드려요.",
};

/** 보증 문구. 실제 보증 계산은 src/lib/domain.ts 의 WARRANTY_MONTHS (최소 기간) */
export const WARRANTY_CLAIM = {
  title: "6~12개월 안전 보증",
  detail: "교체 후 같은 증상이 생기면 무상으로 다시 점검해요. 보증 기간은 모델에 따라 6개월에서 12개월이에요.",
};

/** 파크리오 공식 로고.
 * 아파트 단지 상표라서 관리사무소·입주자대표회의 허락을 받은 뒤에만 쓰세요.
 * 허락을 받으면 public/parkrio-logo.png 를 올리고 아래를 "/parkrio-logo.png" 로 바꾸면 첫 화면에 보여요. */
export const PARKRIO_OFFICIAL_LOGO: string | null = null;

/** 첫 화면 맨 아래 안내 */
export const DISCLAIMER =
  "파크리오 배터리 119는 파크리오 입주민을 위한 독립 서비스이며, 파크리오 관리사무소나 입주자대표회의가 운영하는 서비스가 아닙니다.";
