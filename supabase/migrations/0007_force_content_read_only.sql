DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'healers','videos','books','courses',
        'free_resources','publishers','publisher_healers','subjects'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.healers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publisher_healers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read healers" ON public.healers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read videos" ON public.videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read books" ON public.books FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read free_resources" ON public.free_resources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read publishers" ON public.publishers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read publisher_healers" ON public.publisher_healers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'healers','videos','books','courses',
    'free_resources','publishers','publisher_healers','subjects'
  )
ORDER BY tablename, policyname;
