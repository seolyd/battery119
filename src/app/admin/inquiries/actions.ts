"use server";

import { randomInt } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { isWeakPin } from "@/lib/loginRules";
import { maskPhone, notifyInquiryAnswered, notifyPinReset } from "@/lib/notify";
import { isValidPhone } from "@/lib/phone";
import { hashPin } from "@/lib/pin";
import { getStore } from "@/lib/store";

export interface AdminHelpState {
  ok?: string;
  error?: string;
  /** 알림톡을 보내지 못했을 때 운영자가 직접 알려 줄 새 비밀번호 */
  pin?: string;
}

export async function answerInquiry(id: string, _: AdminHelpState, form: FormData): Promise<AdminHelpState> {
  await requireAdmin();
  const answer = String(form.get("answer") ?? "").trim();
  if (answer.length < 2) return { error: "답변을 적어 주세요." };
  const store = getStore();
  const q = await store.getInquiry(id);
  if (!q) return { error: "문의를 찾을 수 없어요." };
  const updated = await store.answerInquiry(id, answer.slice(0, 2000));
  await notifyInquiryAnswered(updated);
  // 목록을 바로 새로 그리지 않는다: 카드가 사라지면 결과 안내도 같이 사라지기 때문 (다음에 열면 반영됨)
  return { ok: "답변을 등록했어요. 고객에게 알림을 보냈어요." };
}

function newPin(): string {
  for (;;) {
    const p = String(randomInt(0, 10000)).padStart(4, "0");
    if (!isWeakPin(p)) return p;
  }
}

/**
 * 새 로그인 비밀번호를 만들어 계정에 등록된 번호로 보낸다.
 * 계정에 번호가 없을 때만, 운영자가 본인 확인을 마쳤다고 체크하면 요청한 번호로 보낸다.
 */
export async function resetPinFromInquiry(id: string, _: AdminHelpState, form: FormData): Promise<AdminHelpState> {
  await requireAdmin();
  const store = getStore();
  const q = await store.getInquiry(id);
  if (!q || q.kind !== "pin_reset") return { error: "비밀번호 재설정 요청이 아니에요." };
  const account = await store.findCustomerByUnit(q.dong, q.ho);
  if (!account) return { error: "이 동·호수로 가입한 계정이 없어요. 고객에게 '처음이에요'로 가입하라고 안내해 주세요." };

  let to = account.phone;
  if (!to || !isValidPhone(to)) {
    if (form.get("verified") !== "on") return { error: "계정에 등록된 번호가 없어요. 본인 확인을 마친 뒤 체크하고 다시 눌러 주세요." };
    to = q.phone;
  }
  const pin = newPin();
  await store.updateCustomer(account.id, { pinHash: hashPin(pin), failedCount: 0, lockedUntil: null });
  const status = await notifyPinReset(q.dong, q.ho, to, pin, q.id);
  await store.answerInquiry(q.id, `새 비밀번호를 ${maskPhone(to)} 번호로 ${status === "sent" ? "보냈어요" : "직접 안내했어요"}.`);
  // 목록을 새로 그리지 않는다: 알림톡을 못 보냈을 때 운영자가 봐야 할 새 비밀번호가 사라지면 안 된다
  if (status === "sent") return { ok: `새 비밀번호를 ${maskPhone(to)}로 보냈어요.` };
  return { ok: `알림톡을 보내지 못했어요. 아래 비밀번호를 ${maskPhone(to)} 고객에게 직접 알려 주세요.`, pin };
}
