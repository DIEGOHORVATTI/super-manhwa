"use client";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/Icon";
import { Select } from "@/components/Select";
import { Button } from "@/components/ui/Button";
import { rpc } from "@/lib/rpc/client";

interface Affiliate {
  id: number;
  code: string;
  pixKey: string | null;
  ratePct: number;
  name: string | null;
  handle: string | null;
  referrals: number;
  conversions: number;
  pendingCents: number;
  paidCents: number;
}
interface Kpis {
  affiliates: number;
  referrals: number;
  conversions: number;
  convRate: number;
  pendingCents: number;
  paidCents: number;
}
interface Data {
  kpis: Kpis;
  affiliates: Affiliate[];
  periods: string[];
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

const monthLabel = (p: string) => {
  const [y, m] = p.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

/** Affiliate dashboard: KPIs, month filter, per-affiliate breakdown + payouts. */
export function AdminAffiliates() {
  const [data, setData] = useState<Data | null>(null);
  const [period, setPeriod] = useState("");

  async function load(p: string) {
    try {
      setData(await rpc.affiliate.adminList(p ? { period: p } : {}));
    } catch {
      setData({
        kpis: {
          affiliates: 0,
          referrals: 0,
          conversions: 0,
          convRate: 0,
          pendingCents: 0,
          paidCents: 0,
        },
        affiliates: [],
        periods: [],
      });
    }
  }
  useEffect(() => {
    void load(period);
  }, [period]);

  async function pay(affiliateId: number) {
    await rpc.affiliate.markPaid({ affiliateId, ...(period ? { period } : {}) });
    await load(period);
  }

  if (!data) return <p className="muted">Carregando…</p>;

  const kpiCards: Array<{ label: string; value: string; icon: IconName }> = [
    { label: "Afiliados", value: String(data.kpis.affiliates), icon: "users" },
    { label: "Indicações", value: String(data.kpis.referrals), icon: "link-2" },
    { label: "Conversões", value: String(data.kpis.conversions), icon: "circle-check-big" },
    { label: "Taxa de conversão", value: `${data.kpis.convRate}%`, icon: "trending-up" },
    { label: "A pagar", value: brl(data.kpis.pendingCents), icon: "coins" },
    { label: "Pago", value: brl(data.kpis.paidCents), icon: "circle-check-big" },
  ];

  return (
    <>
      <header className="admin-page-head admin-head-row">
        <div>
          <h1 className="settings-title">Afiliados</h1>
          <p className="muted">Indicações, comissões e pagamentos.</p>
        </div>
        <Select
          aria-label="Filtrar por mês"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "", label: "Todo o período" },
            ...data.periods.map((p) => ({ value: p, label: monthLabel(p) })),
          ]}
        />
      </header>

      <div className="admin-kpis">
        {kpiCards.map((k) => (
          <div key={k.label} className="admin-kpi">
            <span className="admin-kpi-icon">
              <Icon name={k.icon} size={20} />
            </span>
            <span className="admin-kpi-value">{k.value}</span>
            <span className="admin-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <h2 className="admin-section-title">Por afiliado</h2>
      <div className="admin-table">
        {data.affiliates.length === 0 && <p className="muted">Nenhum afiliado ainda.</p>}
        {data.affiliates.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{r.name ?? r.code}</strong>
              <span className="muted">
                ?ref={r.code} · {r.ratePct}% · Pix: {r.pixKey || "—"}
              </span>
              <div className="affiliate-metrics">
                <span>
                  <Icon name="link-2" size={13} /> {r.referrals} indicações
                </span>
                <span>
                  <Icon name="circle-check-big" size={13} /> {r.conversions} conversões
                </span>
                <span className="affiliate-pending">A pagar: {brl(r.pendingCents)}</span>
                <span className="muted">Pago: {brl(r.paidCents)}</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon="coins"
              disabled={r.pendingCents <= 0}
              onClick={() => pay(r.id)}
            >
              Marcar pago
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
