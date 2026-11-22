"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitOrder } from "@/app/(app)/order/actions";
import { KindIcon } from "@/components/ui";
import { brandsOf, minPrice, type CatalogModel } from "@/lib/catalog";
import { CATEGORY_LABEL, formatWon, SYMPTOMS, USAGE_AGES, type Category } from "@/lib/domain";
import type { RuleField } from "@/lib/orderRules";
import { isValidPhone } from "@/lib/phone";
import { formatDay, VISIT_WINDOW } from "@/lib/schedule";

const STEPS = ["청소기 종류", "제조사", "모델", "조건", "수거 정보", "견적 확인"];
const SWOLLEN = "배터리가 부풀었어요";
const FIELD_STEP: Record<RuleField, number> = { model: 2, conditions: 3, pickup: 4 };

interface Profile {
  dong: string;
  ho: string;
  phone: string;
  hasDoorCode: boolean;
}

export function OrderWizard({
  catalog,
  initialKind,
  pickupDate,
  profile,
}: {
  catalog: CatalogModel[];
  initialKind: Category | null;
  pickupDate: string;
  profile: Profile;
}) {
  const router = useRouter();
  const firstStep = initialKind ? 1 : 0;
  const [step, setStep] = useState(firstStep);
  const [kind, setKind] = useState<Category | null>(initialKind);
  const [brand, setBrand] = useState<string | null>(null);
  const [custom, setCustom] = useState<null | "brand" | "model">(null);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [model, setModel] = useState<CatalogModel | null>(null);
  const [option, setOption] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [age, setAge] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [phone, setPhone] = useState(profile.phone);
  const [doorCode, setDoorCode] = useState("");
  const [changeDoor, setChangeDoor] = useState(!profile.hasDoorCode);
  const [agree, setAgree] = useState(false);
  const [bq, setBq] = useState("");
  const [mq, setMq] = useState("");
  const [error, setError] = useState<{ message: string; field?: RuleField } | null>(null);
  const [pending, start] = useTransition();

  const brands = useMemo(() => (kind ? brandsOf(catalog, kind) : []), [catalog, kind]);
  const models = useMemo(
    () =>
      catalog
        .filter((m) => m.category === kind && m.brand === brand)
        .filter((m) => !mq.trim() || m.name.toLowerCase().includes(mq.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true })),
    [catalog, kind, brand, mq],
  );

  const price = model ? (model.options.length ? model.options.find((o) => o.label === option)?.price ?? null : model.price) : null;
  const brandName = custom === "brand" ? customBrand.trim() : brand ?? "";
  const modelName = custom ? customModel.trim() : model?.name ?? "";

  // 단계마다 브라우저 기록을 남겨서, 휴대폰의 뒤로 가기(스와이프)도 한 단계씩 돌아가게 한다
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, wizardStep: firstStep }, "");
    const onPop = (e: PopStateEvent) => {
      const s = e.state?.wizardStep;
      if (typeof s === "number") {
        setStep(s);
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [firstStep]);

  const go = (n: number, keepError = false) => {
    if (!keepError) setError(null);
    setStep(n);
    window.history.pushState({ ...window.history.state, wizardStep: n }, "");
    window.scrollTo({ top: 0 });
  };

  const canNext = (() => {
    if (step === 2) return !!custom && !!customModel.trim() && (custom !== "brand" || !!customBrand.trim());
    if (step === 3) return symptoms.length > 0 && (!model || !model.options.length || !!option);
    if (step === 4) return isValidPhone(phone) && (!changeDoor || doorCode.trim().length > 0) && agree;
    return true;
  })();

  function submit() {
    if (!kind) return;
    setError(null);
    start(async () => {
      const res = await submitOrder({
        category: kind,
        brand: brandName,
        modelId: custom ? null : model?.id ?? null,
        customModel: custom ? customModel : null,
        optionLabel: option,
        symptoms,
        usageAge: age,
        memo,
        phone,
        doorCode: changeDoor ? doorCode : "",
        packagingAgreed: agree,
      });
      if (res?.error) setError({ message: res.error, field: res.field });
      else router.refresh();
    });
  }

  const back = () => {
    if (step <= firstStep) return router.push("/");
    setError(null);
    window.history.back();
  };

  return (
    <div className="wizard" style={{ display: "contents" }}>
      <header className="appbar">
        <button type="button" className="back" onClick={back} aria-label="이전">
          ‹
        </button>
        <span className="title">{STEPS[step]}</span>
        <span className="sub mono">
          {step + 1} / {STEPS.length}
        </span>
      </header>
      <main className="content">
        <div className="steps" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? "on" : ""} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 className="h2">어떤 청소기 배터리를 바꿀까요?</h1>
            <div className="kinds">
              {(["cordless", "robot"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="kind"
                  onClick={() => {
                    setKind(k);
                    setBrand(null);
                    setModel(null);
                    setCustom(null);
                    go(1);
                  }}
                >
                  <KindIcon kind={k} />
                  <div>
                    <b>{CATEGORY_LABEL[k]}</b>
                    <span>
                      {k === "cordless" ? "스틱형·핸디형 무선청소기" : "로봇청소기·물걸레 로봇"} ·{" "}
                      {catalog.filter((m) => m.category === k).length}개 모델
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="info">파크리오 단지 안에서 수거하고 배송해요. 수거는 월~목, 배송은 월~토 {VISIT_WINDOW}에 해요.</div>
          </>
        )}

        {step === 1 && kind && (
          <>
            <h1 className="h2">제조사를 골라 주세요</h1>
            <input className="search" type="search" placeholder="제조사 검색" value={bq} onChange={(e) => setBq(e.target.value)} aria-label="제조사 검색" />
            <div className="brands">
              {brands
                .filter(([b]) => !bq.trim() || b.toLowerCase().includes(bq.trim().toLowerCase()))
                .map(([b, n]) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBrand(b);
                      setCustom(null);
                      setModel(null);
                      setOption(null);
                      setMq("");
                      go(2);
                    }}
                  >
                    <b>{b}</b>
                    <span>{n}개 모델</span>
                  </button>
                ))}
            </div>
            <button
              type="button"
              className="item alt"
              onClick={() => {
                setBrand(null);
                setModel(null);
                setOption(null);
                setCustom("brand");
                go(2);
              }}
            >
              <span className="nm">
                찾는 제조사가 없어요
                <br />
                <small>제조사와 모델명을 적어 주시면 교체 가능한지 확인해 드려요</small>
              </span>
              <span>›</span>
            </button>
          </>
        )}

        {step === 2 && kind && !custom && brand && (
          <>
            <h1 className="h2">{brand} 모델을 골라 주세요</h1>
            <p className="lead">본체나 배터리 뒷면 스티커에 적힌 모델명을 확인해 보세요.</p>
            <input
              className="search"
              type="search"
              placeholder={`모델명 검색 (예: ${kind === "cordless" ? "V10, ZB3, A9" : "S7, T9, 제트봇"})`}
              value={mq}
              onChange={(e) => setMq(e.target.value)}
              aria-label="모델명 검색"
            />
            <div className="list">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="item"
                  onClick={() => {
                    setModel(m);
                    setOption(m.options[0]?.label ?? null);
                    go(3);
                  }}
                >
                  <span className="nm">{m.name}</span>
                  <span className="pr">
                    {formatWon(minPrice(m))}
                    {m.options.length > 1 && <small>부터</small>}
                  </span>
                </button>
              ))}
              {!models.length && <p className="muted small" style={{ textAlign: "center", padding: 12 }}>검색 결과가 없어요.</p>}
            </div>
            <button
              type="button"
              className="item alt"
              onClick={() => {
                setModel(null);
                setOption(null);
                setCustom("model");
              }}
            >
              <span className="nm">
                목록에 없거나 모델명을 모르겠어요
                <br />
                <small>적어 주시면 확인하고 견적을 알려 드려요</small>
              </span>
              <span>›</span>
            </button>
          </>
        )}

        {step === 2 && custom && (
          <>
            <h1 className="h2">모델 정보를 적어 주세요</h1>
            <p className="lead">교체할 수 있는지 확인하고 견적을 카카오톡과 앱으로 알려 드려요. 견적을 확인한 뒤에 입금하시면 돼요.</p>
            {custom === "brand" ? (
              <label className="field">
                제조사
                <input value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="예: 보쉬" maxLength={40} />
              </label>
            ) : (
              <div className="card flat">
                <span className="small muted">제조사</span>
                <b>{brand}</b>
              </div>
            )}
            <label className="field">
              모델명
              <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="스티커에 적힌 모델명. 모르면 '모름'" maxLength={120} />
            </label>
          </>
        )}

        {step === 3 && kind && (
          <>
            <div className="card flat">
              <span className="small muted">
                {CATEGORY_LABEL[kind]} · {brandName}
              </span>
              <b>{modelName}</b>
            </div>
            {model && model.options.length > 0 && (
              <>
                <div className="label">배터리 용량</div>
                <div className="opts">
                  {model.options.map((o, i) => (
                    <label className="opt" key={o.label}>
                      <input type="radio" name="cap" checked={option === o.label} onChange={() => setOption(o.label)} />
                      <span>
                        {o.label}
                        {i === model.options.length - 1 && model.options.length > 1 && <small>사용 시간이 더 길어요</small>}
                      </span>
                      <span className="x">{formatWon(o.price)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="label">어떤 증상인가요? (여러 개 선택)</div>
            <div className="chips">
              {SYMPTOMS.map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={symptoms.includes(s)}
                    onChange={(e) => setSymptoms((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))}
                  />
                  {s}
                </label>
              ))}
            </div>
            {symptoms.includes(SWOLLEN) && (
              <div className="alert">
                <b>바로 충전을 멈춰 주세요.</b> 부푼 배터리는 화재 위험이 있어요. 신청 후 수거 방법을 따로 안내해 드려요.
              </div>
            )}
            <div className="label">사용한 기간</div>
            <div className="chips">
              {USAGE_AGES.map((a) => (
                <label key={a}>
                  <input type="radio" name="age" checked={age === a} onChange={() => setAge(a)} />
                  {a}
                </label>
              ))}
            </div>
            {model?.protectCircuitFee && (
              <div className="info">
                이 모델은 진단 결과 보호회로 교체가 필요하면 {formatWon(model.protectCircuitFee)}이 추가돼요. 교체 전에 먼저 연락드려요.
              </div>
            )}
            <label className="field">
              더 알려 주실 내용 (선택)
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={500} placeholder="예: 완충해도 5분이면 꺼져요" />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="h2">수거 정보를 알려 주세요</h1>
            <div className="card flat">
              <div className="row">
                <span className="small muted">수거·배송 주소</span>
                <b>
                  파크리오 {profile.dong}동 {profile.ho}호
                </b>
              </div>
            </div>
            {profile.hasDoorCode && !changeDoor ? (
              <div className="card flat">
                <div className="row">
                  <span className="small muted">공동현관 비밀번호</span>
                  <span>저장된 번호 사용</span>
                </div>
                <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => setChangeDoor(true)}>
                  번호가 바뀌었어요
                </button>
              </div>
            ) : (
              <label className="field">
                공동현관 비밀번호
                <input type="password" autoComplete="off" placeholder="예: 1234#" value={doorCode} maxLength={30} onChange={(e) => setDoorCode(e.target.value)} />
                <span className="small">암호화해서 저장하고, 수거·배송하는 운영자만 확인해요.</span>
              </label>
            )}
            <label className="field">
              연락처
              <input type="tel" inputMode="tel" placeholder="010-1234-5678" value={phone} maxLength={16} onChange={(e) => setPhone(e.target.value)} />
              {phone.trim() && !isValidPhone(phone) && <span className="small" style={{ color: "var(--danger)" }}>휴대폰 번호 10~11자리를 적어 주세요.</span>}
            </label>
            <div className="card accent">
              <div className="row">
                <b>수거 예정</b>
                <span className="badge">{custom ? "견적 확인 후" : "입금 후"}</span>
              </div>
              <span>
                {custom ? "견적을 확인하고 입금하면 수거일을 알려 드려요" : `${formatDay(pickupDate)} ${VISIT_WINDOW}`}
              </span>
              <span className="small muted">18시 전에 입금이 확인되면 그날 수거해요. 18시가 지나면 다음 수거일(월~목)에 가요.</span>
            </div>
            <label className="agree">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                <b>포장 안내를 확인했어요</b>
                <span className="small muted" style={{ display: "block" }}>
                  제품을 박스에 넣어 직접 포장한 뒤 문 앞에 두세요. 포장이 부실해 배송 중 생긴 파손은 책임지지 않아요.
                </span>
              </span>
            </label>
          </>
        )}

        {step === 5 && kind && (
          <>
            <h1 className="h2">신청 내용을 확인해 주세요</h1>
            <div className="card flat">
              <div className="row">
                <span className="small muted">
                  {CATEGORY_LABEL[kind]} · {brandName}
                </span>
                <button type="button" className="btn sm ghost" onClick={() => go(custom ? 2 : 3)}>
                  수정
                </button>
              </div>
              <b>{modelName}</b>
              {option && <span className="small">{option}</span>}
              <span className="small muted">
                {symptoms.join(", ")}
                {age ? ` · ${age}` : ""}
              </span>
            </div>
            <div className="bill">
              <div>
                <span>배터리 교체</span>
                <span>{price != null ? formatWon(price) : "견적 후 안내"}</span>
              </div>
              <div className="m">
                <span>수거·배송</span>
                <span>포함</span>
              </div>
              <div className="m">
                <span>품질검사·3개월 보증</span>
                <span>포함</span>
              </div>
              <div className="tot">
                <span>결제 금액</span>
                <span>{price != null ? formatWon(price) : "견적 후 안내"}</span>
              </div>
            </div>
            <div className="bill">
              <div className="row">
                <b className="small">수거 정보</b>
                <button type="button" className="btn sm ghost" onClick={() => go(4)}>
                  수정
                </button>
              </div>
              <div>
                <span className="m">주소</span>
                <span>
                  파크리오 {profile.dong}동 {profile.ho}호
                </span>
              </div>
              <div>
                <span className="m">연락처</span>
                <span>{phone}</span>
              </div>
              <div>
                <span className="m">수거</span>
                <span>{custom ? "견적 확인 후" : `${formatDay(pickupDate)} ${VISIT_WINDOW}`}</span>
              </div>
              <div>
                <span className="m">결제</span>
                <span>계좌이체</span>
              </div>
            </div>
            <div className="info">
              {custom
                ? "신청하면 모델을 확인한 뒤 견적과 입금 계좌를 알려 드려요."
                : "신청하면 바로 입금 계좌를 알려 드려요. 교체가 불가능하면 전액 환불하고 무료로 돌려드려요."}
            </div>
          </>
        )}

        {error && (
          <div className="alert err stack" role="alert" style={{ gap: 8 }}>
            <b>{error.message}</b>
            {error.field && FIELD_STEP[error.field] !== step && (
              <button type="button" className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={() => go(FIELD_STEP[error.field!], true)}>
                고치러 가기
              </button>
            )}
          </div>
        )}
      </main>

      {step >= 2 && !(step === 2 && !custom) && (
        <div className="wizard-foot">
          {step >= 3 && (
            <div className="row small">
              <span>예상 결제 금액</span>
              <b className="mono">{price != null ? formatWon(price) : "견적 후 안내"}</b>
            </div>
          )}
          <div className="foot-btns">
            <button type="button" className="btn ghost" onClick={back}>
              이전
            </button>
            {step < 5 ? (
              <button type="button" className="btn" disabled={!canNext} onClick={() => go(step + 1)}>
                다음
              </button>
            ) : (
              <button type="button" className="btn" disabled={pending} onClick={submit}>
                {pending ? "신청하는 중…" : custom ? "견적 요청하기" : "신청하고 입금 계좌 받기"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
