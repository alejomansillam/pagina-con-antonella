ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS monthly_goal numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS recovered numeric NOT NULL DEFAULT 0;

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank text NOT NULL,
  holder text NOT NULL DEFAULT '',
  cbu text,
  alias text,
  note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ba_read ON public.bank_accounts FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY ba_insert ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY ba_update ON public.bank_accounts FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY ba_delete ON public.bank_accounts FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

INSERT INTO public.bank_accounts (bank, holder, cbu, note, position)
VALUES ('Banco Galicia', 'Tarjeta Naranja S.A.', '0070076420000010396951', 'Cuenta oficial de recaudación', 1);