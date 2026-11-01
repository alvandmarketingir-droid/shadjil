import { createServiceClient } from "@/lib/supabase/service";

/** سبد فقط با Service Role (سرور). هویت در server action تعیین می‌شود. */
export class CartRepository {
  private getClient() {
    return createServiceClient();
  }

  async getOrCreateCart(opts: {
    userId?: string | null;
    sessionId?: string | null;
  }): Promise<string> {
    const supabase = this.getClient();
    if (opts.userId) {
      const { data } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", opts.userId)
        .maybeSingle();
      if (data?.id) return data.id as string;
      const { data: created, error } = await supabase
        .from("carts")
        .insert({ user_id: opts.userId })
        .select("id")
        .single();
      if (error) throw error;
      return created.id as string;
    }
    if (opts.sessionId) {
      const { data } = await supabase
        .from("carts")
        .select("id")
        .eq("session_id", opts.sessionId)
        .is("user_id", null)
        .maybeSingle();
      if (data?.id) return data.id as string;
      const { data: created, error } = await supabase
        .from("carts")
        .insert({ session_id: opts.sessionId })
        .select("id")
        .single();
      if (error) throw error;
      return created.id as string;
    }
    throw new Error("userId or sessionId required");
  }

  async addItem(cartId: string, variantId: string, quantity = 1): Promise<void> {
    const supabase = this.getClient();
    const qtyAdd = Math.max(1, Number(quantity) || 1);

    const { data: variant, error: vErr } = await supabase
      .from("product_variants")
      .select("id, stock_quantity, is_active")
      .eq("id", variantId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!variant || variant.is_active === false) throw new Error("unavailable");
    const stock = Math.max(0, Number(variant.stock_quantity ?? 0));
    // stock=0 یعنی ناموجود (نه نامحدود)
    if (stock <= 0) throw new Error("insufficient_stock:0");

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (existing) {
      const next = Number(existing.quantity) + qtyAdd;
      if (next > stock) throw new Error(`insufficient_stock:${stock}`);
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: next })
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }

    if (qtyAdd > stock) throw new Error(`insufficient_stock:${stock}`);
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartId,
      variant_id: variantId,
      quantity: qtyAdd,
    });
    if (error) throw error;
  }

  async setQuantity(cartId: string, variantId: string, quantity: number): Promise<void> {
    const supabase = this.getClient();
    if (quantity < 1) {
      await this.removeItem(cartId, variantId);
      return;
    }
    const { data: variant, error: vErr } = await supabase
      .from("product_variants")
      .select("id, stock_quantity, is_active")
      .eq("id", variantId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!variant || variant.is_active === false) throw new Error("unavailable");
    const stock = Math.max(0, Number(variant.stock_quantity ?? 0));
    if (stock <= 0) throw new Error("insufficient_stock:0");
    const requested = Math.max(1, Math.floor(Number(quantity) || 1));
    if (requested > stock) throw new Error(`insufficient_stock:${stock}`);
    const qty = requested;

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id")
      .eq("cart_id", cartId)
      .eq("variant_id", variantId)
      .maybeSingle();
    if (!existing) {
      await this.addItem(cartId, variantId, qty);
      return;
    }
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: qty })
      .eq("cart_id", cartId)
      .eq("variant_id", variantId);
    if (error) throw error;
  }

  async removeItem(cartId: string, variantId: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .eq("variant_id", variantId);
    if (error) throw error;
  }

  async listItems(cartId: string) {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        quantity,
        variant_id,
        product_variants(
          id,
          price,
          product_id,
          size,
          color_name,
          color_hex,
          weight_grams,
          products(id, name, slug, product_images(url, is_primary, sort_order, variant_id))
        )
      `,
      )
      .eq("cart_id", cartId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async clearCart(cartId: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartId);
    if (error) throw error;
  }

  async mergeSessionIntoUser(sessionId: string, userId: string): Promise<void> {
    if (!sessionId || !userId) return;
    const supabase = this.getClient();
    const { data: guestCart } = await supabase
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .is("user_id", null)
      .maybeSingle();
    if (!guestCart?.id) return;
    const userCartId = await this.getOrCreateCart({ userId });
    if (guestCart.id === userCartId) return;
    const { data: guestItems } = await supabase
      .from("cart_items")
      .select("variant_id, quantity")
      .eq("cart_id", guestCart.id);
    for (const row of guestItems ?? []) {
      const vid = (row as { variant_id: string }).variant_id;
      const qty = Number((row as { quantity: number }).quantity) || 1;
      if (!vid) continue;
      try {
        await this.addItem(userCartId, vid, qty);
      } catch (e) {
        console.error("[mergeSessionIntoUser]", e);
      }
    }
    await this.clearCart(guestCart.id as string);
    await supabase.from("carts").delete().eq("id", guestCart.id);
  }
}
