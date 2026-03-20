-- Migration: Family mode — track additional family members' portfolios
-- Each family member gets their own scoped data rows linked to the primary user.

CREATE TABLE IF NOT EXISTS public.family_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    relation    TEXT NOT NULL DEFAULT 'spouse',  -- spouse | child | parent | other
    color       TEXT NOT NULL DEFAULT 'bg-violet-600',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_members_owner ON public.family_members(owner_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own family members"
    ON public.family_members
    FOR ALL USING (auth.uid() = owner_id);

-- Add optional member_id FK to holdings tables (NULL = primary user's own data)
ALTER TABLE public.stocks         ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE;
ALTER TABLE public.mutual_funds   ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE;
ALTER TABLE public.other_schemes  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE;
