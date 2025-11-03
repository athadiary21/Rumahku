-- Create calendar module tables
CREATE TYPE public.event_category_color AS ENUM ('blue', 'green', 'orange', 'purple', 'pink', 'red');

CREATE TABLE public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color event_category_color NOT NULL DEFAULT 'blue',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL,
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default event categories
INSERT INTO public.event_categories (family_id, name, color, icon)
SELECT fg.id, 'Anak', 'blue'::event_category_color, '👶'
FROM public.family_groups fg
UNION ALL
SELECT fg.id, 'Kantor', 'orange'::event_category_color, '💼'
FROM public.family_groups fg
UNION ALL
SELECT fg.id, 'Keluarga', 'green'::event_category_color, '👨‍👩‍👧‍👦'
FROM public.family_groups fg
UNION ALL
SELECT fg.id, 'Tagihan', 'red'::event_category_color, '💰'
FROM public.family_groups fg;

-- Enable RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_categories
CREATE POLICY "Family members can view categories"
  ON public.event_categories FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert categories"
  ON public.event_categories FOR INSERT
  WITH CHECK (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can update categories"
  ON public.event_categories FOR UPDATE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can delete categories"
  ON public.event_categories FOR DELETE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

-- RLS Policies for calendar_events
CREATE POLICY "Family members can view events"
  ON public.calendar_events FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY "Family members can update their events"
  ON public.calendar_events FOR UPDATE
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Event creators and admins can delete events"
  ON public.calendar_events FOR DELETE
  USING (
    auth.uid() = created_by OR 
    public.get_family_role(auth.uid(), family_id) = 'admin'
  );

-- RLS Policies for event_reminders
CREATE POLICY "Family members can view reminders"
  ON public.event_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND public.is_family_member(auth.uid(), ce.family_id)
    )
  );

CREATE POLICY "Family members can insert reminders"
  ON public.event_reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id AND public.is_family_member(auth.uid(), ce.family_id)
    )
  );

-- Triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();