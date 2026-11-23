// 홈 화면에 추가했을 때의 앱 정보. 문자 링크 화면에서 추가하면 그 화면이 바로 열리게 start_url을 바꾼다.
export function manifestJson(startUrl: string, id: string) {
  return {
    id,
    name: "파크리오 배터리 119",
    short_name: "배터리 119",
    description: "파크리오 입주민 전용 청소기 배터리 교체 서비스",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    background_color: "#f6efe4",
    theme_color: "#9a6a3a",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function manifestResponse(startUrl: string, id: string): Response {
  return new Response(JSON.stringify(manifestJson(startUrl, id)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
