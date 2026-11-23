import { PinResetForm } from "@/components/HelpForms";
import { AppBar } from "@/components/ui";

export const dynamic = "force-dynamic";

// 로그인 없이 쓰는 화면
export default function PinReset() {
  return (
    <>
      <AppBar title="비밀번호를 잊었어요" back="/login" />
      <main className="content">
        <p className="lead">
          동·호수와 연락처를 남겨 주세요. 확인한 뒤 <b>가입할 때 등록한 휴대폰 번호</b>로 새 비밀번호를 보내 드려요. 다른 번호로는 보내지 않아요.
        </p>
        <PinResetForm />
      </main>
    </>
  );
}
