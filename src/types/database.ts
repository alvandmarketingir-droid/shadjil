/**
 * Database types for پیراهن مردانه
 * Generated manually to match production schema
 * Keep in sync with supabase/migrations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          meta_title: string | null;
          meta_description: string | null;
          short_description: string | null;
          focus_keyphrases: string[] | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          canonical_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          short_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          short_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          is_active: boolean;
          image_url: string | null;
          meta_title: string | null;
          meta_description: string | null;
          short_description: string | null;
          focus_keyphrases: string[] | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          canonical_url: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          description?: string | null;
          is_active?: boolean;
          image_url?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          short_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          description?: string | null;
          is_active?: boolean;
          image_url?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          short_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          brand_id: string | null;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          status: "draft" | "published" | "archived";
          is_featured: boolean;
          is_new: boolean;
          is_bestseller: boolean;
          meta_title: string | null;
          meta_description: string | null;
          average_rating: number | null;
          review_count: number;
          deleted_at: string | null;
          size_guide_id: string | null;
          published_at: string | null;
          focus_keyphrases: string[] | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          canonical_url: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image_url: string | null;
          twitter_title: string | null;
          twitter_description: string | null;
          is_cornerstone: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          brand_id?: string | null;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          status?: "draft" | "published" | "archived";
          is_featured?: boolean;
          is_new?: boolean;
          is_bestseller?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          average_rating?: number | null;
          review_count?: number;
          deleted_at?: string | null;
          size_guide_id?: string | null;
          published_at?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          twitter_title?: string | null;
          twitter_description?: string | null;
          is_cornerstone?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          brand_id?: string | null;
          name?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          status?: "draft" | "published" | "archived";
          is_featured?: boolean;
          is_new?: boolean;
          is_bestseller?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          average_rating?: number | null;
          review_count?: number;
          deleted_at?: string | null;
          size_guide_id?: string | null;
          published_at?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          twitter_title?: string | null;
          twitter_description?: string | null;
          is_cornerstone?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          size: string | null;
          color_name: string | null;
          color_hex: string | null;
          price: number;
          original_price: number | null;
          stock_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          weight_grams: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string | null;
          size?: string | null;
          color_name?: string | null;
          color_hex?: string | null;
          price: number;
          original_price?: number | null;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          weight_grams?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string | null;
          size?: string | null;
          color_name?: string | null;
          color_hex?: string | null;
          price?: number;
          original_price?: number | null;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          weight_grams?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ];
      };
      attributes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: "select" | "text" | "number" | "boolean";
          is_filterable: boolean;
          is_required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type?: "select" | "text" | "number" | "boolean";
          is_filterable?: boolean;
          is_required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: "select" | "text" | "number" | "boolean";
          is_filterable?: boolean;
          is_required?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      attribute_options: {
        Row: {
          id: string;
          attribute_id: string;
          value: string;
          slug: string;
          sort_order: number;
          hex: string | null;
        };
        Insert: {
          id?: string;
          attribute_id: string;
          value: string;
          slug: string;
          sort_order?: number;
          hex?: string | null;
        };
        Update: {
          id?: string;
          attribute_id?: string;
          value?: string;
          slug?: string;
          sort_order?: number;
          hex?: string | null;
        };
        Relationships: [];
      };
      product_attribute_values: {
        Row: {
          id: string;
          product_id: string;
          attribute_id: string;
          option_id: string | null;
          value_text: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          attribute_id: string;
          option_id?: string | null;
          value_text?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string;
          attribute_id?: string;
          option_id?: string | null;
          value_text?: string | null;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string | null;
          variant_id: string | null;
          url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          url?: string;
          alt_text?: string | null;
          sort_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ];
      };
      size_guides: {
        Row: {
          id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      size_guide_rows: {
        Row: {
          id: string;
          size_guide_id: string;
          size_label: string;
          chest_cm: number | null;
          waist_cm: number | null;
          shoulder_cm: number | null;
          sleeve_cm: number | null;
          length_cm: number | null;
          neck_cm: number | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          size_guide_id: string;
          size_label: string;
          chest_cm?: number | null;
          waist_cm?: number | null;
          shoulder_cm?: number | null;
          sleeve_cm?: number | null;
          length_cm?: number | null;
          neck_cm?: number | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          size_guide_id?: string;
          size_label?: string;
          chest_cm?: number | null;
          waist_cm?: number | null;
          shoulder_cm?: number | null;
          sleeve_cm?: number | null;
          length_cm?: number | null;
          neck_cm?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: "customer" | "admin" | "staff" | "superadmin";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: "customer" | "admin" | "staff" | "superadmin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: "customer" | "admin" | "staff" | "superadmin";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          is_verified: boolean;
          is_approved: boolean;
          status: string | null;
          admin_reply: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          is_verified?: boolean;
          is_approved?: boolean;
          status?: string | null;
          admin_reply?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          title?: string | null;
          body?: string | null;
          is_verified?: boolean;
          is_approved?: boolean;
          status?: string | null;
          admin_reply?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      discounts: {
        Row: {
          id: string;
          code: string | null;
          type: "percentage" | "fixed";
          value: number;
          min_order_amount: number | null;
          max_uses: number | null;
          used_count: number;
          max_discount_amount: number | null;
          product_ids: string[] | null;
          category_ids: string[] | null;
          once_per_user: boolean;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          type: "percentage" | "fixed";
          value: number;
          min_order_amount?: number | null;
          max_uses?: number | null;
          used_count?: number;
          max_discount_amount?: number | null;
          product_ids?: string[] | null;
          category_ids?: string[] | null;
          once_per_user?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string | null;
          type?: "percentage" | "fixed";
          value?: number;
          min_order_amount?: number | null;
          max_uses?: number | null;
          used_count?: number;
          max_discount_amount?: number | null;
          product_ids?: string[] | null;
          category_ids?: string[] | null;
          once_per_user?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      orders: {
        Row: {
          id: string; user_id: string | null; status: string; payment_status: string;
          total_amount: number;
          total: number | null;
          shipping_name: string | null; shipping_phone: string | null; shipping_email: string | null;
          shipping_address: string | null; shipping_city: string | null;
          shipping_postal: string | null; note: string | null; discount_code: string | null; discount_amount: number | null; paid_at: string | null;
          tracking_number: string | null; shipped_at: string | null;
          shipping_fee: number;
          session_id: string | null;
          shipping_method_id: string | null;
          shipping_method_title: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id?: string | null; status?: string; payment_status?: string;
          total_amount?: number;
          total?: number | null;
          shipping_name?: string | null; shipping_phone?: string | null; shipping_email?: string | null;
          shipping_address?: string | null; shipping_city?: string | null;
          shipping_postal?: string | null; note?: string | null; discount_code?: string | null; discount_amount?: number | null; paid_at?: string | null;
          tracking_number?: string | null; shipped_at?: string | null;
          shipping_fee?: number;
          session_id?: string | null;
          shipping_method_id?: string | null;
          shipping_method_title?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; user_id?: string | null; status?: string; payment_status?: string;
          total_amount?: number;
          total?: number | null;
          shipping_name?: string | null; shipping_phone?: string | null; shipping_email?: string | null;
          shipping_address?: string | null; shipping_city?: string | null;
          shipping_postal?: string | null; note?: string | null; discount_code?: string | null; discount_amount?: number | null; paid_at?: string | null;
          tracking_number?: string | null; shipped_at?: string | null;
          shipping_fee?: number;
          session_id?: string | null;
          shipping_method_id?: string | null;
          shipping_method_title?: string | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string; order_id: string; variant_id: string; product_id: string;
          title: string; size_name: string | null; color_name: string | null;
          unit_price: number; quantity: number; line_total: number;
        };
        Insert: {
          id?: string; order_id: string; variant_id: string; product_id: string;
          title: string; size_name?: string | null; color_name?: string | null;
          unit_price: number; quantity: number; line_total: number;
        };
        Update: {
          id?: string; order_id?: string; variant_id?: string; product_id?: string;
          title?: string; size_name?: string | null; color_name?: string | null;
          unit_price?: number; quantity?: number; line_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ];
      };
      notifications: {
        Row: {
          id: string; user_id: string; title: string; body: string | null;
          type: string | null; link: string | null; read_at: string | null; is_read: boolean; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; title: string; body?: string | null;
          type?: string | null; link?: string | null; read_at?: string | null; is_read?: boolean; created_at?: string;
        };
        Update: {
          id?: string; user_id?: string; title?: string; body?: string | null;
          type?: string | null; link?: string | null; read_at?: string | null; is_read?: boolean; created_at?: string;
        };
        Relationships: [];
      };
      sizes: {
        Row: { id: string; name: string; slug: string; sort_order: number; is_active: boolean; created_at: string; };
        Insert: { id?: string; name: string; slug: string; sort_order?: number; is_active?: boolean; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; sort_order?: number; is_active?: boolean; created_at?: string; };
        Relationships: [];
      };
      colors: {
        Row: { id: string; name: string; slug: string; hex_code: string | null; sort_order: number; is_active: boolean; created_at: string; };
        Insert: { id?: string; name: string; slug: string; hex_code?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; hex_code?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; };
        Relationships: [];
      };
      product_tags: {
        Row: { id: string; name: string; slug: string; is_active: boolean; image_url: string | null; short_description: string | null; description: string | null; meta_title: string | null; meta_description: string | null; focus_keyphrases: string[] | null; robots_index: boolean | null; robots_follow: boolean | null; canonical_url: string | null; created_at: string; };
        Insert: { id?: string; name: string; slug: string; is_active?: boolean; image_url?: string | null; short_description?: string | null; description?: string | null; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; canonical_url?: string | null; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; is_active?: boolean; image_url?: string | null; short_description?: string | null; description?: string | null; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; canonical_url?: string | null; created_at?: string; };
        Relationships: [];
      };
      product_tag_map: {
        Row: { product_id: string; tag_id: string };
        Insert: { product_id: string; tag_id: string };
        Update: { product_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "product_tag_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          }
        ];
      };
      blog_categories: {
        Row: { id: string; name: string; slug: string; description: string | null; is_active: boolean; sort_order: number; meta_title: string | null; meta_description: string | null; focus_keyphrases: string[] | null; robots_index: boolean | null; robots_follow: boolean | null; canonical_url: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; name: string; slug: string; description?: string | null; is_active?: boolean; sort_order?: number; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; canonical_url?: string | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; name?: string; slug?: string; description?: string | null; is_active?: boolean; sort_order?: number; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; canonical_url?: string | null; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string; category_id: string | null; author_id: string | null; title: string; slug: string;
          excerpt: string | null; body: string | null; cover_url: string | null; status: string;
          published_at: string | null; meta_title: string | null; meta_description: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image: string | null;
          og_image_url: string | null;
          focus_keyphrases: string[] | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          canonical_url: string | null;
          twitter_title: string | null;
          twitter_description: string | null;
          is_cornerstone: boolean | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; category_id?: string | null; author_id?: string | null; title: string; slug: string;
          excerpt?: string | null; body?: string | null; cover_url?: string | null; status?: string;
          published_at?: string | null; meta_title?: string | null; meta_description?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          og_image_url?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          twitter_title?: string | null;
          twitter_description?: string | null;
          is_cornerstone?: boolean | null;
          created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; category_id?: string | null; author_id?: string | null; title?: string; slug?: string;
          excerpt?: string | null; body?: string | null; cover_url?: string | null; status?: string;
          published_at?: string | null; meta_title?: string | null; meta_description?: string | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          og_image_url?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          twitter_title?: string | null;
          twitter_description?: string | null;
          is_cornerstone?: boolean | null;
          created_at?: string; updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          }
        ];
      };
      blog_tags: {
        Row: { id: string; name: string; slug: string; is_active: boolean; meta_title: string | null; meta_description: string | null; focus_keyphrases: string[] | null; robots_index: boolean | null; robots_follow: boolean | null; created_at: string; };
        Insert: { id?: string; name: string; slug: string; is_active?: boolean; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; is_active?: boolean; meta_title?: string | null; meta_description?: string | null; focus_keyphrases?: string[] | null; robots_index?: boolean | null; robots_follow?: boolean | null; created_at?: string; };
        Relationships: [];
      };
      blog_tag_map: {
        Row: { post_id: string; tag_id: string };
        Insert: { post_id: string; tag_id: string };
        Update: { post_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "blog_tag_map_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          }
        ];
      };
      support_tickets: {
        Row: { id: string; user_id: string; subject: string; status: string; priority: string | null; category: string | null; order_id: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; subject: string; status?: string; priority?: string | null; category?: string | null; order_id?: string | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; subject?: string; status?: string; priority?: string | null; category?: string | null; order_id?: string | null; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      support_ticket_messages: {
        Row: { id: string; ticket_id: string; user_id: string | null; sender_id: string | null; body: string; is_staff: boolean; created_at: string; };
        Insert: { id?: string; ticket_id: string; user_id?: string | null; sender_id?: string | null; body: string; is_staff?: boolean; created_at?: string; };
        Update: { id?: string; ticket_id?: string; user_id?: string | null; sender_id?: string | null; body?: string; is_staff?: boolean; created_at?: string; };
        Relationships: [];
      };
      return_requests: {
        Row: { id: string; user_id: string; order_id: string | null; order_item_id: string | null; status: string; reason: string | null; admin_note: string | null; refunded_at: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; order_id?: string | null; order_item_id?: string | null; status?: string; reason?: string | null; admin_note?: string | null; refunded_at?: string | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; user_id?: string; order_id?: string | null; order_item_id?: string | null; status?: string; reason?: string | null; admin_note?: string | null; refunded_at?: string | null; created_at?: string; updated_at?: string; };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string; user_id: string; title: string | null; full_name: string; phone: string;
          province: string | null; city: string; address_line: string; postal_code: string | null;
          is_default: boolean; created_at: string;
        };
        Insert: {
          id?: string; user_id: string; title?: string | null; full_name: string; phone: string;
          province?: string | null; city: string; address_line: string; postal_code?: string | null;
          is_default?: boolean; created_at?: string;
        };
        Update: {
          id?: string; user_id?: string; title?: string | null; full_name?: string; phone?: string;
          province?: string | null; city?: string; address_line?: string; postal_code?: string | null;
          is_default?: boolean; created_at?: string;
        };
        Relationships: [];
      };
      admin_logs: {
        Row: { id: string; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; meta: Json | null; created_at: string; };
        Insert: { id?: string; actor_id?: string | null; action: string; entity?: string | null; entity_id?: string | null; meta?: Json | null; created_at?: string; };
        Update: { id?: string; actor_id?: string | null; action?: string; entity?: string | null; entity_id?: string | null; meta?: Json | null; created_at?: string; };
        Relationships: [];
      };
      otp_challenges: {
        Row: { id: string; phone: string; code_hash: string; expires_at: string; attempts: number; consumed_at: string | null; created_at: string; };
        Insert: { id?: string; phone: string; code_hash: string; expires_at: string; attempts?: number; consumed_at?: string | null; created_at?: string; };
        Update: { id?: string; phone?: string; code_hash?: string; expires_at?: string; attempts?: number; consumed_at?: string | null; created_at?: string; };
        Relationships: [];
      };
      product_price_history: {
        Row: { id: string; product_id: string; variant_id: string | null; price: number; recorded_at: string; };
        Insert: { id?: string; product_id: string; variant_id?: string | null; price: number; recorded_at?: string; };
        Update: { id?: string; product_id?: string; variant_id?: string | null; price?: number; recorded_at?: string; };
        Relationships: [];
      };

      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_label: string | null;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
          last_seen_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_label?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_label?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };


      shipping_methods: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          fee: number;
          is_active: boolean;
          sort_order: number;
          provider_code: string | null;
          pricing_type: string | null;
          api_config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          fee?: number;
          is_active?: boolean;
          sort_order?: number;
          provider_code?: string | null;
          pricing_type?: string | null;
          api_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          fee?: number;
          is_active?: boolean;
          sort_order?: number;
          provider_code?: string | null;
          pricing_type?: string | null;
          api_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipping_zones: {
        Row: { id: string; name: string; description: string | null; is_active: boolean; sort_order: number; created_at: string; };
        Insert: { id?: string; name: string; description?: string | null; is_active?: boolean; sort_order?: number; created_at?: string; };
        Update: { id?: string; name?: string; description?: string | null; is_active?: boolean; sort_order?: number; created_at?: string; };
        Relationships: [];
      };
      shipping_zone_locations: {
        Row: { id: string; zone_id: string; province: string; city: string | null; };
        Insert: { id?: string; zone_id: string; province: string; city?: string | null; };
        Update: { id?: string; zone_id?: string; province?: string; city?: string | null; };
        Relationships: [];
      };
      shipping_method_zones: {
        Row: { method_id: string; zone_id: string; };
        Insert: { method_id: string; zone_id: string; };
        Update: { method_id?: string; zone_id?: string; };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          from_status: string | null;
          to_status: string;
          note: string | null;
          actor_type: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_status?: string | null;
          to_status: string;
          note?: string | null;
          actor_type?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_status?: string | null;
          to_status?: string;
          note?: string | null;
          actor_type?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };


      stock_alerts: {
        Row: {
          id: string;
          user_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          email: string | null;
          phone: string | null;
          notified_at: string | null;
          status: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          email?: string | null;
          phone?: string | null;
          notified_at?: string | null;
          status?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          email?: string | null;
          phone?: string | null;
          notified_at?: string | null;
          status?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      site_settings: {
        Row: { key: string; value: Json | null; updated_at: string; };
        Insert: { key: string; value?: Json | null; updated_at?: string; };
        Update: { key?: string; value?: Json | null; updated_at?: string; };
        Relationships: [];
      };

      contact_messages: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          company: string | null;
          email: string;
          message: string;
          status: string;
          admin_note: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          company?: string | null;
          email: string;
          message: string;
          status?: string;
          admin_note?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          company?: string | null;
          email?: string;
          message?: string;
          status?: string;
          admin_note?: string | null;
        };
        Relationships: [];
      };

      job_queue: {
        Row: {
          id: string;
          job_type: string;
          payload: Json;
          status: string;
          attempts: number;
          max_attempts: number;
          available_at: string;
          locked_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_type: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_type?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      newsletter_subscribers: {
        Row: {
          id: string;
          phone: string;
          email: string | null;
          source: string | null;
          ip: string | null;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          email?: string | null;
          source?: string | null;
          ip?: string | null;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          email?: string | null;
          source?: string | null;
          ip?: string | null;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      analytics_events: {
        Row: {
          id: string;
          event_name: string;
          session_id: string | null;
          user_id: string | null;
          product_id: string | null;
          variant_id: string | null;
          order_id: string | null;
          quantity: number | null;
          value: number | null;
          currency: string;
          search_term: string | null;
          result_count: number | null;
          path: string | null;
          device: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          session_id?: string | null;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          order_id?: string | null;
          quantity?: number | null;
          value?: number | null;
          currency?: string;
          search_term?: string | null;
          result_count?: number | null;
          path?: string | null;
          device?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          session_id?: string | null;
          user_id?: string | null;
          product_id?: string | null;
          variant_id?: string | null;
          order_id?: string | null;
          quantity?: number | null;
          value?: number | null;
          currency?: string;
          search_term?: string | null;
          result_count?: number | null;
          path?: string | null;
          device?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      seo_page_settings: {
        Row: {
          id: string;
          page_key: string;
          title: string | null;
          meta_title: string | null;
          meta_description: string | null;
          focus_keyphrases: string[] | null;
          canonical_url: string | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          og_title: string | null;
          og_description: string | null;
          og_image_url: string | null;
          body_preview: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_key: string;
          title?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyphrases?: string[] | null;
          canonical_url?: string | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          body_preview?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_key?: string;
          title?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyphrases?: string[] | null;
          canonical_url?: string | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          og_title?: string | null;
          og_description?: string | null;
          og_image_url?: string | null;
          body_preview?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };


      payment_webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_key: string;
          authority: string | null;
          ref_id: string | null;
          order_id: string | null;
          amount: number | null;
          status: string;
          payload: Json | null;
          verified: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider?: string;
          event_key: string;
          authority?: string | null;
          ref_id?: string | null;
          order_id?: string | null;
          amount?: number | null;
          status?: string;
          payload?: Json | null;
          verified?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          event_key?: string;
          authority?: string | null;
          ref_id?: string | null;
          order_id?: string | null;
          amount?: number | null;
          status?: string;
          payload?: Json | null;
          verified?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      url_redirects: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          status_code: number;
          is_active: boolean;
          note: string | null;
          source: string;
          hit_count: number;
          last_hit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_path: string;
          to_path: string;
          status_code?: number;
          is_active?: boolean;
          note?: string | null;
          source?: string;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_path?: string;
          to_path?: string;
          status_code?: number;
          is_active?: boolean;
          note?: string | null;
          source?: string;
          hit_count?: number;
          last_hit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      search_queries: {
        Row: {
          id: string;
          query: string;
          normalized_query: string | null;
          result_count: number;
          user_id: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          query: string;
          normalized_query?: string | null;
          result_count?: number;
          user_id?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          query?: string;
          normalized_query?: string | null;
          result_count?: number;
          user_id?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string | null;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          actor_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id?: string | null;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          actor_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string | null;
          action?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          actor_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      financial_audit_logs: {
        Row: {
          id: string;
          event_type: string;
          order_id: string | null;
          return_id: string | null;
          amount: number | null;
          currency: string;
          meta: Json | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          order_id?: string | null;
          return_id?: string | null;
          amount?: number | null;
          currency?: string;
          meta?: Json | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          order_id?: string | null;
          return_id?: string | null;
          amount?: number | null;
          currency?: string;
          meta?: Json | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      order_notes: {
        Row: {
          id: string;
          order_id: string;
          body: string;
          visibility: string;
          actor_type: string;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          body: string;
          visibility?: string;
          actor_type?: string;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          body?: string;
          visibility?: string;
          actor_type?: string;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      sms_outbox: {
        Row: {
          id: string;
          phone: string;
          body: string;
          status: string;
          meta: Json | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          phone: string;
          body: string;
          status?: string;
          meta?: Json | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          phone?: string;
          body?: string;
          status?: string;
          meta?: Json | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };

      stock_reservations: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          variant_id: string;
          quantity: number;
          status: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          variant_id: string;
          quantity: number;
          status?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          variant_id?: string;
          quantity?: number;
          status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      discount_uses: {
        Row: {
          id: string;
          discount_id: string;
          user_id: string | null;
          order_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          discount_id: string;
          user_id?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          discount_id?: string;
          user_id?: string | null;
          order_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      discount_reservations: {
        Row: {
          id: string;
          discount_id: string;
          user_id: string | null;
          session_id: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          discount_id: string;
          user_id?: string | null;
          session_id?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          discount_id?: string;
          user_id?: string | null;
          session_id?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      content_pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          body: string | null;
          status: string;
          is_published: boolean;
          meta_title: string | null;
          meta_description: string | null;
          focus_keyphrases: string[] | null;
          robots_index: boolean | null;
          robots_follow: boolean | null;
          canonical_url: string | null;
          blocks: Json | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          body?: string | null;
          status?: string;
          is_published?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          blocks?: Json | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          body?: string | null;
          status?: string;
          is_published?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          focus_keyphrases?: string[] | null;
          robots_index?: boolean | null;
          robots_follow?: boolean | null;
          canonical_url?: string | null;
          blocks?: Json | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      media_assets: {
        Row: {
          id: string;
          url: string;
          path: string | null;
          alt_text: string | null;
          mime_type: string | null;
          width: number | null;
          height: number | null;
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          path?: string | null;
          alt_text?: string | null;
          mime_type?: string | null;
          width?: number | null;
          height?: number | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          path?: string | null;
          alt_text?: string | null;
          mime_type?: string | null;
          width?: number | null;
          height?: number | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };


    };
    // Keep Views empty: a non-empty Views map breaks `.from(tableUnion)` overload
    // resolution in admin/backup helpers. Cast view queries at call sites instead.
    Views: Record<string, never>;
    Functions: {
      increment_discount_use: {
        Args: { p_code: string };
        Returns: boolean;
      };
      increment_variant_stock: {
        Args: { p_variant_id: string; p_qty: number };
        Returns: undefined;
      };
      reserve_variant_stock: {
        Args: { p_variant_id: string; p_qty: number; p_user_id: string; p_minutes?: number };
        Returns: boolean;
      };
      reserve_variant_stock_session: {
        Args: {
          p_variant_id: string;
          p_qty: number;
          p_session_id: string;
          p_minutes?: number;
        };
        Returns: boolean;
      };
      release_all_user_reservations: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      release_all_session_reservations: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      release_expired_stock_reservations: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      extend_user_reservations: {
        Args: { p_user_id: string; p_minutes?: number };
        Returns: undefined;
      };
      extend_session_reservations: {
        Args: { p_session_id: string; p_minutes?: number };
        Returns: undefined;
      };
      decrement_variant_stock: {
        Args: { p_variant_id: string; p_qty: number };
        Returns: boolean;
      };
      consume_user_reservations: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      consume_session_reservations: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      recompute_product_review_stats: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience aliases
export type Category = Tables<"categories">;
export type Brand = Tables<"brands">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type Attribute = Tables<"attributes">;
export type AttributeOption = Tables<"attribute_options">;
export type ProductImage = Tables<"product_images">;
export type SizeGuide = Tables<"size_guides">;
export type SizeGuideRow = Tables<"size_guide_rows">;
export type Profile = Tables<"profiles">;
export type Review = Tables<"reviews">;
export type Wishlist = Tables<"wishlists">;
export type Cart = Tables<"carts">;
export type CartItem = Tables<"cart_items">;
export type Discount = Tables<"discounts">;

// =====================================================
// Extended types (sizes, colors, tags) - migration 003
// =====================================================

export type Size = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Color = {
  id: string;
  name: string;
  slug: string;
  hex_code: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ProductTag = {
  id: string;
  product_id: string;
  tag_id: string;
  created_at: string;
};
