import { OrderWizard } from "@/components/OrderWizard";
import { requireUser } from "@/lib/auth";
import { toCatalog } from "@/lib/catalog";
import { decryptDoorCode } from "@/lib/crypto";
import { pickupDateFor } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const session = await requireUser(kind ? `/order?kind=${kind}` : "/order");
  const store = getStore();
  const [models, closed] = await Promise.all([store.listModels({ activeOnly: true }), store.listClosedDates()]);
  const c = session.customer;
  let doorCode = "";
  try {
    doorCode = c.doorCodeEnc ? decryptDoorCode(c.doorCodeEnc) : "";
  } catch {
    doorCode = "";
  }

  return (
    <OrderWizard
      catalog={toCatalog(models)}
      initialKind={kind === "cordless" || kind === "robot" ? kind : null}
      pickupDate={pickupDateFor(new Date(), closed)}
      profile={{ dong: c.dong ?? "", ho: c.ho ?? "", phone: c.phone ?? "", doorCode }}
    />
  );
}
