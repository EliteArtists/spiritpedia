ALTER TABLE public.healers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publisher_healers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read healers" ON public.healers;
CREATE POLICY "Public read healers" ON public.healers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read free_resources" ON public.free_resources;
CREATE POLICY "Public read free_resources" ON public.free_resources FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read publishers" ON public.publishers;
CREATE POLICY "Public read publishers" ON public.publishers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read videos" ON public.videos;
CREATE POLICY "Public read videos" ON public.videos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read books" ON public.books;
CREATE POLICY "Public read books" ON public.books FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read publisher_healers" ON public.publisher_healers;
CREATE POLICY "Public read publisher_healers" ON public.publisher_healers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anon can write healers" ON public.healers;
DROP POLICY IF EXISTS "Anon can update healers" ON public.healers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.healers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.healers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.healers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.courses;
DROP POLICY IF EXISTS "Enable update for all users" ON public.courses;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.courses;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.free_resources;
DROP POLICY IF EXISTS "Enable update for all users" ON public.free_resources;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.free_resources;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.publishers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.publishers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.publishers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.publisher_healers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.publisher_healers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.publisher_healers;

COMMENT ON TABLE public.healers IS 'Public read. All writes go through the service role on the server: the admin ingestion routes and the practitioner dashboard. The anon key ships in every page bundle, so anything it may write, any visitor may write.';
COMMENT ON TABLE public.courses IS 'Public read. Writes are server-side only, with the service role.';
