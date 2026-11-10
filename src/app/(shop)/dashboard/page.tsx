"use client";

import nextDynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { LumaSpin } from "@/components/ui/luma-spin";
import { EmptyBlock } from "@/components/ui/ui-state-blocks";
import { CustomerDashboardShell } from "@/components/ui/dashboard-sidebar";
import { toast } from "@/lib/toaster";
import { createClient } from "@/lib/supabase/client";
import { useShopStore } from "@/lib/shop-store";
import { useServerCartStore } from "@/lib/server-cart-store";
import { cn } from "@/lib/utils";
import { normalizeIranMobile } from "@/lib/numbers";
import { useNotifications } from "@/lib/notifications/use-notifications";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/dates/jalali";
import { iranPostTrackingUrl } from "@/lib/iran-provinces";
import { createTestNotificationAction } from "@/app/(shop)/actions/notifications";
import {
  getCartAction,
  removeCartItemAction,
  updateCartQuantityAction,
  listMyOrdersAction,
  reorderOrderAction,
  getMyProfileAction,
  updateMyProfileAction,
  updateMyEmailAction,
  deleteMyAccountAction,
  listMyAddressesAction,
  listActiveDiscountsAction,
  listShopProductsAction,
  trackOrderAction,
  createMyAddressAction,
  updateMyAddressAction,
  deleteMyAddressAction,
  setDefaultAddressAction,
  listWishlistAction,
  toggleWishlistAction,
  filterLiveProductIdsAction,
  getLiveRecentlyViewedAction,
  type CartLineDTO,
} from "@/app/(shop)/actions/shop";
import {
  listMyTicketsAction,
  createTicketAction,
  listTicketMessagesAction,
  replyTicketAction,
} from "@/app/(shop)/actions/support";
import {
  listMyReturnsAction,
  createReturnAction,
} from "@/app/(shop)/actions/returns";
import { cancelMyOrderAction } from "@/app/(shop)/actions/orders-customer";
import {
  changeMyPasswordAction,
  resendEmailVerificationAction,
  listMySessionsAction,
  revokeMySessionAction,
  signOutOtherDevicesAction,
} from "@/app/(shop)/actions/auth";

const ProductCard = nextDynamic(
  () => import("@/components/product/product-card").then((m) => m.ProductCard),
  { ssr: false, loading: () => null },
);

const ComposerInput = nextDynamic(
  () => import("@/components/ui/composer-input").then((m) => m.ComposerInput),
  { ssr: false, loading: () => null },
);


