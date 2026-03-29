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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string
          company_id: string | null
          created_at: string
          currency: string
          current_balance: number
          id: string
          initial_balance: number
          is_active: boolean
          is_default: boolean
          rib: string | null
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_default?: boolean
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_default?: boolean
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          bank_account_id: string
          company_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string
          id: string
          imported_at: string
          is_reconciled: boolean
          reconciled_at: string | null
          reconciled_by: string | null
          reconciled_payment_id: string | null
          reference: string | null
          transaction_date: string
        }
        Insert: {
          bank_account_id: string
          company_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          id?: string
          imported_at?: string
          is_reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_payment_id?: string | null
          reference?: string | null
          transaction_date: string
        }
        Update: {
          bank_account_id?: string
          company_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          id?: string
          imported_at?: string
          is_reconciled?: boolean
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_payment_id?: string | null
          reference?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciled_payment_id_fkey"
            columns: ["reconciled_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_movements: {
        Row: {
          amount: number
          cash_register_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          payment_id: string | null
          reference: string | null
        }
        Insert: {
          amount?: number
          cash_register_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          payment_id?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          payment_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          assigned_user_id: string | null
          code: string
          company_id: string | null
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          capital: number | null
          city: string | null
          cnss: string | null
          created_at: string
          email: string | null
          fax: string | null
          forme_juridique: string | null
          ice: string | null
          id: string
          if_number: string | null
          is_active: boolean
          logo_url: string | null
          patente: string | null
          phone: string | null
          postal_code: string | null
          raison_sociale: string
          rc: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          capital?: number | null
          city?: string | null
          cnss?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          forme_juridique?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          logo_url?: string | null
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale?: string
          rc?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          capital?: number | null
          city?: string | null
          cnss?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          forme_juridique?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          logo_url?: string | null
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale?: string
          rc?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          bank_name: string | null
          bank_rib: string | null
          bank_swift: string | null
          capital: number | null
          city: string | null
          cnss: string | null
          created_at: string
          email: string | null
          fax: string | null
          forme_juridique: string | null
          ice: string | null
          id: string
          if_number: string | null
          logo_url: string | null
          patente: string | null
          phone: string | null
          postal_code: string | null
          raison_sociale: string
          rc: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          bank_rib?: string | null
          bank_swift?: string | null
          capital?: number | null
          city?: string | null
          cnss?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          forme_juridique?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          logo_url?: string | null
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale?: string
          rc?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          bank_rib?: string | null
          bank_swift?: string | null
          capital?: number | null
          city?: string | null
          cnss?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          forme_juridique?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          logo_url?: string | null
          patente?: string | null
          phone?: string | null
          postal_code?: string | null
          raison_sociale?: string
          rc?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_lines: {
        Row: {
          company_id: string | null
          created_at: string
          credit_note_id: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          credit_note_id: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          credit_note_id?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_lines_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          credit_note_date: string
          credit_note_number: string
          credit_note_type: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          reason: string
          status: string
          subtotal_ht: number
          supplier_id: string | null
          total_ttc: number
          total_tva: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number: string
          credit_note_type: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string
          status?: string
          subtotal_ht?: number
          supplier_id?: string | null
          total_ttc?: number
          total_tva?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number?: string
          credit_note_type?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string
          status?: string
          subtotal_ht?: number
          supplier_id?: string | null
          total_ttc?: number
          total_tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_name: string | null
          city: string | null
          code: string
          company_id: string | null
          contact_name: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          fax: string | null
          iban: string | null
          ice: string | null
          id: string
          if_number: string | null
          is_active: boolean
          name: string
          notes: string | null
          patente: string | null
          payment_terms: string | null
          phone: string | null
          phone2: string | null
          rc: string | null
          rib: string | null
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          fax?: string | null
          iban?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          patente?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          rc?: string | null
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          fax?: string | null
          iban?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          patente?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          rc?: string | null
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string
          delivery_number: string
          id: string
          invoice_id: string | null
          notes: string | null
          sales_order_id: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string
          delivery_number: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string
          delivery_number?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_lines: {
        Row: {
          company_id: string | null
          created_at: string
          delivery_id: string
          description: string
          discount_percent: number
          id: string
          product_id: string | null
          quantity: number
          sales_order_line_id: string | null
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivery_id: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          sales_order_line_id?: string | null
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivery_id?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          sales_order_line_id?: string | null
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_lines_sales_order_line_id_fkey"
            columns: ["sales_order_line_id"]
            isOneToOne: false
            referencedRelation: "sales_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: {
          company_id: string | null
          created_at: string
          doc_id: string
          doc_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_audio: boolean
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          doc_id: string
          doc_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_audio?: boolean
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          doc_id?: string
          doc_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_audio?: boolean
          uploaded_by?: string | null
        }
        Relationships: []
      }
      document_counters: {
        Row: {
          company_id: string | null
          doc_type: string
          doc_year: number
          id: string
          last_number: number
        }
        Insert: {
          company_id?: string | null
          doc_type: string
          doc_year: number
          id?: string
          last_number?: number
        }
        Update: {
          company_id?: string | null
          doc_type?: string
          doc_year?: number
          id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          company_id: string | null
          created_at: string
          document_type: string
          id: string
          is_active: boolean
          status: string
          template_json: Json
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          document_type: string
          id?: string
          is_active?: boolean
          status?: string
          template_json?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          document_type?: string
          id?: string
          is_active?: boolean
          status?: string
          template_json?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string | null
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_ht: number
          amount_ttc: number
          amount_tva: number
          bank_account_id: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          expense_number: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string
          supplier_id: string | null
          tva_rate: number
          updated_at: string
        }
        Insert: {
          amount_ht?: number
          amount_ttc?: number
          amount_tva?: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          expense_number: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          supplier_id?: string | null
          tva_rate?: number
          updated_at?: string
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          amount_tva?: number
          bank_account_id?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          expense_number?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          supplier_id?: string | null
          tva_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustment_lines: {
        Row: {
          adjustment_id: string
          company_id: string | null
          counted_qty: number
          created_at: string
          difference: number
          id: string
          product_id: string
          sort_order: number
          system_qty: number
        }
        Insert: {
          adjustment_id: string
          company_id?: string | null
          counted_qty?: number
          created_at?: string
          difference?: number
          id?: string
          product_id: string
          sort_order?: number
          system_qty?: number
        }
        Update: {
          adjustment_id?: string
          company_id?: string | null
          counted_qty?: number
          created_at?: string
          difference?: number
          id?: string
          product_id?: string
          sort_order?: number
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustment_lines_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "inventory_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustment_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_number: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          validated_by: string | null
          warehouse_id: string
        }
        Insert: {
          adjustment_number: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          validated_by?: string | null
          warehouse_id: string
        }
        Update: {
          adjustment_number?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          validated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attachments: {
        Row: {
          company_id: string | null
          created_at: string
          credit_note_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          invoice_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          credit_note_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          invoice_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          credit_note_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          invoice_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          discount_percent: number
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reception_links: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          invoice_id: string
          reception_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          reception_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          reception_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reception_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reception_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reception_links_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          admin_validated_at: string | null
          admin_validated_by: string | null
          cancel_reason: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          global_discount_amount: number
          global_discount_type: string
          global_discount_value: number
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          payment_terms: string | null
          purchase_order_id: string | null
          reception_id: string | null
          remaining_balance: number
          sales_order_id: string | null
          status: string
          subtotal_ht: number
          supplier_id: string | null
          total_ttc: number
          total_tva: number
          updated_at: string
        }
        Insert: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type: string
          notes?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          reception_id?: string | null
          remaining_balance?: number
          sales_order_id?: string | null
          status?: string
          subtotal_ht?: number
          supplier_id?: string | null
          total_ttc?: number
          total_tva?: number
          updated_at?: string
        }
        Update: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          reception_id?: string | null
          remaining_balance?: number
          sales_order_id?: string | null
          status?: string
          subtotal_ht?: number
          supplier_id?: string | null
          total_ttc?: number
          total_tva?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_terms: {
        Row: {
          company_id: string | null
          created_at: string
          days: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          days?: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          days?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cheque_bank: string | null
          cheque_date: string | null
          cheque_number: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          is_override: boolean
          lcn_due_date: string | null
          notes: string | null
          override_reason: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          reference: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_override?: boolean
          lcn_due_date?: string | null
          notes?: string | null
          override_reason?: string | null
          payment_date?: string
          payment_method?: string
          payment_number: string
          payment_type: string
          reference?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cheque_bank?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          is_override?: boolean
          lcn_due_date?: string | null
          notes?: string | null
          override_reason?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_type?: string
          reference?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          id: string
          name_ar: string
          name_fr: string
          resource: string
        }
        Insert: {
          action: string
          id?: string
          name_ar?: string
          name_fr: string
          resource: string
        }
        Update: {
          action?: string
          id?: string
          name_ar?: string
          name_fr?: string
          resource?: string
        }
        Relationships: []
      }
      product_attribute_line_values: {
        Row: {
          company_id: string | null
          id: string
          line_id: string
          price_extra: number
          value_id: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          line_id: string
          price_extra?: number
          value_id: string
        }
        Update: {
          company_id?: string | null
          id?: string
          line_id?: string
          price_extra?: number
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_line_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_line_values_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_line_values_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_values"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_lines: {
        Row: {
          attribute_id: string
          company_id: string | null
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_lines_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string
          id: string
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string
          display_type: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_type?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_type?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          company_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          product_id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          product_id: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          product_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
          variant_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          variant_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          company_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          product_id: string
          purchase_price: number | null
          sale_price: number | null
          sku: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          barcode?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id: string
          purchase_price?: number | null
          sale_price?: number | null
          sku?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          barcode?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id?: string
          purchase_price?: number | null
          sale_price?: number | null
          sku?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          barcode: string | null
          can_be_purchased: boolean
          can_be_sold: boolean
          category: string | null
          category_id: string | null
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_stock: number
          name: string
          product_type: string
          purchase_price: number
          purchase_unit: string
          sale_price: number
          tva_rate: number
          unit: string
          updated_at: string
          weight: number
        }
        Insert: {
          barcode?: string | null
          can_be_purchased?: boolean
          can_be_sold?: boolean
          category?: string | null
          category_id?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name: string
          product_type?: string
          purchase_price?: number
          purchase_unit?: string
          sale_price?: number
          tva_rate?: number
          unit?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          barcode?: string | null
          can_be_purchased?: boolean
          can_be_sold?: boolean
          category?: string | null
          category_id?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_stock?: number
          name?: string
          product_type?: string
          purchase_price?: number
          purchase_unit?: string
          sale_price?: number
          tva_rate?: number
          unit?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          discount_percent: number
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          received_qty: number
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_qty?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_qty?: number
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          admin_validated_at: string | null
          admin_validated_by: string | null
          cancel_reason: string | null
          company_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          global_discount_amount: number
          global_discount_type: string
          global_discount_value: number
          id: string
          notes: string | null
          order_date: string
          order_number: string
          payment_terms: string | null
          purchase_request_id: string | null
          request_id: string | null
          status: string
          subtotal_ht: number
          supplier_id: string
          total_ttc: number
          total_tva: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          payment_terms?: string | null
          purchase_request_id?: string | null
          request_id?: string | null
          status?: string
          subtotal_ht?: number
          supplier_id: string
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_terms?: string | null
          purchase_request_id?: string | null
          request_id?: string | null
          status?: string
          subtotal_ht?: number
          supplier_id?: string
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_lines: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          product_id: string | null
          quantity: number
          request_id: string
          sort_order: number
          supplier_discount_percent: number | null
          supplier_line_total: number | null
          supplier_tva_rate: number | null
          supplier_unit_price: number | null
          tva_rate: number | null
          unit: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          request_id: string
          sort_order?: number
          supplier_discount_percent?: number | null
          supplier_line_total?: number | null
          supplier_tva_rate?: number | null
          supplier_unit_price?: number | null
          tva_rate?: number | null
          unit?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          request_id?: string
          sort_order?: number
          supplier_discount_percent?: number | null
          supplier_line_total?: number | null
          supplier_tva_rate?: number | null
          supplier_unit_price?: number | null
          tva_rate?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          company_id: string | null
          created_at: string
          currency_id: string | null
          id: string
          needed_date: string | null
          notes: string | null
          request_date: string
          request_number: string
          requested_by: string | null
          status: string
          supplier_id: string | null
          supplier_notes: string | null
          supplier_reference: string | null
          supplier_response_date: string | null
          total_ht: number
          total_ttc: number
          total_tva: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          id?: string
          needed_date?: string | null
          notes?: string | null
          request_date?: string
          request_number: string
          requested_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_notes?: string | null
          supplier_reference?: string | null
          supplier_response_date?: string | null
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency_id?: string | null
          id?: string
          needed_date?: string | null
          notes?: string | null
          request_date?: string
          request_number?: string
          requested_by?: string | null
          status?: string
          supplier_id?: string | null
          supplier_notes?: string | null
          supplier_reference?: string | null
          supplier_response_date?: string | null
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_lines: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          discount_percent: number
          id: string
          product_id: string | null
          quantity: number
          quotation_id: string
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_lines_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          admin_validated_at: string | null
          admin_validated_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          global_discount_amount: number
          global_discount_type: string
          global_discount_value: number
          id: string
          notes: string | null
          payment_terms: string | null
          quotation_date: string
          quotation_number: string
          sales_order_id: string | null
          sent_at: string | null
          status: string
          subtotal_ht: number
          total_ttc: number
          total_tva: number
          updated_at: string
          validity_date: string | null
          warehouse_id: string | null
        }
        Insert: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number: string
          sales_order_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validity_date?: string | null
          warehouse_id?: string | null
        }
        Update: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          notes?: string | null
          payment_terms?: string | null
          quotation_date?: string
          quotation_number?: string
          sales_order_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validity_date?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_line_allocations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          reception_id: string
          reception_line_id: string
          warehouse_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          reception_id: string
          reception_line_id: string
          warehouse_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          reception_id?: string
          reception_line_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reception_line_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_line_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_line_allocations_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_line_allocations_reception_line_id_fkey"
            columns: ["reception_line_id"]
            isOneToOne: false
            referencedRelation: "reception_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_line_allocations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_lines: {
        Row: {
          company_id: string | null
          created_at: string
          description: string
          discount_percent: number
          id: string
          product_id: string | null
          purchase_order_line_id: string | null
          quantity: number
          reception_id: string
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          purchase_order_line_id?: string | null
          quantity?: number
          reception_id: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          product_id?: string | null
          purchase_order_line_id?: string | null
          quantity?: number
          reception_id?: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "reception_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_lines_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      receptions: {
        Row: {
          cancel_reason: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          purchase_order_id: string | null
          reception_date: string
          reception_number: string
          status: string
          supplier_id: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          cancel_reason?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          reception_date?: string
          reception_number: string
          status?: string
          supplier_id: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          cancel_reason?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          purchase_order_id?: string | null
          reception_date?: string
          reception_number?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      record_rules: {
        Row: {
          applies_to_role_id: string | null
          domain_json: Json
          id: string
          is_active: boolean
          name: string
          priority: number
          resource: string
        }
        Insert: {
          applies_to_role_id?: string | null
          domain_json?: Json
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          resource: string
        }
        Update: {
          applies_to_role_id?: string | null
          domain_json?: Json
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_rules_applies_to_role_id_fkey"
            columns: ["applies_to_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string
          message: string | null
          reminder_date: string
          reminder_type: string
          sent_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id: string
          message?: string | null
          reminder_date?: string
          reminder_type?: string
          sent_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string
          message?: string | null
          reminder_date?: string
          reminder_type?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          approval_level: number | null
          created_at: string
          id: string
          permission_id: string
          requires_validation: boolean
          role_id: string
          scope: string
        }
        Insert: {
          approval_level?: number | null
          created_at?: string
          id?: string
          permission_id: string
          requires_validation?: boolean
          role_id: string
          scope?: string
        }
        Update: {
          approval_level?: number | null
          created_at?: string
          id?: string
          permission_id?: string
          requires_validation?: boolean
          role_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          module: string
          name_ar: string
          name_fr: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string
          name_ar?: string
          name_fr: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string
          name_ar?: string
          name_fr?: string
        }
        Relationships: []
      }
      sales_order_lines: {
        Row: {
          company_id: string | null
          created_at: string
          delivered_qty: number
          description: string
          discount_percent: number
          id: string
          invoiced_qty: number
          product_id: string | null
          quantity: number
          sales_order_id: string
          sort_order: number
          total_ht: number
          total_ttc: number
          total_tva: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivered_qty?: number
          description?: string
          discount_percent?: number
          id?: string
          invoiced_qty?: number
          product_id?: string | null
          quantity?: number
          sales_order_id: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivered_qty?: number
          description?: string
          discount_percent?: number
          id?: string
          invoiced_qty?: number
          product_id?: string | null
          quantity?: number
          sales_order_id?: string
          sort_order?: number
          total_ht?: number
          total_ttc?: number
          total_tva?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          admin_validated_at: string | null
          admin_validated_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          global_discount_amount: number
          global_discount_type: string
          global_discount_value: number
          id: string
          invoiced_at: string | null
          notes: string | null
          order_date: string
          order_number: string
          payment_terms: string | null
          quotation_id: string | null
          status: string
          subtotal_ht: number
          total_ttc: number
          total_tva: number
          updated_at: string
          validity_date: string | null
          warehouse_id: string | null
        }
        Insert: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          invoiced_at?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          payment_terms?: string | null
          quotation_id?: string | null
          status?: string
          subtotal_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validity_date?: string | null
          warehouse_id?: string | null
        }
        Update: {
          admin_validated_at?: string | null
          admin_validated_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          global_discount_amount?: number
          global_discount_type?: string
          global_discount_value?: number
          id?: string
          invoiced_at?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_terms?: string | null
          quotation_id?: string | null
          status?: string
          subtotal_ht?: number
          total_ttc?: number
          total_tva?: number
          updated_at?: string
          validity_date?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          cmup: number
          company_id: string | null
          id: string
          product_id: string
          stock_on_hand: number
          stock_reserved: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cmup?: number
          company_id?: string | null
          id?: string
          product_id: string
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cmup?: number
          company_id?: string | null
          id?: string
          product_id?: string
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          sort_order: number
          transfer_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          sort_order?: number
          transfer_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sort_order?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          status: string
          to_warehouse_id: string
          transfer_number: string
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id: string
          transfer_number: string
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id?: string
          transfer_number?: string
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoice_lines: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          product_id: string | null
          quantity: number
          supplier_invoice_id: string
          total_ht: number
          total_ttc: number
          unit: string | null
          unit_price_ht: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          supplier_invoice_id: string
          total_ht?: number
          total_ttc?: number
          unit?: string | null
          unit_price_ht?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          product_id?: string | null
          quantity?: number
          supplier_invoice_id?: string
          total_ht?: number
          total_ttc?: number
          unit?: string | null
          unit_price_ht?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_name: string | null
          city: string | null
          code: string
          company_id: string | null
          contact_name: string | null
          created_at: string
          credit_limit: number
          email: string | null
          fax: string | null
          iban: string | null
          ice: string | null
          id: string
          if_number: string | null
          is_active: boolean
          name: string
          notes: string | null
          patente: string | null
          payment_terms: string | null
          phone: string | null
          phone2: string | null
          rc: string | null
          rib: string | null
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          fax?: string | null
          iban?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          patente?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          rc?: string | null
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          fax?: string | null
          iban?: string | null
          ice?: string | null
          id?: string
          if_number?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          patente?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          rc?: string | null
          rib?: string | null
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          allow_admin_overrides: boolean
          allow_negative_stock: boolean
          created_at: string
          default_currency: string
          default_payment_terms: string
          default_tva: number
          doc_numbering_format: string
          enable_attachments: boolean
          id: string
          require_double_validation: boolean
          tva_rates: Json
          updated_at: string
        }
        Insert: {
          allow_admin_overrides?: boolean
          allow_negative_stock?: boolean
          created_at?: string
          default_currency?: string
          default_payment_terms?: string
          default_tva?: number
          doc_numbering_format?: string
          enable_attachments?: boolean
          id?: string
          require_double_validation?: boolean
          tva_rates?: Json
          updated_at?: string
        }
        Update: {
          allow_admin_overrides?: boolean
          allow_negative_stock?: boolean
          created_at?: string
          default_currency?: string
          default_payment_terms?: string
          default_tva?: number
          doc_numbering_format?: string
          enable_attachments?: boolean
          id?: string
          require_double_validation?: boolean
          tva_rates?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tva_rates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rate: number
          sort_order: number
          tva_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          sort_order?: number
          tva_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          sort_order?: number
          tva_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          symbol: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          symbol: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          symbol?: string
        }
        Relationships: []
      }
      uom_conversions: {
        Row: {
          created_at: string
          factor: number
          from_unit_id: string
          id: string
          is_active: boolean
          to_unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factor?: number
          from_unit_id: string
          id?: string
          is_active?: boolean
          to_unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factor?: number
          from_unit_id?: string
          id?: string
          is_active?: boolean
          to_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uom_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_primary: boolean
          role: string | null
          role_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
          role_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_legacy: {
        Row: {
          created_at: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      variant_attribute_values: {
        Row: {
          attribute_id: string
          company_id: string | null
          id: string
          value_id: string
          variant_id: string
        }
        Insert: {
          attribute_id: string
          company_id?: string | null
          id?: string
          value_id: string
          variant_id: string
        }
        Update: {
          attribute_id?: string
          company_id?: string | null
          id?: string
          value_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_company_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      next_document_number:
        | { Args: { p_type: string }; Returns: string }
        | { Args: { p_company_id?: string; p_type: string }; Returns: string }
      user_has_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      validate_same_company_ref: {
        Args: { _company_id: string; _ref_id: string; _ref_table: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "accountant"
        | "sales"
        | "stock_manager"
        | "purchase"
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
      app_role: [
        "super_admin",
        "admin",
        "accountant",
        "sales",
        "stock_manager",
        "purchase",
      ],
    },
  },
} as const
