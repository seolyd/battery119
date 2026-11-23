import { afterEach, describe, expect, it } from "vitest";
import { kakaoChannelUrl, kakaoChatUrl } from "@/lib/kakao";

describe("카카오톡 채널 주소", () => {
  afterEach(() => delete process.env.KAKAO_CHANNEL_URL);
  it("채널 주소를 정리하고 채팅 주소를 만든다", () => {
    for (const v of ["https://pf.kakao.com/_AbC12", "https://pf.kakao.com/_AbC12/", "https://pf.kakao.com/_AbC12/chat", " https://pf.kakao.com/_AbC12 "]) {
      process.env.KAKAO_CHANNEL_URL = v;
      expect(kakaoChannelUrl()).toBe("https://pf.kakao.com/_AbC12");
      expect(kakaoChatUrl()).toBe("https://pf.kakao.com/_AbC12/chat");
    }
  });
  it("카카오 채널 주소가 아니면 쓰지 않는다", () => {
    for (const v of ["", "https://evil.example/_x", "http://pf.kakao.com/_x", "javascript:alert(1)"]) {
      process.env.KAKAO_CHANNEL_URL = v;
      expect(kakaoChannelUrl()).toBeNull();
    }
  });
});
