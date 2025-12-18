import { supabase } from '@/utils/supabase';
import Link from 'next/link';

export default async function HealerProfile({ params }) {
  const { slug } = await params;

  const { data: healer, error } = await supabase.from('healers').select('*').eq('healer_slug', slug).single();

  if (error || !healer) return <div className="p-20 text-center font-black uppercase tracking-widest text-gray-200">Healer not found.</div>;

  const { data: books } = await supabase.from('books').select('*').eq('author', healer.name);
  const { data: videos } = await supabase.from('videos').select('*').ilike('title', `%${healer.name}%`);

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full p-12 md:p-20 animate-gradient-slow text-white"
           style={{ background: 'linear-gradient(135deg, #0a2a66, #3f91ec, #a4c3ec, #0a2a66)', backgroundSize: '400% 400%' }}>
        <Link href="/" className="text-white/40 hover:text-white mb-12 inline-block uppercase text-[10px] font-black tracking-[0.3em]">&larr; Back to Spiritpedia</Link>
        <h1 className="text-7xl font-black tracking-tighter mb-4 uppercase italic leading-none">{healer.name}</h1>
        <p className="text-xl opacity-90 max-w-2xl font-light leading-relaxed mb-10">{healer.bio}</p>
        <div>
            <span className={`px-8 py-3 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${healer.is_famous ? 'bg-yellow-400 text-white' : 'bg-green-400 text-white'}`}>
                {healer.is_famous ? 'Superhero' : `Local Hero: ${healer.city || 'Universe'}`}
            </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 md:p-20 space-y-32">
        {/* GALLERY STYLE BOOKS */}
        <section>
          <div className="flex overflow-x-auto space-x-8 pb-10 no-scrollbar">
            {books?.length > 0 ? books.map((book) => {
              const asinMatch = book.amazon_url?.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
              const asin = asinMatch ? asinMatch[1] : null;
              const coverUrl = book.mock_cover_url?.startsWith('http') ? book.mock_cover_url : (asin ? `https://images.amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg` : 'https://placehold.co/400x600?text=Spiritpedia');
              return (
                <div key={book.id} className="flex-shrink-0 w-64 group">
                  <img src={coverUrl} alt={book.title} className="w-full h-96 object-cover rounded-2xl shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all" />
                </div>
              );
            }) : <p className="text-gray-200 font-black uppercase tracking-widest">No works found.</p>}
          </div>
        </section>

        {/* VIDEOS */}
        <section>
          <div className="flex overflow-x-auto space-x-6 pb-6 no-scrollbar">
            {videos?.length > 0 ? videos.map(v => (
              <a key={v.id} href={v.platform_url} target="_blank" rel="noreferrer" 
                 className="flex-shrink-0 w-96 bg-gray-50 p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <h4 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic leading-tight group-hover:text-pink-600">{v.title}</h4>
                <span className="text-blue-500 text-[10px] font-black mt-8 block uppercase tracking-[0.3em]">Watch Teaching &rarr;</span>
              </a>
            )) : <p className="text-gray-200 font-black uppercase tracking-widest">No videos yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}