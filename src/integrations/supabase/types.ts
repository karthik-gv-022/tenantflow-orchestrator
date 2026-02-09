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
      activity_feed: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_title: string | null
          entity_type: string
          id: string
          metadata: Json | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      federated_training_rounds: {
        Row: {
          aggregation_method: string
          completed_at: string | null
          created_at: string
          global_accuracy: number | null
          global_weights: Json | null
          id: string
          metadata: Json | null
          participating_tenants: string[]
          round_number: number
          started_at: string | null
          status: string
          total_samples: number
        }
        Insert: {
          aggregation_method?: string
          completed_at?: string | null
          created_at?: string
          global_accuracy?: number | null
          global_weights?: Json | null
          id?: string
          metadata?: Json | null
          participating_tenants?: string[]
          round_number: number
          started_at?: string | null
          status?: string
          total_samples?: number
        }
        Update: {
          aggregation_method?: string
          completed_at?: string | null
          created_at?: string
          global_accuracy?: number | null
          global_weights?: Json | null
          id?: string
          metadata?: Json | null
          participating_tenants?: string[]
          round_number?: number
          started_at?: string | null
          status?: string
          total_samples?: number
        }
        Relationships: []
      }
      model_evaluation_results: {
        Row: {
          accuracy: number
          auc_roc: number | null
          evaluated_at: string
          evaluation_type: string
          f1_score: number | null
          false_negatives: number | null
          false_positives: number | null
          id: string
          metadata: Json | null
          precision_score: number | null
          recall_score: number | null
          round_id: string | null
          tenant_id: string | null
          test_samples: number
          true_negatives: number | null
          true_positives: number | null
        }
        Insert: {
          accuracy: number
          auc_roc?: number | null
          evaluated_at?: string
          evaluation_type: string
          f1_score?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          id?: string
          metadata?: Json | null
          precision_score?: number | null
          recall_score?: number | null
          round_id?: string | null
          tenant_id?: string | null
          test_samples: number
          true_negatives?: number | null
          true_positives?: number | null
        }
        Update: {
          accuracy?: number
          auc_roc?: number | null
          evaluated_at?: string
          evaluation_type?: string
          f1_score?: number | null
          false_negatives?: number | null
          false_positives?: number | null
          id?: string
          metadata?: Json | null
          precision_score?: number | null
          recall_score?: number | null
          round_id?: string | null
          tenant_id?: string | null
          test_samples?: number
          true_negatives?: number | null
          true_positives?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_evaluation_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "federated_training_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_evaluation_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          mentions: string[] | null
          parent_id: string | null
          task_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          task_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          task_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_delay_predictions: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          predicted_at: string
          predicted_delayed: boolean
          prediction_factors: Json
          prediction_trigger: string
          task_id: string
          tenant_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string
          id?: string
          predicted_at?: string
          predicted_delayed: boolean
          prediction_factors?: Json
          prediction_trigger: string
          task_id: string
          tenant_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          predicted_at?: string
          predicted_delayed?: boolean
          prediction_factors?: Json
          prediction_trigger?: string
          task_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_delay_predictions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_delay_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          sla_hours: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          sla_hours?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          sla_hours?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_model_weights: {
        Row: {
          accuracy: number | null
          created_at: string
          f1_score: number | null
          feature_names: string[]
          id: string
          last_trained_at: string | null
          model_version: number
          precision_score: number | null
          recall_score: number | null
          tenant_id: string
          training_samples: number
          updated_at: string
          weights: Json
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          f1_score?: number | null
          feature_names: string[]
          id?: string
          last_trained_at?: string | null
          model_version?: number
          precision_score?: number | null
          recall_score?: number | null
          tenant_id: string
          training_samples?: number
          updated_at?: string
          weights: Json
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          f1_score?: number | null
          feature_names?: string[]
          id?: string
          last_trained_at?: string | null
          model_version?: number
          precision_score?: number | null
          recall_score?: number | null
          tenant_id?: string
          training_samples?: number
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_model_weights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_training_metadata: {
        Row: {
          created_at: string
          epochs_completed: number
          id: string
          local_weights: Json
          loss: number | null
          round_id: string
          tenant_id: string
          training_accuracy: number | null
          training_duration_ms: number | null
          training_samples: number
          validation_accuracy: number | null
          validation_samples: number
        }
        Insert: {
          created_at?: string
          epochs_completed?: number
          id?: string
          local_weights: Json
          loss?: number | null
          round_id: string
          tenant_id: string
          training_accuracy?: number | null
          training_duration_ms?: number | null
          training_samples: number
          validation_accuracy?: number | null
          validation_samples?: number
        }
        Update: {
          created_at?: string
          epochs_completed?: number
          id?: string
          local_weights?: Json
          loss?: number | null
          round_id?: string
          tenant_id?: string
          training_accuracy?: number | null
          training_duration_ms?: number | null
          training_samples?: number
          validation_accuracy?: number | null
          validation_samples?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_training_metadata_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "federated_training_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_training_metadata_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_name: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string
          os: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          os?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          os?: string | null
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "system_admin"
        | "tenant_admin"
        | "manager"
        | "team_lead"
        | "team_member"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "created" | "in_progress" | "review" | "completed"
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
        "system_admin",
        "tenant_admin",
        "manager",
        "team_lead",
        "team_member",
      ],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["created", "in_progress", "review", "completed"],
    },
  },
} as const
