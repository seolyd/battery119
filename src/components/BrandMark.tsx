// 파크리오 배터리 119 로고.
// 단지 간판처럼 아치형 문(門) 틀 안에 배터리를 넣었다. "문 앞에서 맡기고 문 앞에서 받는" 서비스라는 뜻.
// 색은 브론즈(틀)와 네이비(글씨). 공식 파크리오 엠블럼(나무·물결)은 쓰지 않는다.

export function BrandEmblem({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 100 118" role="img" aria-label="파크리오 배터리 119 로고">
      {/* 아치형 틀 */}
      <path d="M8 22 Q50 2 92 22 V114 H8 Z" fill="var(--bronze)" />
      <path d="M17 28 Q50 12 83 28 V106 H17 Z" fill="none" stroke="var(--brand-cream)" strokeWidth="3" />
      {/* 배터리 */}
      <rect x="40" y="34" width="20" height="6" rx="2" fill="var(--brand-cream)" />
      <rect x="31" y="40" width="38" height="52" rx="6" fill="none" stroke="var(--brand-cream)" strokeWidth="4.5" />
      {/* 충전 번개 */}
      <path d="M54 46 L39 69 H49 L45 86 L61 61 H51 Z" fill="var(--brand-cream)" />
      {/* 문턱 */}
      <path d="M24 99 H76" stroke="var(--brand-cream)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`lockup${compact ? " compact" : ""}`}>
      <BrandEmblem size={compact ? 30 : 46} />
      <span className="lockup-text">
        <span className="lockup-ko">파크리오 배터리</span>
        <span className="lockup-en">
          BATTERY <b>119</b>
        </span>
      </span>
    </span>
  );
}
