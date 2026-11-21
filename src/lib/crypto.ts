import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// 공동현관 비밀번호를 AES-256-GCM으로 암호화해서 저장한다.
// 저장 형식: v1.<iv base64>.<tag base64>.<암호문 base64>

function key(): Buffer {
  const raw = process.env.DOOR_CODE_KEY;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length !== 32) throw new Error("DOOR_CODE_KEY는 32바이트를 base64로 인코딩한 값이어야 해요.");
    return k;
  }
  if (process.env.SUPABASE_URL) {
    throw new Error("DOOR_CODE_KEY가 없어요. 실제 DB를 쓸 때는 암호화 키가 꼭 필요해요.");
  }
  // 데모 모드 전용 고정 키 (메모리 저장이라 앱을 껐다 켜면 데이터가 사라진다)
  return createHash("sha256").update("battery119-demo-only").digest();
}

export function encryptDoorCode(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptDoorCode(stored: string): string {
  const [v, iv, tag, data] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("알 수 없는 암호문 형식이에요.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
