"use server";

import { redirect } from "next/navigation";
import { clearSession, clientIp, safeNext, setSession } from "@/lib/auth";
import {
  afterFailure,
  checkNewPin,
  IP_MAX_FAILS_PER_HOUR,
  lockedMinutes,
  LoginError,
  normalizeUnit,
} from "@/lib/loginRules";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { burnPinCheck, hashPin, verifyPin } from "@/lib/pin";
import { customerSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import { UnitTakenError } from "@/lib/store/types";

export interface AuthState {
  error?: string;
  /** 오류가 나도 입력한 동·호수는 다시 채워 준다 */
  dong?: string;
  ho?: string;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const dongIn = str(form, "dong");
  const hoIn = str(form, "ho");
  const pin = str(form, "pin");
  const keep = { dong: dongIn, ho: hoIn };
  const store = getStore();
  let uid: string;

  try {
    const ip = await clientIp();
    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await store.countLoginFailures(ip, since)) >= IP_MAX_FAILS_PER_HOUR) {
      return { ...keep, error: "로그인 시도가 너무 많아요. 1시간 뒤에 다시 시도해 주세요." };
    }
    const { dong, ho } = normalizeUnit(dongIn, hoIn);
    if (!/^\d{4}$/.test(pin)) return { ...keep, error: "비밀번호 숫자 4자리를 입력해 주세요." };

    const c = await store.findCustomerByUnit(dong, ho);
    if (!c) {
      burnPinCheck(pin);
      await store.recordLoginFailure(ip);
      return { ...keep, error: "동·호수 또는 비밀번호가 맞지 않아요. 처음이시면 '처음이에요'에서 가입해 주세요." };
    }
    const wait = lockedMinutes(c.lockedUntil);
    if (wait > 0) return { ...keep, error: `비밀번호를 여러 번 틀려서 잠겼어요. ${wait}분 뒤에 다시 시도해 주세요.` };

    if (!verifyPin(pin, c.pinHash)) {
      await store.updateCustomer(c.id, afterFailure(c.failedCount));
      await store.recordLoginFailure(ip);
      return { ...keep, error: "동·호수 또는 비밀번호가 맞지 않아요." };
    }
    if (c.failedCount || c.lockedUntil) await store.updateCustomer(c.id, { failedCount: 0, lockedUntil: null });
    uid = c.id;
  } catch (e) {
    if (e instanceof LoginError) return { ...keep, error: e.message };
    console.error("login failed", e);
    return { ...keep, error: "로그인하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await setSession(customerSession(uid));
  redirect(safeNext(form.get("next")));
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const dongIn = str(form, "dong");
  const hoIn = str(form, "ho");
  const keep = { dong: dongIn, ho: hoIn };
  let uid: string;
  try {
    const { dong, ho } = normalizeUnit(dongIn, hoIn);
    checkNewPin(str(form, "pin"), str(form, "pin2"));
    const phone = str(form, "phone");
    if (!isValidPhone(phone)) return { ...keep, error: "휴대폰 번호를 010-1234-5678처럼 적어 주세요. 진행 상황 알림을 보내 드려요." };
    if (form.get("resident") !== "on") return { ...keep, error: "파크리오 입주민인지 확인해 주세요." };
    const c = await getStore().createCustomer({
      dong,
      ho,
      pinHash: hashPin(str(form, "pin")),
      name: str(form, "name").slice(0, 20) || null,
      phone: normalizePhone(phone),
    });
    uid = c.id;
  } catch (e) {
    if (e instanceof LoginError) return { ...keep, error: e.message };
    if (e instanceof UnitTakenError)
      return { ...keep, error: "이미 가입된 세대예요. 로그인해 주세요. 비밀번호를 모르면 로그인 화면의 '비밀번호를 잊으셨나요?'를 눌러 주세요." };
    console.error("signup failed", e);
    return { ...keep, error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  await setSession(customerSession(uid));
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await clearSession();
  redirect("/");
}
