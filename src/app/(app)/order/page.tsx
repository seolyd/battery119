import { OrderWizard } from "@/components/OrderWizard";
import { requireUser } from "@/lib/auth";
import { toCatalog } from "@/lib/catalog";
import { pickupDateFor } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const session = await requireUser(kind ? `/order?kind=${kind}` : "/order");
  const store = getStore();
  const [models, closed] = await Promise.all([store.listModels({ activeOnly: true }), store.listClosedDates()]);
  const c = session.customer;

  return (
    <OrderWizard
      catalog={toCatalog(models)}
      initialKind={kind === "cordless" || kind === "robot" ? kind : null}
      pickupDate={pickupDateFor(new Date(), closed)}
      // 저장된 공동현관 비밀번호는 화면으로 보내지 않고, 있는지만 알려 준다
      profile={{ dong: c.dong, ho: c.ho, phone: c.phone ?? "", hasDoorCode: !!c.doorCodeEnc }}
    />
  );
}
