CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  strictness text NOT NULL DEFAULT 'strict',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_strictness_check CHECK (strictness IN ('fair', 'strict', 'ruthless'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);