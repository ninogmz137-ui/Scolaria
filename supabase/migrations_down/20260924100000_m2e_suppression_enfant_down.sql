-- M2e · INVERSE — tout responsable peut supprimer l'enfant (état après M2).
ALTER POLICY children_delete ON public.children USING (public.is_responsable(id));