const TABS = [
  { id: "shop", label: "فروشگاه" },
  { id: "cart", label: "سبد خرید" },
  { id: "orders", label: "سفارش‌ها" },
  { id: "track", label: "پیگیری" },
  { id: "wishlist", label: "علاقه‌مندی‌ها" },
  { id: "compare", label: "مقایسه" },
  { id: "recent", label: "بازدید اخیر" },
  { id: "addresses", label: "آدرس‌ها" },
  { id: "coupons", label: "کد تخفیف" },
  { id: "tickets", label: "پشتیبانی" },
  { id: "returns", label: "بازگشت کالا" },
  { id: "notifications", label: "اعلان‌ها" },
  { id: "profile", label: "پروفایل" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BuyerDashboardPage() {
  const [tab, setTab] = useState<TabId>("cart");
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("tab");
    if (!q) return;
    const allowed = TABS.map((x) => x.id) as string[];
    if (allowed.includes(q)) setTab(q as TabId);
  }, [searchParams]);
  const [authChecked, setAuthChecked] = useState(false);
  const [authOk, setAuthOk] = useState(false);
  const router = useRouter();
  const serverLines = useServerCartStore((s) => s.lines);
  const refreshServerCart = useServerCartStore((s) => s.refresh);
  // سازگاری با UI قبلی
  const serverCart = serverLines as unknown as CartLineDTO[];
  const setServerCart = (updater: CartLineDTO[] | ((prev: CartLineDTO[]) => CartLineDTO[])) => {
    const state = useServerCartStore.getState();
    const prev = state.lines as unknown as CartLineDTO[];
    const next = typeof updater === "function" ? updater(prev) : updater;
    state.setLines(next as unknown as import("@/lib/server-cart-store").ServerCartLine[]);
  };
  const [cartLoading, setCartLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reorderBusy, setReorderBusy] = useState<string | null>(null);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [activeDiscounts, setActiveDiscounts] = useState<
    { code: string; type: string; value: number; min_order_amount?: number | null; ends_at?: string | null }[]
  >([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [sessions, setSessions] = useState<
    {
      id: string;
      session_label: string | null;
      user_agent: string | null;
      ip_address: string | null;
      created_at: string;
      last_seen_at: string;
      revoked_at: string | null;
    }[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionRevokeBusy, setSessionRevokeBusy] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const displayName = profileForm.phone?.trim() || profileForm.full_name?.trim() || "حساب من";
  const notif = useNotifications(authOk && tab === "notifications");
  const [serverWishlist, setServerWishlist] = useState<
    { productId: string; title: string; slug: string; price: number; image?: string }[]
  >([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [addressesList, setAddressesList] = useState<
    {
      id: string;
      title: string | null;
      full_name: string;
      phone: string;
      province: string | null;
      city: string;
      address_line: string;
      postal_code: string | null;
      is_default: boolean;
    }[]
  >([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrForm, setAddrForm] = useState({
    title: "",
    full_name: "",
    phone: "",
    province: "",
    city: "",
    address_line: "",
    postal_code: "",
    is_default: false,
  });
  const [addrMsg, setAddrMsg] = useState<string | null>(null);
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [trackCode, setTrackCode] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<{
    id: string;
    status: string;
    total_amount: number;
    shipping_city?: string | null;
    tracking_number?: string | null;
    created_at?: string;
    items?: { id: string; title: string; weight_name?: string | null; quantity: number }[];
  } | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);



  async function loadWishlist() {
    setWishlistLoading(true);
    try {
      const res = await listWishlistAction();
      if (res.ok) setServerWishlist(res.items);
      else setServerWishlist([]);
    } finally {
      setWishlistLoading(false);
    }
  }


  const cart = useShopStore((s) => s.cart);
  const wishlist = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const recent = useShopStore((s) => s.recentlyViewed);

  // بازدید اخیر: داده واقعی از سرور — محصول حذف‌شده نمایش داده نمی‌شود
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const list = useShopStore.getState().recentlyViewed || [];
      if (!list.length) return;
      const ids = list.map((x) => x.id).filter(Boolean);
      void getLiveRecentlyViewedAction(ids).then((res) => {
        if (!res.ok) return;
        const liveById = new Map(res.items.map((x) => [x.id, x]));
        const next = ids
          .map((id) => liveById.get(id))
          .filter((x): x is NonNullable<typeof x> => x != null)
          .map((x) => ({
            id: x.id,
            title: x.title,
            price: x.price,
            image: x.image,
            brand: x.brand,
            href: x.href,
          }));
        useShopStore.setState({ recentlyViewed: next });
        try {
          localStorage.setItem("pm-recently-viewed", JSON.stringify(next));
        } catch {}
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);

  const removeFromCart = useShopStore((s) => s.removeFromCart);
  const toggleWishlist = useShopStore((s) => s.toggleWishlist);
  const toggleCompare = useShopStore((s) => s.toggleCompare);


  
  const [ticketItems, setTicketItems] = useState<
    { id: string; subject: string; status: string; created_at: string }[]
  >([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketMsgs, setTicketMsgs] = useState<
    { id: string; body: string; is_staff: boolean; created_at: string }[]
  >([]);
  const [returnItems, setReturnItems] = useState<
    { id: string; order_id: string; reason: string; status: string; admin_note?: string | null; created_at: string }[]
  >([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnOrderOptions, setReturnOrderOptions] = useState<
    { id: string; label: string }[]
  >([]);

useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session?.user) {
          setAuthChecked(true);
          setAuthOk(false);
          router.replace("/ورود?next=/dashboard");
          return;
        }
        setAuthOk(true);
        setAuthChecked(true);
        // پروفایل پس‌زمینه برای نمایش شماره
        void getMyProfileAction().then((res) => {
          if (cancelled || !res.ok) return;
          setProfileForm({
            full_name: res.profile.full_name ?? "",
            phone: res.profile.phone ?? "",
          });
          setProfileEmail(res.email);
          setEmailDraft(res.email ?? "");
        });
      } catch {
        if (!cancelled) {
          setAuthChecked(true);
          setAuthOk(false);
          router.replace("/ورود?next=/dashboard");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (tab !== "cart") return;
    let cancelled = false;
    (async () => {
      setCartLoading(true);
      await refreshServerCart();
      if (!cancelled) setCartLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, refreshServerCart]);

  useEffect(() => {
    if (tab !== "orders") return;
    setOrdersLoading(true);
    (async () => {
      const res = await listMyOrdersAction();
      if (res.ok) setMyOrders(res.items);
      setOrdersLoading(false);
    })();
  }, [tab]);

  useEffect(() => {
    function onOrders() {
      if (tab !== "orders") return;
      void (async () => {
        const res = await listMyOrdersAction();
        if (res.ok) setMyOrders(res.items);
      })();
    }
    window.addEventListener("pm:orders-changed", onOrders);
    return () => window.removeEventListener("pm:orders-changed", onOrders);
  }, [tab]);

  // پیگیری زنده: وقتی ادمین وضعیت/رهگیری را عوض کند
  useEffect(() => {
    function onOrdersLive() {
      if (tab === "orders") {
        void (async () => {
          const res = await listMyOrdersAction();
          if (res.ok) setMyOrders(res.items);
        })();
      }
      if (trackResult?.id) {
        void (async () => {
          const res = await trackOrderAction(trackResult.id);
          if (res.ok) setTrackResult(res.order as any);
        })();
      }
    }
    window.addEventListener("pm:orders-changed", onOrdersLive);
    return () => window.removeEventListener("pm:orders-changed", onOrdersLive);
  }, [tab, trackResult?.id]);

  useEffect(() => {
    if (!trackResult?.id) return;
    const iv = window.setInterval(() => {
      void (async () => {
        const res = await trackOrderAction(trackResult.id);
        if (res.ok) setTrackResult(res.order as any);
      })();
    }, 15000);
    return () => window.clearInterval(iv);
  }, [trackResult?.id]);


  useEffect(() => {
    if (tab !== "coupons") return;
    setCouponsLoading(true);
    (async () => {
      const res = await listActiveDiscountsAction();
      if (res.ok) setActiveDiscounts(res.items as typeof activeDiscounts);
      else setActiveDiscounts([]);
      setCouponsLoading(false);
    })();
  }, [tab]);


  useEffect(() => {
    if (tab !== "profile") return;
    setProfileLoading(true);
    setProfileMsg(null);
    (async () => {
      const res = await getMyProfileAction();
      if (res.ok) {
        setProfileForm({
          full_name: res.profile.full_name ?? "",
          phone: res.profile.phone ?? "",
        });
        setProfileEmail(res.email);
        setEmailDraft(res.email ?? "");
      }
      setProfileLoading(false);
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== "profile") return;
    let cancelled = false;
    (async () => {
      setSessionsLoading(true);
      const res = await listMySessionsAction();
      if (!cancelled) {
        setSessions(res.ok ? (res.items as typeof sessions) : []);
        setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);


  useEffect(() => {
    if (tab !== "wishlist") return;
    void loadWishlist();
  }, [tab]);

  useEffect(() => {
    if (tab !== "addresses") return;
    setAddrLoading(true);
    (async () => {
      const res = await listMyAddressesAction();
      if (res.ok) setAddressesList(res.items as typeof addressesList);
      else setAddressesList([]);
      setAddrLoading(false);
    })();
  }, [tab]);

  useEffect(() => {
    if (tab !== "shop") return;
    setShopLoading(true);
    (async () => {
      const res = await listShopProductsAction();
      if (res.ok) setShopProducts(res.products as any[]);
      else setShopProducts([]);
      setShopLoading(false);
    })();
  }, [tab]);



  useEffect(() => {
    function onWish() {
      void loadWishlist();
    }
    window.addEventListener("pm:wishlist-changed", onWish);
    return () => window.removeEventListener("pm:wishlist-changed", onWish);
  }, []);




  const counts = useMemo(
    () => ({
      cart: serverCart.length > 0 ? serverCart.reduce((n, l) => n + (l.quantity || 1), 0) : cart.reduce((n, l) => n + (l.quantity ?? 1), 0),
      wishlist: serverWishlist.length > 0 ? serverWishlist.length : wishlist.length,
      compare: compare.length,
      recent: recent.length,
    }),
    [serverCart, cart, wishlist, serverWishlist, compare, recent]
  );

  async function handleRemoveServerCart(line: CartLineDTO) {
    setRemovingId(line.variantId);
    try {
      const res = await removeCartItemAction(line.variantId);
      if (res.ok) {
                          toast.success("از سبد حذف شد");
        setServerCart((prev) =>
          prev.filter((x) => x.variantId !== line.variantId)
        );
        removeFromCart(line.productId, {
          roast: line.roast,
          weight: line.weight,
        });
        window.dispatchEvent(new CustomEvent("pm:cart-changed"));
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function handleUpdateQty(line: CartLineDTO, next: number) {
    if (next < 1) return;
    setServerCart((prev) =>
      prev.map((x) =>
        x.variantId === line.variantId ? { ...x, quantity: next } : x
      )
    );
    const res = await updateCartQuantityAction(line.variantId, next);
    if (!res.ok) {
      await refreshServerCart();
      window.dispatchEvent(new CustomEvent("pm:cart-changed"));
    }
  }



  async function handleRemoveWishlist(productId: string) {
    setServerWishlist((prev) => prev.filter((x) => x.productId !== productId));
    const local = wishlist.find((w) => w.id === productId);
    if (local) toggleWishlist(local);
    const res = await toggleWishlistAction(productId);
    if (!res.ok) {
      await loadWishlist();
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pm:wishlist-changed"));
    }
  }


  useEffect(() => {
    if (tab !== "tickets") return;
    let cancelled = false;
    setTicketLoading(true);
    void listMyTicketsAction().then((res) => {
      if (cancelled) return;
      setTicketLoading(false);
      if (res.ok) setTicketItems(res.items as typeof ticketItems);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "returns") return;
    let cancelled = false;
    setReturnLoading(true);
    void Promise.all([listMyReturnsAction(), listMyOrdersAction()]).then(
      ([ret, ord]) => {
        if (cancelled) return;
        setReturnLoading(false);
        if (ret.ok) setReturnItems(ret.items as typeof returnItems);
        if (ord.ok && Array.isArray((ord as { items?: unknown }).items)) {
          const items = (ord as { items: { id: string; status?: string; created_at?: string; total?: number }[] }).items;
          const eligible = items.filter((o) =>
            ["shipped", "delivered"].includes(String(o.status || "")),
          );
          setReturnOrderOptions(
            eligible.map((o) => ({
              id: o.id,
              label: `${o.id.slice(0, 8)}… · ${
                o.status === "shipped"
                  ? "ارسال‌شده"
                  : o.status === "delivered"
                    ? "تحویل‌شده"
                    : (o.status ?? "—")
              } · ${o.created_at ? formatJalaliDate(o.created_at) : ""}`,
            })),
          );
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (!activeTicketId) {
      setTicketMsgs([]);
      return;
    }
    void listTicketMessagesAction(activeTicketId).then((res) => {
      if (res.ok) setTicketMsgs(res.items as typeof ticketMsgs);
    });
  }, [activeTicketId]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center" dir="rtl">
        <LumaSpin />
      </div>
    );
  }

  if (!authOk) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center" dir="rtl">
        <LumaSpin />
      </div>
    );
  }


  return (
    <CustomerDashboardShell
      displayName={displayName}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      title={TABS.find((x) => x.id === tab)?.label ?? "پنل"}
    >
        <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-primary">
              {TABS.find((t) => t.id === tab)?.label}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {tab === "cart" ? (
                <Link
                  href="/checkout"
                  className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-xl px-3 text-xs font-medium"
                >
                  تسویه حساب
                </Link>
              ) : null}
              <Link
                href="/محصولات"
                className="text-primary text-sm hover:underline"
              >
                ادامه خرید
              </Link>
            </div>
          </div>

          {tab === "orders" ? (
            ordersLoading ? (
              <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
            ) : myOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm">هنوز سفارشی ثبت نکرده‌اید.</p>
            ) : (
              <ul className="space-y-4">
                {myOrders.map((o: any) => (
                  <li
                    key={o.id}
                    className="border-border rounded-xl border p-4 text-right"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {(Number(o.total_amount) || 0).toLocaleString("fa-IR")} تومان
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {o.created_at
                          ? formatJalaliDate(o.created_at)
                          : ""}
                        {" · "}
                        {o.status === "pending"
                          ? "در انتظار"
                          : o.status === "paid"
                            ? "پرداخت‌شده"
                            : o.status === "shipped"
                              ? "ارسال‌شده"
                              : o.status === "delivered"
                                ? "تحویل"
                                : o.status === "cancelled"
                                  ? "لغو"
                                  : o.status}
                      </span>
                    </div>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      {(o.order_items ?? []).map((it: any) => (
                        <li key={it.id}>
                          {it.title}
                          {it.weight_name ? ` · ${it.weight_name}` : ""}
                          {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                        </li>
                      ))}
                    </ul>
                    {o.shipping_address ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        ارسال: {o.shipping_name} — {o.shipping_address}
                        {o.shipping_city ? `، ${o.shipping_city}` : ""}
                      </p>
                    ) : null}
                    {o.tracking_number ? (
                      <p className="mt-2 text-xs">
                        <span className="text-muted-foreground">کد رهگیری: </span>
                        <span className="font-mono font-bold" dir="ltr">
                          {o.tracking_number}
                        </span>
                        {o.status === "shipped"
                          ? " · ارسال‌شده"
                          : o.status === "delivered"
                            ? " · تحویل‌شده"
                            : ""}
                        {" · "}
                        <a
                          href={iranPostTrackingUrl(o.tracking_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          پیگیری در پست
                        </a>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={reorderBusy === o.id}
                        className="bg-primary text-primary-foreground h-9 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
                        onClick={async () => {
                          setReorderMsg(null);
                          setReorderBusy(o.id);
                          const res = await reorderOrderAction(o.id);
                          setReorderBusy(null);
                          if (!res.ok) {
                            setReorderMsg(
                              res.error === "none_added"
                                ? "اقلام قابل افزودن نبود (variant حذف‌شده؟)."
                                : res.error === "empty"
                                  ? "این سفارش قلمی ندارد."
                                  : "خرید مجدد ناموفق بود."
                            );
                            return;
                          }
                          setReorderMsg(`${res.added} قلم به سبد اضافه شد.`);
                          window.location.href = "/dashboard?tab=cart";
                        }}
                      >
                        {reorderBusy === o.id ? "…" : "خرید مجدد"}
                      </button>
                      {["pending", "paid", "processing"].includes(String(o.status)) ? (
                        <button
                          type="button"
                          className="border-destructive text-destructive h-9 rounded-lg border px-3 text-xs font-medium"
                          onClick={async () => {
                            if (!confirm("سفارش لغو شود؟")) return;
                            const res = await cancelMyOrderAction(o.id);
                            if (!res.ok) {
                              const map: Record<string, string> = {
                                not_cancellable: "این سفارش دیگر قابل لغو نیست",
                                not_found: "سفارش یافت نشد",
                                login_required: "وارد شوید",
                              };
                              toast.error(map[res.error] || "لغو ناموفق");
                              return;
                            }
                            toast.success("سفارش لغو شد");
                            window.dispatchEvent(new Event("pm:orders-changed"));
                          }}
                        >
                          لغو سفارش
                        </button>
                      ) : null}
                      <span className="text-muted-foreground text-[11px]" dir="ltr">
                        #{String(o.id).slice(0, 8)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : tab === "notifications" ? (
            <div className="space-y-4" dir="rtl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  {notif.unread > 0
                    ? `${notif.unread} اعلان خوانده‌نشده`
                    : "همه اعلان‌ها خوانده شده‌اند"}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() => void notif.markAll()}
                  >
                    خواندن همه
                  </button>
                </div>
              </div>
              {notif.loading ? (
                <div className="flex justify-center py-10"><LumaSpin /></div>
              ) : notif.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">اعلانی نیست.</p>
              ) : (
                <ul className="space-y-2">
                  {notif.items.map((n) => (
                    <li
                      key={n.id}
                      className={`border-border rounded-xl border p-3 text-right ${
                        n.read_at ? "opacity-70" : "bg-primary/5"
                      }`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="text-muted-foreground shrink-0 text-[11px]">
                          {formatJalaliDateTime(n.created_at)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="text-muted-foreground text-xs">{n.body}</p>
                      ) : null}
                      {!n.read_at ? (
                        <button
                          type="button"
                          className="text-primary mt-2 text-xs hover:underline"
                          onClick={() => void notif.markRead(n.id)}
                        >
                          علامت به‌عنوان خوانده‌شده
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === "profile" ? (
            profileLoading ? (
              <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
            ) : (
              <form
                className="mx-auto max-w-md space-y-4 text-right"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setProfileSaving(true);
                  setProfileMsg(null);
                  const res = await updateMyProfileAction({
                    full_name: profileForm.full_name,
                    phone: normalizeIranMobile(profileForm.phone) || profileForm.phone.trim(),
                  });
                  setProfileSaving(false);
                  if (res.ok) setProfileMsg("ذخیره شد.");
                  else setProfileMsg(res.error || "خطا در ذخیره");
                }}
              >
                <div>
                  <label className="mb-1 block text-sm">ایمیل</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="border-input bg-background h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      disabled={emailSaving}
                      className="border-border hover:bg-muted h-11 shrink-0 rounded-xl border px-3 text-xs disabled:opacity-50"
                      onClick={async () => {
                        setEmailSaving(true);
                        setProfileMsg(null);
                        const res = await updateMyEmailAction(emailDraft);
                        setEmailSaving(false);
                        if (res.ok) {
                          setProfileEmail(emailDraft.trim().toLowerCase());
                          setProfileMsg("ایمیل به‌روز شد (در صورت نیاز ایمیل تأیید بفرستید).");
                        } else setProfileMsg(res.error || "خطا در ذخیره ایمیل");
                      }}
                    >
                      {emailSaving ? "…" : "ذخیره ایمیل"}
                    </button>
                    <button
                      type="button"
                      className="border-border hover:bg-muted h-11 shrink-0 rounded-xl border px-3 text-xs"
                      onClick={async () => {
                        setProfileMsg(null);
                        const res = await resendEmailVerificationAction();
                        if (res.ok) {
                          setProfileMsg(
                            res.already
                              ? "ایمیل از قبل تأیید شده است."
                              : "ایمیل تأیید ارسال شد (صندوق ورودی را چک کنید).",
                          );
                        } else if (res.error === "login_required") {
                          setProfileMsg("ابتدا وارد شوید.");
                        } else {
                          setProfileMsg(res.error === "server" ? "ارسال ناموفق بود." : String(res.error || "خطا"));
                        }
                      }}
                    >
                      ارسال مجدد تأیید
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm">نام و نام خانوادگی</label>
                  <input
                    className="border-input bg-background h-11 w-full rounded-xl border px-3 text-sm"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                    placeholder="مثلاً علی رضایی"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">موبایل</label>
                  <input
                    className="border-input bg-background h-11 w-full rounded-xl border px-3 text-sm"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="0912…"
                    dir="ltr"
                  />
                </div>
                {profileMsg ? (
                  <p
                    className={
                      profileMsg === "ذخیره شد."
                        ? "text-sm text-green-600"
                        : "text-destructive text-sm"
                    }
                  >
                    {profileMsg}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-primary text-primary-foreground h-11 w-full rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {profileSaving ? "در حال ذخیره…" : "ذخیره پروفایل"}
                </button>
                <div className="border-border mt-8 space-y-3 rounded-xl border p-4">
                  <p className="text-sm font-medium">تغییر رمز عبور</p>
                  <p className="text-muted-foreground text-xs">
                    رمز جدید حداقل ۸ کاراکتر. اگر با OTP وارد شده‌اید و هنوز رمز ندارید، «رمز فعلی» را خالی بگذارید.
                  </p>
                  <div>
                    <label className="mb-1 block text-xs">رمز فعلی (اختیاری اگر اولین بار است)</label>
                    <input
                      type="password"
                      className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      autoComplete="current-password"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs">رمز جدید</label>
                    <input
                      type="password"
                      className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      autoComplete="new-password"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs">تکرار رمز جدید</label>
                    <input
                      type="password"
                      className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      autoComplete="new-password"
                      dir="ltr"
                    />
                  </div>
                  {pwMsg ? (
                    <p
                      className={
                        pwMsg.includes("موفق")
                          ? "text-sm text-green-600"
                          : "text-destructive text-sm"
                      }
                    >
                      {pwMsg}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={pwBusy}
                    className="bg-primary text-primary-foreground h-10 w-full rounded-lg text-sm font-medium disabled:opacity-50"
                    onClick={async () => {
                      setPwMsg(null);
                      if (pwNew.length < 8) {
                        setPwMsg("رمز جدید باید حداقل ۸ کاراکتر باشد.");
                        return;
                      }
                      if (pwNew !== pwConfirm) {
                        setPwMsg("تکرار رمز با رمز جدید یکی نیست.");
                        return;
                      }
                      setPwBusy(true);
                      const res = await changeMyPasswordAction(pwCurrent, pwNew);
                      setPwBusy(false);
                      if (res.ok) {
                        setPwCurrent("");
                        setPwNew("");
                        setPwConfirm("");
                        setPwMsg("رمز با موفقیت تغییر کرد.");
                        toast.success("رمز عبور به‌روز شد");
                      } else {
                        const map: Record<string, string> = {
                          weak: "رمز جدید باید حداقل ۸ کاراکتر باشد.",
                          bad_current: "رمز فعلی اشتباه است.",
                          login_required: "ابتدا وارد حساب شوید.",
                          server: "خطای سرور. دوباره تلاش کنید.",
                        };
                        setPwMsg(map[res.error || ""] || "تغییر رمز ناموفق بود.");
                      }
                    }}
                  >
                    {pwBusy ? "در حال ذخیره…" : "ذخیره رمز جدید"}
                  </button>
                </div>

                <div className="border-border mt-4 space-y-2 rounded-xl border p-4">
                  <p className="text-sm font-medium">امنیت نشست</p>
                  <p className="text-muted-foreground text-xs">
                    خروج از همه دستگاه‌ها جلسه‌های فعال را می‌بندد. بعد از آن باید دوباره وارد شوید.
                  </p>
                  <button
                    type="button"
                    disabled={logoutAllBusy}
                    className="border-border hover:bg-muted h-10 w-full rounded-lg border text-sm disabled:opacity-50"
                    onClick={async () => {
                      setLogoutAllBusy(true);
                      try {
                        const supabase = createClient();
                        // scope global: همه refresh tokenها باطل می‌شوند
                        await supabase.auth.signOut({ scope: "global" });
                      } catch {
                        try {
                          const supabase = createClient();
                          await supabase.auth.signOut();
                        } catch {
                          /* ignore */
                        }
                      }
                      setLogoutAllBusy(false);
                      window.location.href = "/login";
                    }}
                  >
                    {logoutAllBusy ? "در حال خروج…" : "خروج از همه دستگاه‌ها"}
                  
                  </button>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">نشست‌های اخیر</p>
                    <p className="text-muted-foreground text-xs">
                      دستگاه‌هایی که اخیراً وارد حساب شده‌اند. لغو فقط برچسب محلی را می‌بندد؛ برای قطع کامل از «خروج از همه دستگاه‌ها» استفاده کنید.
                    </p>
                    {sessionsLoading ? (
                      <p className="text-muted-foreground text-xs">در حال بارگذاری…</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-muted-foreground text-xs">نشست ثبت‌شده‌ای نیست.</p>
                    ) : (
                      <ul className="space-y-2">
                        {sessions.map((s) => (
                          <li
                            key={s.id}
                            className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-medium">{s.session_label || "دستگاه"}</p>
                              <p className="text-muted-foreground truncate" title={s.user_agent || ""}>
                                {s.ip_address ? `IP: ${s.ip_address}` : "IP نامشخص"}
                                {s.created_at
                                  ? ` — ${formatJalaliDateTime(s.created_at)}`
                                  : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={sessionRevokeBusy === s.id}
                              className="border-border hover:bg-muted shrink-0 rounded-md border px-2 py-1 disabled:opacity-50"
                              onClick={async () => {
                                setSessionRevokeBusy(s.id);
                                const res = await revokeMySessionAction(s.id);
                                setSessionRevokeBusy(null);
                                if (res.ok) {
                                  setSessions((prev) => prev.filter((x) => x.id !== s.id));
                                  toast.success("نشست لغو شد");
                                } else {
                                  toast.error("لغو نشست ناموفق بود");
                                }
                              }}
                            >
                              {sessionRevokeBusy === s.id ? "…" : "لغو"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="border-destructive/30 mt-8 space-y-2 rounded-xl border p-4">
                  <p className="text-destructive text-sm font-medium">حذف حساب کاربری</p>
                  <p className="text-muted-foreground text-xs">
                    این عمل خروج از حساب را انجام می‌دهد. برای تأیید عبارت DELETE را وارد کنید.
                  </p>
                  <input
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    disabled={deleteBusy || deleteConfirm !== "DELETE"}
                    className="bg-destructive text-destructive-foreground h-10 w-full rounded-lg text-sm disabled:opacity-40"
                    onClick={async () => {
                      setDeleteBusy(true);
                      const res = await deleteMyAccountAction();
                      setDeleteBusy(false);
                      if (res.ok) window.location.href = "/";
                      else setProfileMsg(res.error || "حذف ناموفق");
                    }}
                  >
                    {deleteBusy ? "در حال حذف…" : "حذف حساب"}
                  </button>
                </div>
                <Link href="/ورود" className="text-primary block text-center text-xs hover:underline">
                  مدیریت ورود
                </Link>
              </form>
            )
          ) : tab === "addresses" ? (
            <div className="space-y-6">
              {addrMsg ? (
                <p
                  className={
                    addrMsg.includes("ذخیره شد")
                      ? "text-sm text-green-600"
                      : "text-destructive text-sm"
                  }
                >
                  {addrMsg}
                </p>
              ) : null}

              {addrLoading ? (
                <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
              ) : addressesList.length === 0 ? (
                <p className="text-muted-foreground text-sm">آدرسی ثبت نشده.</p>
              ) : (
                <ul className="space-y-3">
                  {addressesList.map((a) => (
                    <li
                      key={a.id}
                      className="border-border rounded-xl border p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 text-right">
                          <p className="font-medium">
                            {a.title || "آدرس"}
                            {a.is_default ? (
                              <span className="text-primary mr-2 text-xs">
                                (پیش‌فرض)
                              </span>
                            ) : null}
                          </p>
                          <p>
                            {a.full_name} — {a.phone}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            {[a.province, a.city].filter(Boolean).join("، ")}
                            {a.address_line ? ` — ${a.address_line}` : ""}
                            {a.postal_code ? ` | ${a.postal_code}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!a.is_default ? (
                            <button
                              type="button"
                              className="text-primary text-xs"
                              onClick={async () => {
                                const res = await setDefaultAddressAction(a.id);
                                if (res.ok) {
                                  const list = await listMyAddressesAction();
                                  if (list.ok)
                                    setAddressesList(
                                      list.items as typeof addressesList
                                    );
                                }
                              }}
                            >
                              پیش‌فرض
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="text-destructive text-xs"
                            onClick={async () => {
                              const res = await deleteMyAddressAction(a.id);
                              if (res.ok) {
                                setAddressesList((prev) =>
                                  prev.filter((x) => x.id !== a.id)
                                );
                              }
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="border-border space-y-3 rounded-xl border p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAddrSaving(true);
                  setAddrMsg(null);
                  const res = await createMyAddressAction({
                    title: addrForm.title || undefined,
                    full_name: addrForm.full_name,
                    phone: normalizeIranMobile(addrForm.phone) || addrForm.phone.trim(),
                    province: addrForm.province || undefined,
                    city: addrForm.city,
                    address_line: addrForm.address_line,
                    postal_code: addrForm.postal_code || undefined,
                    is_default: addrForm.is_default,
                  });
                  setAddrSaving(false);
                  if (!res.ok) {
                    setAddrMsg(
                      res.error === "required_fields"
                        ? "نام، موبایل، شهر و آدرس الزامی است."
                        : res.error === "login_required"
                          ? "لطفاً دوباره وارد شوید."
                          : `ذخیره ناموفق: ${res.error || "server"}`
                    );
                    return;
                  }
                  setAddrMsg("آدرس ذخیره شد.");
                  setAddrForm({
                    title: "",
                    full_name: "",
                    phone: "",
                    province: "",
                    city: "",
                    address_line: "",
                    postal_code: "",
                    is_default: false,
                  });
                  const list = await listMyAddressesAction();
                  if (list.ok)
                    setAddressesList(list.items as typeof addressesList);
                }}
              >
                <p className="text-sm font-medium">افزودن آدرس</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="عنوان (خانه / محل کار)"
                    value={addrForm.title}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                  <input
                    required
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="نام گیرنده *"
                    value={addrForm.full_name}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                  />
                  <input
                    required
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="موبایل *"
                    value={addrForm.phone}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <input
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="استان"
                    value={addrForm.province}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, province: e.target.value }))
                    }
                  />
                  <input
                    required
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="شهر *"
                    value={addrForm.city}
                    onChange={(e) =>
                      setAddrForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                  <input
                    className="border-border bg-background h-10 rounded-lg border px-3 text-sm"
                    placeholder="کد پستی"
                    value={addrForm.postal_code}
                    onChange={(e) =>
                      setAddrForm((f) => ({
                        ...f,
                        postal_code: e.target.value,
                      }))
                    }
                  />
                </div>
                <textarea
                  required
                  rows={2}
                  className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="آدرس کامل *"
                  value={addrForm.address_line}
                  onChange={(e) =>
                    setAddrForm((f) => ({
                      ...f,
                      address_line: e.target.value,
                    }))
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addrForm.is_default}
                    onChange={(e) =>
                      setAddrForm((f) => ({
                        ...f,
                        is_default: e.target.checked,
                      }))
                    }
                  />
                  آدرس پیش‌فرض
                </label>
                <button
                  type="submit"
                  disabled={addrSaving}
                  className="bg-primary text-primary-foreground h-10 w-full rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {addrSaving ? "در حال ذخیره…" : "ذخیره آدرس"}
                </button>
              </form>
            </div>
          ) : tab === "shop" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">محصولات فروشگاه</p>
                <Link
                  href="/products"
                  className="text-primary text-xs hover:underline"
                >
                  همه محصولات
                </Link>
              </div>
              {shopLoading ? (
                <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
              ) : shopProducts.length === 0 ? (
                <EmptyBlock title="محصولی یافت نشد" description="در این بخش موردی برای نمایش نیست." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shopProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          ) : tab === "track" ? (
            <div className="mx-auto max-w-md space-y-4">
              <h2 className="text-base font-bold text-primary">پیگیری سفارش</h2>
              <p className="text-muted-foreground text-sm">
                کد سفارش خود را وارد کنید تا وضعیت را به‌صورت زنده ببینید.
              </p>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTrackLoading(true);
                  setTrackError(null);
                  setTrackResult(null);
                  const res = await trackOrderAction(trackCode);
                  setTrackLoading(false);
                  if (!res.ok) {
                    setTrackError(
                      res.error === "not_found" || (typeof res.error === "string" && res.error.includes("یافت"))
                        ? "سفارشی با این کد پیدا نشد."
                        : res.error === "empty"
                          ? "کد سفارش خود را وارد کنید."
                          : typeof res.error === "string" && res.error.length < 80
                            ? res.error
                            : "خطا در پیگیری.",
                    );
                    return;
                  }
                  setTrackResult(res.order as any);
                }}
              >
                <input
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="کد سفارش خود را وارد کنید"
                  className="border-border bg-background h-11 flex-1 rounded-xl border px-3 text-sm"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="bg-primary text-primary-foreground h-11 rounded-xl px-5 text-sm font-medium disabled:opacity-50"
                >
                  {trackLoading ? "…" : "پیگیری"}
                </button>
              </form>
              {trackError ? (
                <p className="text-destructive text-sm">{trackError}</p>
              ) : null}
              {trackResult ? (
                <div className="border-border space-y-2 rounded-xl border p-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">کد سفارش: </span>
                    <span className="font-mono text-xs" dir="ltr">{trackResult.id}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">وضعیت: </span>
                    <span className="font-medium">
                      {trackResult.status === "pending"
                        ? "در انتظار"
                        : trackResult.status === "paid"
                          ? "پرداخت‌شده"
                          : trackResult.status === "processing"
                            ? "در حال آماده‌سازی"
                            : trackResult.status === "shipped"
                              ? "ارسال‌شده"
                              : trackResult.status === "delivered"
                                ? "تحویل‌شده"
                                : trackResult.status === "cancelled"
                                  ? "لغو شده"
                                  : trackResult.status}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">مبلغ: </span>
                    {Number(trackResult.total_amount || 0).toLocaleString("fa-IR")} تومان
                  </p>
                  {trackResult.created_at ? (
                    <p className="text-muted-foreground text-xs">
                      {formatJalaliDate(trackResult.created_at)}
                    </p>
                  ) : null}
                  {trackResult.tracking_number ? (
                    <div className="border-border mt-2 space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
                      <p>
                        <span className="text-muted-foreground">کد رهگیری ارسال: </span>
                        <span className="font-mono font-bold select-all" dir="ltr">
                          {trackResult.tracking_number}
                        </span>
                      </p>
                      <a
                        href={iranPostTrackingUrl(trackResult.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        پیگیری مرسوله در سایت پست
                      </a>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      کد رهگیری ارسال پس از تحویل به پست اینجا نمایش داده می‌شود.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : tab === "coupons" ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                کدهای فعال را کپی کنید و در صفحه تسویه حساب اعمال کنید.
              </p>
              {couponsLoading ? (
                <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
              ) : activeDiscounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">کد فعالی نیست.</p>
              ) : (
                <ul className="space-y-3">
                  {activeDiscounts.map((d) => (
                    <li
                      key={d.code}
                      className="border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-sm"
                    >
                      <div className="text-right">
                        <p className="font-mono font-bold tracking-wide" dir="ltr">
                          {d.code}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {d.type === "percentage"
                            ? `${Number(d.value).toLocaleString("fa-IR")}٪ تخفیف`
                            : `${Number(d.value).toLocaleString("fa-IR")} تومان تخفیف`}
                          {d.min_order_amount
                            ? ` · حداقل سفارش ${Number(d.min_order_amount).toLocaleString("fa-IR")} تومان`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-primary text-xs"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(d.code);
                            toast.success("کد کپی شد");
                          } catch {
                            toast.error("کپی ناموفق بود");
                          }
                        }}
                      >
                        کپی
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/checkout" className="text-primary text-sm hover:underline">
                رفتن به تسویه حساب
              </Link>
            </div>
          ) : tab === "tickets" ? (
            <div className="space-y-6" dir="rtl">
              <div className="border-border space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold text-primary">تیکت جدید</h3>
                <input
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="موضوع"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                />
                <ComposerInput
                  onSend={async (body) => {
                    const res = await createTicketAction({
                      subject: ticketSubject || "پشتیبانی",
                      body,
                    });
                    if (!res.ok) {
                      toast.error(
                        res.error === "login_required"
                          ? "وارد شوید"
                          : res.error || "خطا",
                      );
                      return;
                    }
                    toast.success("تیکت ثبت شد");
                    setTicketSubject("");
                    const list = await listMyTicketsAction();
                    if (list.ok) setTicketItems(list.items as typeof ticketItems);
                  }}
                  placeholder="پیام شما (بدون لینک و تصویر)…"
                  sendLabel="ارسال تیکت"
                />
              </div>
              {ticketLoading ? (
                <div className="flex justify-center py-10">
                  <LumaSpin />
                </div>
              ) : (
                <ul className="space-y-3">
                  {ticketItems.map((tk) => (
                    <li
                      key={tk.id}
                      className="border-border cursor-pointer rounded-xl border p-3 text-sm"
                      onClick={() => setActiveTicketId(tk.id)}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{tk.subject}</span>
                        <span className="text-muted-foreground text-xs">
                          {tk.status}
                        </span>
                      </div>
                      <time className="text-muted-foreground text-xs">
                        {formatJalaliDate(tk.created_at)}
                      </time>
                      {activeTicketId === tk.id ? (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          {ticketMsgs.map((m) => (
                            <p
                              key={m.id}
                              className={
                                m.is_staff
                                  ? "bg-muted rounded-lg p-2 text-xs"
                                  : "text-xs"
                              }
                            >
                              {m.is_staff ? "پشتیبانی: " : "شما: "}
                              {m.body}
                            </p>
                          ))}
                          <ComposerInput
                            onSend={async (body) => {
                              const res = await replyTicketAction(tk.id, body);
                              if (!res.ok) {
                                toast.error("خطا در ارسال");
                                return;
                              }
                              const msgs = await listTicketMessagesAction(tk.id);
                              if (msgs.ok)
                                setTicketMsgs(msgs.items as typeof ticketMsgs);
                            }}
                            placeholder="پاسخ…"
                            sendLabel="ارسال"
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                  {!ticketItems.length ? (
                    <p className="text-muted-foreground text-sm">تیکتی نیست</p>
                  ) : null}
                </ul>
              )}
            </div>
          ) : tab === "returns" ? (
            <div className="space-y-6" dir="rtl">
              <div className="border-border space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold text-primary">درخواست مرجوعی</h3>
                <select
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  value={returnOrderId}
                  onChange={(e) => setReturnOrderId(e.target.value)}
                >
                  <option value="">انتخاب سفارش…</option>
                  {returnOrderOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs leading-6">
                  فقط سفارش‌های ارسال‌شده یا تحویل‌شده تا ۷ روز قابل مرجوعی هستند.
                </p>
                <select
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  value={
                    [
                      "کالا با توضیحات مطابقت ندارد",
                      "وزن بسته نامناسب است",
                      "کالا آسیب دیده رسیده",
                      "انصراف از خرید",
                      "سایر",
                    ].includes(returnReason)
                      ? returnReason
                      : returnReason
                        ? "سایر"
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "سایر") setReturnReason("");
                    else setReturnReason(v);
                  }}
                >
                  <option value="">انتخاب دلیل…</option>
                  <option value="کالا با توضیحات مطابقت ندارد">
                    کالا با توضیحات مطابقت ندارد
                  </option>
                  <option value="وزن بسته نامناسب است">وزن بسته نامناسب است</option>
                  <option value="کالا آسیب دیده رسیده">کالا آسیب دیده رسیده</option>
                  <option value="انصراف از خرید">انصراف از خرید</option>
                  <option value="سایر">سایر (توضیح بنویسید)</option>
                </select>
                <textarea
                  className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="توضیح بیشتر (حداقل ۵ حرف — بدون لینک)"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm"
                  onClick={async () => {
                    const res = await createReturnAction({
                      orderId: returnOrderId,
                      reason: returnReason,
                    });
                    if (!res.ok) {
                      const map: Record<string, string> = {
                        login_required: "وارد شوید",
                        order_not_found: "سفارش یافت نشد",
                        order_required: "سفارش را انتخاب کنید",
                        order_not_eligible:
                          "فقط سفارش ارسال‌شده یا تحویل‌شده قابل مرجوعی است",
                        return_window_expired:
                          "مهلت ۷ روزه مرجوعی این سفارش تمام شده است",
                        return_already_open:
                          "برای این سفارش درخواست باز دارید",
                        reason_short: "دلیل را کامل‌تر بنویسید",
                      };
                      toast.error(map[res.error] || res.error || "خطا");
                      return;
                    }
                    toast.success("درخواست مرجوعی ثبت شد");
                    setReturnOrderId("");
                    setReturnReason("");
                    const list = await listMyReturnsAction();
                    if (list.ok) setReturnItems(list.items as typeof returnItems);
                    window.dispatchEvent(new Event("pm:returns-changed"));
                  }}
                >
                  ثبت درخواست
                </button>
              </div>
              {returnLoading ? (
                <div className="flex justify-center py-10">
                  <LumaSpin />
                </div>
              ) : (
                <ul className="space-y-2">
                  {returnItems.map((r) => {
                    const statusFa: Record<string, string> = {
                      pending: "در انتظار بررسی",
                      approved: "تأیید شده",
                      rejected: "رد شده",
                      received: "کالا دریافت شد",
                      refunded: "عودت وجه",
                    };
                    return (
                      <li
                        key={r.id}
                        className="border-border rounded-xl border p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-mono text-xs" dir="ltr">
                            {r.order_id}
                          </p>
                          <span className="text-xs font-medium text-primary">
                            {statusFa[r.status] || r.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1">{r.reason}</p>
                        {r.admin_note ? (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            یادداشت فروشگاه: {r.admin_note}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatJalaliDate(r.created_at)}
                        </p>
                      </li>
                    );
                  })}
                  {!returnItems.length ? (
                    <p className="text-muted-foreground text-sm">درخواستی نیست</p>
                  ) : null}
                </ul>
              )}
            </div>
          ) : tab === "cart" ? (
            cartLoading ? (
              <div className="flex justify-center py-10" dir="rtl"><LumaSpin /></div>
            ) : serverCart.length === 0 && cart.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                <EmptyBlock title="موردی نیست" description="در این بخش چیزی برای نمایش وجود ندارد." />
              </p>
            ) : serverCart.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {serverCart.map((line, index) => (
                    <li
                      key={line.itemId || index}
                      className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {line.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={line.image}
                            alt={line.title}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover bg-muted"
                          />
                        ) : (
                          <div className="bg-muted h-14 w-14 shrink-0 rounded-lg" />
                        )}
                        <div className="min-w-0 text-right">
                          <p className="truncate font-medium">{line.title}</p>
                          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {line.roastHex || line.roast ? (
                              <span
                                className="border-border inline-block h-4 w-4 rounded-full border"
                                style={{
                                  backgroundColor:
                                    line.roastHex ||
                                    (line.roast?.startsWith("#")
                                      ? line.roast
                                      : undefined),
                                }}
                                title={line.roast || ""}
                              />
                            ) : null}
                            {line.weight ? (
                              <span className="border-border rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                                {line.weight}
                              </span>
                            ) : null}
                            {line.roast && !line.roast.startsWith("#") ? (
                              <span>{line.roast}</span>
                            ) : null}
                          </div>
                          <p className="text-xs">
                            {line.price.toLocaleString("fa-IR")} تومان
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="border-border h-7 w-7 rounded-md border text-sm"
                            onClick={() =>
                              handleUpdateQty(
                                line,
                                Math.max(1, line.quantity - 1)
                              )
                            }
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            className="border-border h-7 w-7 rounded-md border text-sm"
                            onClick={() =>
                              handleUpdateQty(line, line.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={removingId === line.variantId}
                          className="text-destructive text-xs disabled:opacity-50"
                          onClick={() => handleRemoveServerCart(line)}
                        >
                          حذف
                        </button>
                        {line.slug ? (
                          <Link
                            href={`/products/${line.slug}`}
                            className="text-primary text-xs hover:underline"
                          >
                            مشاهده
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-border mt-4 space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">جمع کل</span>
                    <span className="font-bold">
                      {serverCart
                        .reduce(
                          (s, line) =>
                            s +
                            Number((line as { price?: number; unitPrice?: number }).price ??
                              (line as { unitPrice?: number }).unitPrice ??
                              0) *
                              Number(line.quantity ?? 1),
                          0
                        )
                        .toLocaleString("fa-IR")}{" "}
                      تومان
                    </span>
                  </div>
                  <Link
                    href="/checkout"
                    className="bg-primary text-primary-foreground inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium"
                  >
                    تسویه حساب
                  </Link>
                </div>
              </>
            ) : (
              <ul className="space-y-3">
                {cart.map((p) => {
                  const key = `${p.id}|${p.roast ?? ""}|${p.weight ?? ""}`;
                  return (
                    <li
                      key={key}
                      className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.title}
                            className="bg-muted h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="bg-muted h-14 w-14 shrink-0 rounded-lg" />
                        )}
                        <div className="min-w-0 text-right">
                          <p className="truncate font-medium">{p.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {[p.weight, p.roast].filter(Boolean).join(" · ")}
                            {(p.quantity ?? 1) > 1
                              ? ` × ${p.quantity}`
                              : ""}
                          </p>
                          <p className="text-xs">
                            {tab === "cart" ? `${(p.price ?? 0).toLocaleString("fa-IR")} تومان` : null}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-destructive text-xs"
                        onClick={() =>
                          removeFromCart(p.id, {
                            roast: p.roast,
                            weight: p.weight,
                          })
                        }
                      >
                        حذف از سبد
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            (() => {
              const list =
                tab === "wishlist"
                  ? (serverWishlist.length > 0
                      ? serverWishlist.map((w) => ({
                          id: w.productId,
                          title: w.title,
                          price: w.price,
                          image: w.image,
                          href: w.slug ? `/products/${w.slug}` : undefined,
                        }))
                      : wishlist)
                  : tab === "compare"
                    ? compare
                    : recent;
              if (list.length === 0) {
                return (
                  <p className="text-muted-foreground text-sm">
                    <EmptyBlock title="موردی نیست" description="در این بخش چیزی برای نمایش وجود ندارد." />
                  </p>
                );
              }
              return (
                <ul className="space-y-3">
                  {list.map((p: any) => (
                    <li
                      key={p.id}
                      className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.title}
                            className="bg-muted h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="bg-muted h-14 w-14 shrink-0 rounded-lg" />
                        )}
                        <div className="min-w-0 text-right">
                          <p className="truncate font-medium">{p.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {tab === "wishlist" ? (
                          <button
                            type="button"
                            className="text-destructive text-xs"
                            onClick={() => void handleRemoveWishlist(p.id)}
                          >
                            حذف
                          </button>
                        ) : null}
                        {tab === "compare" ? (
                          <button
                            type="button"
                            className="text-destructive text-xs"
                            onClick={() => toggleCompare(p)}
                          >
                            حذف از مقایسه
                          </button>
                        ) : null}
                        {(p.href || p.slug) ? (
                          <Link
                            href={p.href || `/products/${p.slug}`}
                            className="text-primary text-xs hover:underline"
                          >
                            مشاهده
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()
          )}
        </div>
    </CustomerDashboardShell>
  );
}
