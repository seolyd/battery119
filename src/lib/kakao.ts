// 카카오톡 채널 (무료 1:1 채팅). KAKAO_CHANNEL_URL 예: https://pf.kakao.com/_xxxxx
// 채널은 고객이 먼저 말을 걸어야 대화방이 생기고, 메시지를 미리 채워 주는 기능은 없다.

export function kakaoChannelUrl(): string | null {
  const u = process.env.KAKAO_CHANNEL_URL?.trim().replace(/\/+$/, "").replace(/\/chat$/, "");
  return u && /^https:\/\/pf\.kakao\.com\/_[A-Za-z0-9]+$/.test(u) ? u : null;
}

export function kakaoChatUrl(): string | null {
  const u = kakaoChannelUrl();
  return u ? `${u}/chat` : null;
}
