"use client";

import { useEffect, useState } from "react";
import {
  listShippingZonesAdminAction,
  saveMethodProvincesAction,
} from "./zones-actions";
import { IRAN_PROVINCES } from "@/lib/iran-provinces";

type Method = {
  id: string;
  title: string;
  provider_code: string | null;
  is_active: boolean;
};
type Loc = { id: string; zone_id: string; province: string; city: string | null };
type Link = { method_id: string; zone_id: string };

export function ShippingZonesForm() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [_locations, setLocations] = useState<Loc[]>([]);
  const [_links, setLinks] = useState<Link[]>([]);
  /** methodId → set of selected province names */
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    const res = await listShippingZonesAdminAction();
    setLoading(false);
    if (!res.ok) {
      setErr("بارگذاری ناموفق بود");
      return;
    }
    const ms = (res.methods ?? []) as Method[];
    const locs = (res.locations ?? []) as Loc[];
    const lks = (res.links ?? []) as Link[];
    setMethods(ms);
    setLocations(locs);
    setLinks(lks);

    // از لینک‌ها و لوکیشن‌ها، استان‌های هر روش را بساز
    const next: Record<string, string[]> = {};
    for (const m of ms) {
      const zoneIds = lks
        .filter((l) => l.method_id === m.id)
        .map((l) => l.zone_id);
      if (!zoneIds.length) {
        next[m.id] = []; // خالی = کل ایران
        continue;
      }
      const provs = [
        ...new Set(
          locs
            .filter((loc) => zoneIds.includes(loc.zone_id))
            .map((loc) => loc.province)
            .filter(Boolean),
        ),
      ];
      next[m.id] = provs;
    }
    setSelected(next);
  }

  useEffect(() => {
    void reload();
  }, []);

  function toggle(methodId: string, province: string) {
    setSelected((prev) => {
      const cur = new Set(prev[methodId] ?? []);
      if (cur.has(province)) cur.delete(province);
      else cur.add(province);
      return { ...prev, [methodId]: [...cur] };
    });
  }

  function selectAll(methodId: string) {
    setSelected((prev) => ({
      ...prev,
      [methodId]: [...IRAN_PROVINCES],
    }));
  }

  function selectNone(methodId: string) {
    setSelected((prev) => ({ ...prev, [methodId]: [] }));
  }

  async function save(methodId: string) {
    setSavingId(methodId);
    setMsg(null);
    setErr(null);
    const provinces = selected[methodId] ?? [];
    // اگر همه ۳۱ استان تیک خورده = معادل کل ایران (بدون محدودیت)
    const payload =
      provinces.length >= IRAN_PROVINCES.length ? [] : provinces;
    const res = await saveMethodProvincesAction(methodId, payload);
    setSavingId(null);
    if (!res.ok) {
      setErr("ذخیره ناموفق بود");
      return;
    }
    setMsg(
      payload.length === 0
        ? "ذخیره شد: ارسال به کل ایران"
        : `ذخیره شد: ${payload.length} استان`,
    );
    await reload();
  }

  if (loading) {
    return (
      <div className="border-border rounded-xl border p-4 text-sm" dir="rtl">
        در حال بارگذاری پوشش جغرافیایی…
      </div>
    );
  }

  return (
    <div className="border-border space-y-6 rounded-xl border p-4" dir="rtl">
      <div>
        <h2 className="font-semibold">پوشش جغرافیایی ارسال</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-6">
          برای هر روش ارسال، استان‌هایی که می‌خواهید فعال باشند را تیک بزنید.
          <br />
          اگر هیچ استانی تیک نخورد (یا همه تیک بخورد) = ارسال به{" "}
          <strong>کل ایران</strong>.
        </p>
      </div>

      {methods.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          هنوز روش ارسالی تعریف نشده است.
        </p>
      ) : (
        methods.map((m) => {
          const list = selected[m.id] ?? [];
          const all =
            list.length === 0 || list.length >= IRAN_PROVINCES.length;
          return (
            <div
              key={m.id}
              className="border-border space-y-3 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {m.title}
                    {!m.is_active ? (
                      <span className="text-muted-foreground mr-2 text-xs">
                        (غیرفعال)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {all
                      ? "پوشش: کل ایران"
                      : `پوشش: ${list.length} استان انتخاب‌شده`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectAll(m.id)}
                    className="border-border rounded-lg border px-2 py-1 text-[11px]"
                  >
                    همه
                  </button>
                  <button
                    type="button"
                    onClick={() => selectNone(m.id)}
                    className="border-border rounded-lg border px-2 py-1 text-[11px]"
                  >
                    هیچ‌کدام (= کل ایران)
                  </button>
                  <button
                    type="button"
                    disabled={savingId === m.id}
                    onClick={() => void save(m.id)}
                    className="bg-primary text-primary-foreground rounded-lg px-3 py-1 text-[11px] disabled:opacity-50"
                  >
                    {savingId === m.id ? "…" : "ذخیره"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {IRAN_PROVINCES.map((p) => {
                  const checked =
                    list.length === 0
                      ? false
                      : list.includes(p);
                  return (
                    <label
                      key={p}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0"
                        checked={checked}
                        onChange={() => toggle(m.id, p)}
                      />
                      <span>{p}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}
    </div>
  );
}
