export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          plan: 'free' | 'pro' | 'agency'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          onboarding_completed: boolean
          current_period_start: string | null
          current_period_end: string | null
          subscription_status: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          plan?: 'free' | 'pro' | 'agency'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          onboarding_completed?: boolean
          current_period_start?: string | null
          current_period_end?: string | null
          subscription_status?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          plan?: 'free' | 'pro' | 'agency'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          onboarding_completed?: boolean
          current_period_start?: string | null
          current_period_end?: string | null
          subscription_status?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      repos: {
        Row: {
          id: string
          user_id: string
          github_repo_id: number
          full_name: string
          default_branch: string
          installation_id: number
          connected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_repo_id: number
          full_name: string
          default_branch?: string
          installation_id: number
          connected_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_repo_id?: number
          full_name?: string
          default_branch?: string
          installation_id?: number
          connected_at?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          id: string
          repo_id: string
          user_id: string
          status: 'queued' | 'running' | 'done' | 'failed'
          score: number | null
          commit_sha: string | null
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          repo_id: string
          user_id: string
          status?: 'queued' | 'running' | 'done' | 'failed'
          score?: number | null
          commit_sha?: string | null
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          repo_id?: string
          user_id?: string
          status?: 'queued' | 'running' | 'done' | 'failed'
          score?: number | null
          commit_sha?: string | null
          started_at?: string
          finished_at?: string | null
        }
        Relationships: []
      }
      findings: {
        Row: {
          id: string
          scan_id: string
          check_type: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          file_path: string
          line: number
          title: string
          plain_english: string | null
          fix_suggestion: string | null
          cwe: string | null
        }
        Insert: {
          id?: string
          scan_id: string
          check_type: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          file_path: string
          line: number
          title: string
          plain_english?: string | null
          fix_suggestion?: string | null
          cwe?: string | null
        }
        Update: {
          id?: string
          scan_id?: string
          check_type?: string
          severity?: 'critical' | 'high' | 'medium' | 'low'
          file_path?: string
          line?: number
          title?: string
          plain_english?: string | null
          fix_suggestion?: string | null
          cwe?: string | null
        }
        Relationships: []
      }
      fix_prs: {
        Row: {
          id: string
          finding_id: string
          scan_id: string
          pr_url: string
          status: 'open' | 'merged' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          finding_id: string
          scan_id: string
          pr_url: string
          status?: 'open' | 'merged' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          finding_id?: string
          scan_id?: string
          pr_url?: string
          status?: 'open' | 'merged' | 'closed'
          created_at?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          plan: string
          scans_per_period: number | null
          repos: number | null
          monitored_repos: number | null
          fix_attempts_per_period: number | null
          certificates_per_period: number | null
          exports_per_period: number | null
          api_requests_per_day: number | null
          team_seats: number | null
          updated_at: string
        }
        Insert: {
          plan: string
          scans_per_period?: number | null
          repos?: number | null
          monitored_repos?: number | null
          fix_attempts_per_period?: number | null
          certificates_per_period?: number | null
          exports_per_period?: number | null
          api_requests_per_day?: number | null
          team_seats?: number | null
          updated_at?: string
        }
        Update: {
          plan?: string
          scans_per_period?: number | null
          repos?: number | null
          monitored_repos?: number | null
          fix_attempts_per_period?: number | null
          certificates_per_period?: number | null
          exports_per_period?: number | null
          api_requests_per_day?: number | null
          team_seats?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          id: string
          user_id: string
          kind: 'scan' | 'repo' | 'monitored_repo' | 'fix_attempt' | 'certificate' | 'export' | 'api_request' | 'team_seat'
          occurred_at: string
          ref_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          kind: 'scan' | 'repo' | 'monitored_repo' | 'fix_attempt' | 'certificate' | 'export' | 'api_request' | 'team_seat'
          occurred_at?: string
          ref_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          kind?: 'scan' | 'repo' | 'monitored_repo' | 'fix_attempt' | 'certificate' | 'export' | 'api_request' | 'team_seat'
          occurred_at?: string
          ref_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string
          price_monthly: number
          price_annual: number
          stripe_price_id_monthly: string | null
          stripe_price_id_annual: string | null
          features: Json
          display_order: number
          active: boolean
        }
        Insert: {
          id: string
          name: string
          description?: string
          price_monthly?: number
          price_annual?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          features?: Json
          display_order?: number
          active?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price_monthly?: number
          price_annual?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          features?: Json
          display_order?: number
          active?: boolean
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          event_id: string
          type: string
          received_at: string
        }
        Insert: {
          event_id: string
          type: string
          received_at?: string
        }
        Update: {
          event_id?: string
          type?: string
          received_at?: string
        }
        Relationships: []
      }
      monitoring_config: {
        Row: {
          repo_id: string
          enabled: boolean
          alert_email: string | null
          alert_discord_webhook: string | null
        }
        Insert: {
          repo_id: string
          enabled?: boolean
          alert_email?: string | null
          alert_discord_webhook?: string | null
        }
        Update: {
          repo_id?: string
          enabled?: boolean
          alert_email?: string | null
          alert_discord_webhook?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
