import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { endpoint: string; payload: string }[] = [];
vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "pub", privateKey: "priv" }),
    sendNotification: vi.fn(async (sub: { endpoint: string }, payload: string) => {
      if (sub.endpoint.includes("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      sent.push({ endpoint: sub.endpoint, payload });
    }),
  },
}));

describe("웹 푸시 발송", () => {
  beforeEach(() => {
    sent.length = 0;
    (globalThis as { __b119Store?: unknown }).__b119Store = undefined;
    delete process.env.SUPABASE_URL;
  });

  it("키가 없으면 보내지 않고 이유를 남긴다", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const { pushToCustomer } = await import("@/lib/push");
    expect((await pushToCustomer("c1", { title: "t", body: "b", url: "/" })).status).toBe("skipped");
  });

  it("고객이 켠 기기로 보내고, 알림을 끈 기기는 지운다", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const { getStore } = await import("@/lib/store");
    const { pushToCustomer, pushToAdmins } = await import("@/lib/push");
    const store = getStore();
    const base = { p256dh: "k", auth: "a", userAgent: null, admin: false };
    await store.savePushSubscription({ ...base, customerId: "c1", endpoint: "https://push.example/ok" });
    await store.savePushSubscription({ ...base, customerId: "c1", endpoint: "https://push.example/gone" });
    await store.savePushSubscription({ ...base, customerId: "c2", endpoint: "https://push.example/other" });
    await store.savePushSubscription({ ...base, customerId: null, admin: true, endpoint: "https://push.example/admin" });

    const r = await pushToCustomer("c1", { title: "입금 확인됐어요", body: "내일 가지러 가요", url: "https://x/s/AbCdEfGhIjKl" });
    expect(r.status).toBe("sent");
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example/ok"]);
    expect(JSON.parse(sent[0].payload)).toEqual({ title: "입금 확인됐어요", body: "내일 가지러 가요", url: "https://x/s/AbCdEfGhIjKl" });
    expect((await store.listPushSubscriptions({ customerId: "c1" })).map((s) => s.endpoint)).toEqual(["https://push.example/ok"]);

    sent.length = 0;
    await pushToAdmins({ title: "새 신청", body: "215동", url: "/admin" });
    expect(sent.map((s) => s.endpoint)).toEqual(["https://push.example/admin"]);
  });
});
