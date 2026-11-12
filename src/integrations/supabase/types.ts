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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      announcement_comments: {
        Row: {
          announcement_id: string
          author_name: string | null
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          level: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          level?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          level?: string
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          body: string
          category_id: string
          created_at: string
          external_label: string | null
          external_url: string | null
          id: string
          is_required: boolean
          is_tool: boolean
          min_role: string | null
          position: number
          reading_minutes: number
          resources: Json
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          category_id: string
          created_at?: string
          external_label?: string | null
          external_url?: string | null
          id?: string
          is_required?: boolean
          is_tool?: boolean
          min_role?: string | null
          position?: number
          reading_minutes?: number
          resources?: Json
          slug: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          external_label?: string | null
          external_url?: string | null
          id?: string
          is_required?: boolean
          is_tool?: boolean
          min_role?: string | null
          position?: number
          reading_minutes?: number
          resources?: Json
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          alias: string | null
          bank: string
          cbu: string | null
          created_at: string
          holder: string
          id: string
          note: string | null
          position: number
        }
        Insert: {
          alias?: string | null
          bank: string
          cbu?: string | null
          created_at?: string
          holder?: string
          id?: string
          note?: string | null
          position?: number
        }
        Update: {
          alias?: string | null
          bank?: string
          cbu?: string | null
          created_at?: string
          holder?: string
          id?: string
          note?: string | null
          position?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          announcement_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          event_date: string
          id: string
          kind: string
          note: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          announcement_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          kind?: string
          note?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          announcement_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          kind?: string
          note?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          accent: string
          created_at: string
          id: string
          name: string
          objectives: string[]
          position: number
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          created_at?: string
          id?: string
          name: string
          objectives?: string[]
          position?: number
          slug: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          id?: string
          name?: string
          objectives?: string[]
          position?: number
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chattigo_responses: {
        Row: {
          body: string
          campaign: string
          created_at: string
          id: string
          position: number
          title: string
          uploaded_by: string | null
        }
        Insert: {
          body: string
          campaign?: string
          created_at?: string
          id?: string
          position?: number
          title: string
          uploaded_by?: string | null
        }
        Update: {
          body?: string
          campaign?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      dash_accounts: {
        Row: {
          abogado: string | null
          cuenta: string | null
          cuotas: number | null
          cuotas_pagas: number | null
          cuotas_restantes: number | null
          deuda: number | null
          dias_sin_pago: number | null
          dias_ultimo_llamado: number | null
          dni: string
          email: string | null
          id: number
          localidad: string | null
          nombre: string | null
          padron: string | null
          pendiente_imputacion: boolean
          proxima_gestion: string | null
          refi_cuotas: number | null
          refi_dias_sin_pago: number | null
          refi_estado: string | null
          refi_fecha: string | null
          refi_monto_cuota: number | null
          refi_vencimiento: string | null
          responsable: string | null
          riesgo: string | null
          saldo_vencido: number | null
          situacion: string | null
          telefono: string | null
          ultimo_llamado: string | null
          ultimo_pago: string | null
          upload_id: string
        }
        Insert: {
          abogado?: string | null
          cuenta?: string | null
          cuotas?: number | null
          cuotas_pagas?: number | null
          cuotas_restantes?: number | null
          deuda?: number | null
          dias_sin_pago?: number | null
          dias_ultimo_llamado?: number | null
          dni: string
          email?: string | null
          id?: number
          localidad?: string | null
          nombre?: string | null
          padron?: string | null
          pendiente_imputacion?: boolean
          proxima_gestion?: string | null
          refi_cuotas?: number | null
          refi_dias_sin_pago?: number | null
          refi_estado?: string | null
          refi_fecha?: string | null
          refi_monto_cuota?: number | null
          refi_vencimiento?: string | null
          responsable?: string | null
          riesgo?: string | null
          saldo_vencido?: number | null
          situacion?: string | null
          telefono?: string | null
          ultimo_llamado?: string | null
          ultimo_pago?: string | null
          upload_id: string
        }
        Update: {
          abogado?: string | null
          cuenta?: string | null
          cuotas?: number | null
          cuotas_pagas?: number | null
          cuotas_restantes?: number | null
          deuda?: number | null
          dias_sin_pago?: number | null
          dias_ultimo_llamado?: number | null
          dni?: string
          email?: string | null
          id?: number
          localidad?: string | null
          nombre?: string | null
          padron?: string | null
          pendiente_imputacion?: boolean
          proxima_gestion?: string | null
          refi_cuotas?: number | null
          refi_dias_sin_pago?: number | null
          refi_estado?: string | null
          refi_fecha?: string | null
          refi_monto_cuota?: number | null
          refi_vencimiento?: string | null
          responsable?: string | null
          riesgo?: string | null
          saldo_vencido?: number | null
          situacion?: string | null
          telefono?: string | null
          ultimo_llamado?: string | null
          ultimo_pago?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dash_accounts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "dash_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      dash_pending: {
        Row: {
          abogado: string | null
          dni: string | null
          estado: string | null
          fecha: string | null
          id: number
          monto: number | null
          nombre: string | null
          padron: string | null
          responsable: string | null
          upload_id: string
        }
        Insert: {
          abogado?: string | null
          dni?: string | null
          estado?: string | null
          fecha?: string | null
          id?: number
          monto?: number | null
          nombre?: string | null
          padron?: string | null
          responsable?: string | null
          upload_id: string
        }
        Update: {
          abogado?: string | null
          dni?: string | null
          estado?: string | null
          fecha?: string | null
          id?: number
          monto?: number | null
          nombre?: string | null
          padron?: string | null
          responsable?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dash_pending_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "dash_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      dash_uploads: {
        Row: {
          file_name: string
          id: string
          rows_count: number
          status: string
          summary: Json
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          id?: string
          rows_count?: number
          status?: string
          summary?: Json
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          id?: string
          rows_count?: number
          status?: string
          summary?: Json
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      editable_sections: {
        Row: {
          body: string
          key: string
          links: Json
          points: Json
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          key: string
          links?: Json
          points?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          key?: string
          links?: Json
          points?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          author_id: string | null
          author_name: string
          caption: string
          created_at: string
          id: string
          url: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          caption?: string
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          caption?: string
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      internal_chat_members: {
        Row: {
          chat_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          body: string
          chat_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body: string
          chat_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chat_reads: {
        Row: {
          chat_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_reads_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_chat_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chats: {
        Row: {
          created_at: string
          created_by: string
          direct_key: string | null
          id: string
          kind: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          direct_key?: string | null
          id?: string
          kind: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          direct_key?: string | null
          id?: string
          kind?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kudos: {
        Row: {
          created_at: string
          from_name: string
          from_user_id: string
          id: string
          message: string
          to_name: string
        }
        Insert: {
          created_at?: string
          from_name?: string
          from_user_id: string
          id?: string
          message?: string
          to_name: string
        }
        Update: {
          created_at?: string
          from_name?: string
          from_user_id?: string
          id?: string
          message?: string
          to_name?: string
        }
        Relationships: []
      }
      management_dashboard: {
        Row: {
          data: Json
          file_name: string | null
          id: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          data?: Json
          file_name?: string | null
          id?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          data?: Json
          file_name?: string | null
          id?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      official_files: {
        Row: {
          file_name: string
          file_path: string
          key: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          key: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: []
      }
      padron_entries: {
        Row: {
          created_at: string
          dni: string
          extra: Json
          gestor: string | null
          id: string
          instancia: string
          saldo: number | null
          titular: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          dni: string
          extra?: Json
          gestor?: string | null
          id?: string
          instancia: string
          saldo?: number | null
          titular?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          dni?: string
          extra?: Json
          gestor?: string | null
          id?: string
          instancia?: string
          saldo?: number | null
          titular?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      padron_uploads: {
        Row: {
          file_name: string | null
          instancia: string
          rows_count: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name?: string | null
          instancia: string
          rows_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string | null
          instancia?: string
          rows_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          alerta: string | null
          cliente: string | null
          created_at: string
          cuotas: string | null
          dni: string
          estado: string | null
          extra: Json
          gestor: string | null
          id: string
          monto: number | null
          proximo_vencimiento: string | null
          uploaded_by: string | null
        }
        Insert: {
          alerta?: string | null
          cliente?: string | null
          created_at?: string
          cuotas?: string | null
          dni?: string
          estado?: string | null
          extra?: Json
          gestor?: string | null
          id?: string
          monto?: number | null
          proximo_vencimiento?: string | null
          uploaded_by?: string | null
        }
        Update: {
          alerta?: string | null
          cliente?: string | null
          created_at?: string
          cuotas?: string | null
          dni?: string
          estado?: string | null
          extra?: Json
          gestor?: string | null
          id?: string
          monto?: number | null
          proximo_vencimiento?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      piso_config: {
        Row: {
          coeficiente: number
          id: number
        }
        Insert: {
          coeficiente: number
          id?: number
        }
        Update: {
          coeficiente?: number
          id?: number
        }
        Relationships: []
      }
      piso_factors: {
        Row: {
          abogado: string
          factor: number
          riesgo: string
        }
        Insert: {
          abogado: string
          factor: number
          riesgo: string
        }
        Update: {
          abogado?: string
          factor?: number
          riesgo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          created_at: string
          department: string | null
          first_name: string | null
          full_name: string
          gm_username: string | null
          id: string
          internal_email: string | null
          last_name: string | null
          microsip_ext: string | null
          role_title: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          department?: string | null
          first_name?: string | null
          full_name?: string
          gm_username?: string | null
          id: string
          internal_email?: string | null
          last_name?: string | null
          microsip_ext?: string | null
          role_title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          department?: string | null
          first_name?: string | null
          full_name?: string
          gm_username?: string | null
          id?: string
          internal_email?: string | null
          last_name?: string | null
          microsip_ext?: string | null
          role_title?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          article_id: string
          completed_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          completed_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      staff_directory: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          created_at: string
          full_name: string
          gm_username: string | null
          id: string
          internal_email: string | null
          kind: string
          microsip_ext: string | null
          nickname: string | null
          position: number
          role_title: string | null
          team: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
          whatsapp_alt: string | null
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          full_name: string
          gm_username?: string | null
          id?: string
          internal_email?: string | null
          kind?: string
          microsip_ext?: string | null
          nickname?: string | null
          position?: number
          role_title?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          whatsapp_alt?: string | null
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          created_at?: string
          full_name?: string
          gm_username?: string | null
          id?: string
          internal_email?: string | null
          kind?: string
          microsip_ext?: string | null
          nickname?: string | null
          position?: number
          role_title?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
          whatsapp_alt?: string | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          anonymous: boolean
          author_name: string | null
          body: string
          created_at: string
          id: string
          status: string
          topic: string
          user_id: string | null
        }
        Insert: {
          anonymous?: boolean
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          status?: string
          topic?: string
          user_id?: string | null
        }
        Update: {
          anonymous?: boolean
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          status?: string
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string
          description: string
          id: string
          leader: string | null
          members: string[]
          monthly_goal: number
          name: string
          position: number
          recovered: number
          updated_at: string
        }
        Insert: {
          color?: string
          description?: string
          id?: string
          leader?: string | null
          members?: string[]
          monthly_goal?: number
          name: string
          position?: number
          recovered?: number
          updated_at?: string
        }
        Update: {
          color?: string
          description?: string
          id?: string
          leader?: string | null
          members?: string[]
          monthly_goal?: number
          name?: string
          position?: number
          recovered?: number
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
          role: Database["public"]["Enums"]["app_role"]
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
      vacations: {
        Row: {
          created_at: string
          days: number | null
          end_date: string
          id: string
          note: string | null
          person_name: string
          priority: string | null
          source: string
          start_date: string
          status: string
          team: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          days?: number | null
          end_date: string
          id?: string
          note?: string | null
          person_name: string
          priority?: string | null
          source?: string
          start_date: string
          status?: string
          team?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          days?: number | null
          end_date?: string
          id?: string
          note?: string | null
          person_name?: string
          priority?: string | null
          source?: string
          start_date?: string
          status?: string
          team?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      internal_chat_add_members: {
        Args: { _chat_id: string; _members: string[] }
        Returns: undefined
      }
      internal_chat_create: {
        Args: { _kind: string; _members: string[]; _name: string }
        Returns: string
      }
      internal_chat_is_member: { Args: { _chat_id: string }; Returns: boolean }
      internal_chat_people: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      internal_chat_unread: {
        Args: never
        Returns: {
          chat_id: string
          unread: number
        }[]
      }
      is_firm_member: { Args: never; Returns: boolean }
      my_gm_username: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "senior" | "gestor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "senior", "gestor"],
    },
  },
} as const
