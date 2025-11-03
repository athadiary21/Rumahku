-- Create Kitchen & Shopping module tables
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Family members can view recipes"
  ON public.recipes FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY "Recipe creators can update their recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Recipe creators and admins can delete recipes"
  ON public.recipes FOR DELETE
  USING (
    auth.uid() = created_by OR 
    public.get_family_role(auth.uid(), family_id) = 'admin'
  );

-- RLS Policies for meal_plans
CREATE POLICY "Family members can view meal plans"
  ON public.meal_plans FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can update meal plans"
  ON public.meal_plans FOR UPDATE
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can delete meal plans"
  ON public.meal_plans FOR DELETE
  USING (public.is_family_member(auth.uid(), family_id));

-- RLS Policies for shopping_lists
CREATE POLICY "Family members can view shopping lists"
  ON public.shopping_lists FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert shopping lists"
  ON public.shopping_lists FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY "Family members can update shopping lists"
  ON public.shopping_lists FOR UPDATE
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "List creators and admins can delete shopping lists"
  ON public.shopping_lists FOR DELETE
  USING (
    auth.uid() = created_by OR 
    public.get_family_role(auth.uid(), family_id) = 'admin'
  );

-- RLS Policies for shopping_items
CREATE POLICY "Family members can view shopping items"
  ON public.shopping_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND public.is_family_member(auth.uid(), sl.family_id)
    )
  );

CREATE POLICY "Family members can insert shopping items"
  ON public.shopping_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND public.is_family_member(auth.uid(), sl.family_id)
    )
  );

CREATE POLICY "Family members can update shopping items"
  ON public.shopping_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND public.is_family_member(auth.uid(), sl.family_id)
    )
  );

CREATE POLICY "Family members can delete shopping items"
  ON public.shopping_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists sl
      WHERE sl.id = shopping_list_id AND public.is_family_member(auth.uid(), sl.family_id)
    )
  );

-- Triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();