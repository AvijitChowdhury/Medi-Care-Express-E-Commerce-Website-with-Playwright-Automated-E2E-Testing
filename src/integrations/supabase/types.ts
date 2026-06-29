export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          text_bn: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text_bn: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text_bn?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: string
          sort_order: number
          subtitle_bn: string | null
          title_bn: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position: string
          sort_order?: number
          subtitle_bn?: string | null
          title_bn?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          subtitle_bn?: string | null
          title_bn?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name_bn: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name_bn: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name_bn?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name_bn: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name_bn: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name_bn?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          access_token: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          unread_admin: number
          unread_user: number
          user_id: string | null
          user_name: string
          username: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_admin?: number
          unread_user?: number
          user_id?: string | null
          user_name: string
          username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          unread_admin?: number
          unread_user?: number
          user_id?: string | null
          user_name?: string
          username?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_discount: number | null
          min_subtotal: number
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      incomplete_orders: {
        Row: {
          access_token: string
          cart: Json
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          payment_method: string | null
          recovered: boolean
          recovered_at: string | null
          recovered_order_id: string | null
          session_id: string
          shipping_address: string | null
          shipping_area: string | null
          shipping_city: string | null
          subtotal: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          cart?: Json
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recovered?: boolean
          recovered_at?: string | null
          recovered_order_id?: string | null
          session_id: string
          shipping_address?: string | null
          shipping_area?: string | null
          shipping_city?: string | null
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          cart?: Json
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recovered?: boolean
          recovered_at?: string | null
          recovered_order_id?: string | null
          session_id?: string
          shipping_address?: string | null
          shipping_area?: string | null
          shipping_city?: string | null
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          name_bn: string
          order_id: string
          product_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          name_bn: string
          order_id: string
          product_id?: string | null
          qty: number
          unit_price: number
        }
        Update: {
          id?: string
          image_url?: string | null
          name_bn?: string
          order_id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
        }
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
        ]
      }
      orders: {
        Row: {
          access_token: string
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivery_fee: number
          discount_amount: number
          due_amount: number
          id: string
          is_complete: boolean
          is_manual: boolean
          notes: string | null
          order_number: string
          paid_amount: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: string
          shipping_area: string | null
          shipping_city: string
          status: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id: number | null
          steadfast_sent_at: string | null
          steadfast_status: string | null
          steadfast_synced_at: string | null
          steadfast_tracking_code: string | null
          subtotal: number
          total: number
          uddoktapay_invoice_id: string | null
          uddoktapay_payment_method: string | null
          uddoktapay_raw: Json | null
          uddoktapay_sender_number: string | null
          uddoktapay_transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivery_fee?: number
          discount_amount?: number
          due_amount?: number
          id?: string
          is_complete?: boolean
          is_manual?: boolean
          notes?: string | null
          order_number?: string
          paid_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address: string
          shipping_area?: string | null
          shipping_city: string
          status?: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id?: number | null
          steadfast_sent_at?: string | null
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          subtotal: number
          total: number
          uddoktapay_invoice_id?: string | null
          uddoktapay_payment_method?: string | null
          uddoktapay_raw?: Json | null
          uddoktapay_sender_number?: string | null
          uddoktapay_transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivery_fee?: number
          discount_amount?: number
          due_amount?: number
          id?: string
          is_complete?: boolean
          is_manual?: boolean
          notes?: string | null
          order_number?: string
          paid_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: string
          shipping_area?: string | null
          shipping_city?: string
          status?: Database["public"]["Enums"]["order_status"]
          steadfast_consignment_id?: number | null
          steadfast_sent_at?: string | null
          steadfast_status?: string | null
          steadfast_synced_at?: string | null
          steadfast_tracking_code?: string | null
          subtotal?: number
          total?: number
          uddoktapay_invoice_id?: string | null
          uddoktapay_payment_method?: string | null
          uddoktapay_raw?: Json | null
          uddoktapay_sender_number?: string | null
          uddoktapay_transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          image: string | null
          name_bn: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          image?: string | null
          name_bn: string
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          image?: string | null
          name_bn?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description_bn: string | null
          gallery: string[]
          id: string
          images: string[]
          is_active: boolean
          is_featured: boolean
          name_bn: string
          price: number
          product_type: string
          related_product_ids: string[]
          shipping_cost: number | null
          short_description_bn: string | null
          slug: string
          stock: number
          tags: string[]
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description_bn?: string | null
          gallery?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          name_bn: string
          price: number
          product_type?: string
          related_product_ids?: string[]
          shipping_cost?: number | null
          short_description_bn?: string | null
          slug: string
          stock?: number
          tags?: string[]
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description_bn?: string | null
          gallery?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          name_bn?: string
          price?: number
          product_type?: string
          related_product_ids?: string[]
          shipping_cost?: number | null
          short_description_bn?: string | null
          slug?: string
          stock?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          author_name: string
          body_bn: string | null
          created_at: string
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          title: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          author_name: string
          body_bn?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          title?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          author_name?: string
          body_bn?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          advance_percent: number
          contact_email: string | null
          contact_phone: string | null
          delivery_fee_inside: number
          delivery_fee_outside: number
          id: number
          updated_at: string
        }
        Insert: {
          advance_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          delivery_fee_inside?: number
          delivery_fee_outside?: number
          id?: number
          updated_at?: string
        }
        Update: {
          advance_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          delivery_fee_inside?: number
          delivery_fee_outside?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          code: string
          discount: number
          discount_type: string
          discount_value: number
        }[]
      }
      get_chat_messages: {
        Args: { p_access_token: string; p_session_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          sender: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: { Args: { p_code: string }; Returns: undefined }
      mark_incomplete_order_recovered: {
        Args: {
          p_access_token: string
          p_order_id: string
          p_session_id: string
        }
        Returns: undefined
      }
      post_chat_message: {
        Args: { p_access_token: string; p_body: string; p_session_id: string }
        Returns: string
      }
      start_chat_session: {
        Args: { p_name: string; p_username: string; p_welcome?: string }
        Returns: {
          access_token: string
          session_id: string
        }[]
      }
      upsert_incomplete_order: {
        Args: {
          p_access_token: string
          p_cart: Json
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_notes: string
          p_payment_method: string
          p_session_id: string
          p_shipping_address: string
          p_shipping_area: string
          p_shipping_city: string
          p_subtotal: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "partial_online" | "full_online"
      payment_status: "unpaid" | "partial" | "paid" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "partial_online", "full_online"],
      payment_status: ["unpaid", "partial", "paid", "refunded"],
    },
  },
} as const
