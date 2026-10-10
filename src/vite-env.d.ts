/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __BUILD__: string

// Cloud sharing settings (public values only). Both are optional: without them the app runs fully local.
interface ImportMetaEnv {
  /** Supabase project URL, for example https://YOUR-PROJECT-REF.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable key. Public by design. Never a secret or service_role key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
