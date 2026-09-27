// Stories and the people who tell them: publishing, film, creators, personal
// pages and cultural institutions.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const MEDIA_SEEDS = [
  {
    id: 'media', siteCategory: 'blog', icon: '📰', group: 'creative',
    name: copy('News & Publishing', 'Haber ve Yayıncılık'),
    desc: copy('Newsrooms, magazines, publishers and independent media.', 'Haber merkezleri, dergiler, yayınevleri ve bağımsız medya.'),
    profile: profile({
      nav: [copy('Latest', 'Son yazılar'), copy('About us', 'Hakkımızda'), copy('Subscribe', 'Abone ol')],
      badge: copy('Independent · reader funded', 'Bağımsız · okur destekli'),
      title: copy('Reporting that takes the time to get it right.', 'Doğrusunu bulmak için zaman ayıran habercilik.'),
      lead: copy('Local news, long reads and a morning briefing that respects your attention.', 'Yerel haberler, uzun okumalar ve dikkatinize saygı duyan bir sabah bülteni.'),
      cta: copy('Subscribe for free', 'Ücretsiz abone olun'),
      sectionTitle: copy('Read this week', 'Bu hafta okuyun'),
      sectionLead: copy('The stories our editors think you should not miss.', 'Editörlerimizin kaçırmamanız gerektiğini düşündüğü haberler.'),
      items: [
        item('The briefing', 'Bülten', 'Five things to know every weekday morning, in five minutes.', 'Her hafta içi sabahı, beş dakikada bilmeniz gereken beş şey.'),
        item('Long reads', 'Uzun okumalar', 'Investigations and features that take weeks to report.', 'Hazırlanması haftalar süren araştırmalar ve dosyalar.'),
        item('Opinion', 'Görüş', 'Clear arguments from writers who disagree with each other.', 'Birbiriyle aynı fikirde olmayan yazarlardan net argümanlar.'),
      ],
      storyTitle: copy('Journalism paid for by readers', 'Okurların desteklediği gazetecilik'),
      story: copy('No paywall on the news that matters most. Members keep it that way, and get a little extra in return.', 'En önemli haberlerde ödeme duvarı yok. Üyeler bunun böyle kalmasını sağlıyor ve karşılığında biraz daha fazlasını alıyor.'),
      steps: [copy('Sign up for the briefing', 'Bültene kaydolun'), copy('Read what interests you', 'İlginizi çekeni okuyun'), copy('Become a member', 'Üye olun')],
      ctaTitle: copy('Get the morning briefing', 'Sabah bültenini alın'),
      ctaCopy: copy('Free, every weekday at seven. Unsubscribe with one click.', 'Ücretsiz, her hafta içi saat yedide. Tek tıkla abonelikten çıkın.'),
      footer: copy('Independent journalism, funded by readers.', 'Okurların desteklediği bağımsız gazetecilik.'),
      stats: [[copy('40,000', '40.000'), copy('Newsletter readers', 'Bülten okuru')], [copy('2,100', '2.100'), copy('Paying members', 'Destekçi üye')], ['12', copy('Reporters', 'Muhabir')]],
      quote: {
        text: copy('The only newsletter I open before my coffee.', 'Kahvemden önce açtığım tek bülten.'),
        author: copy('Reader since 2022', "2022'den beri okur"),
      },
    }),
    variants: [
      starter('local-newspaper', 'paper', 'magazine', copy('Local Newspaper', 'Yerel Gazete'), hero(
        'News from your neighbourhood', 'Mahallenizden haberler',
        'What is happening where you live.', 'Yaşadığınız yerde neler oluyor.',
        'Council decisions, new openings and the people behind them, reported by neighbours.', 'Belediye kararları, yeni açılan mekânlar ve arkalarındaki insanlar; komşularınız tarafından haberleştirildi.')),
      starter('culture-magazine', 'plum', 'lookbook', copy('Culture Magazine', 'Kültür Dergisi'), hero(
        'Quarterly print and online', 'Üç ayda bir basılı ve online',
        'A slower magazine for curious people.', 'Meraklı insanlar için daha yavaş bir dergi.',
        'Essays, photography and interviews on design, food and the way we live now.', 'Tasarım, yemek ve bugün nasıl yaşadığımız üzerine denemeler, fotoğraflar ve söyleşiler.')),
      starter('publishing-house', 'ivory', 'catalog', copy('Publishing House', 'Yayınevi'), hero(
        'Literary fiction · essays · translation', 'Edebi kurgu · deneme · çeviri',
        'Books that stay on the shelf and in the mind.', 'Hem rafta hem akılda kalan kitaplar.',
        'An independent press publishing new voices and overlooked classics.', 'Yeni sesleri ve gözden kaçmış klasikleri yayımlayan bağımsız bir yayınevi.')),
      starter('literary-journal', 'cocoa', 'letter', copy('Literary Journal', 'Edebiyat Dergisi'), hero(
        'Submissions open until June', "Gönderimler Haziran'a kadar açık",
        'New writing, carefully edited.', 'Özenle editörlüğü yapılmış yeni yazılar.',
        'Short fiction, poetry and essays, published twice a year and paid for.', 'Yılda iki kez yayımlanan ve yazarına ücret ödenen kısa öykü, şiir ve denemeler.')),
      starter('community-radio', 'neon', 'poster', copy('Community Radio', 'Topluluk Radyosu'), hero(
        'Live now · 94.2 FM', 'Şimdi canlı · 94.2 FM',
        'Radio made by the city, for the city.', 'Şehir tarafından, şehir için yapılan radyo.',
        'Local music, late-night talk and volunteer hosts who love what they play.', 'Yerel müzik, gece yarısı sohbetleri ve çaldıklarını seven gönüllü programcılar.')),
      starter('tv-series', 'ink', 'showcase', copy('TV Series', 'Dizi'), hero(
        'Season two streaming now', 'İkinci sezon şimdi yayında',
        'Eight episodes, one secret.', 'Sekiz bölüm, tek sır.',
        'Watch the trailer, meet the cast and catch up on season one before the finale.', 'Fragmanı izleyin, oyuncularla tanışın ve finalden önce ilk sezonu yakalayın.')),
      starter('documentary-series', 'olive', 'chronicle', copy('Documentary Series', 'Belgesel Serisi'), hero(
        'Six episodes · filmed over three years', 'Altı bölüm · üç yılda çekildi',
        'The river that feeds a region.', 'Bir bölgeyi besleyen nehir.',
        'A documentary series following the farmers, fishers and families who depend on one river.', 'Tek bir nehre bağlı yaşayan çiftçileri, balıkçıları ve aileleri izleyen bir belgesel serisi.')),
      starter('independent-zine', 'lemon', 'bento', copy('Independent Zine', 'Bağımsız Fanzin'), hero(
        'Issue 12 out now', '12. sayı çıktı',
        'Photocopied, stapled and made with love.', 'Fotokopiyle çoğaltıldı, zımbalandı ve sevgiyle yapıldı.',
        'Comics, collage and writing from contributors all over the city.', 'Şehrin dört bir yanından katkıcıların çizgi romanları, kolajları ve yazıları.')),
      starter('news-agency', 'steel', 'directory', copy('News Agency', 'Haber Ajansı'), hero(
        'Wire service for newsrooms', 'Haber merkezleri için ajans servisi',
        'Verified stories, as they happen.', 'Doğrulanmış haberler, olduğu anda.',
        'Fact-checked news, photos and data for publishers, broadcasters and businesses.', 'Yayıncılar, televizyonlar ve şirketler için doğrulanmış haberler, fotoğraflar ve veriler.')),
      starter('weekly-newsletter', 'sky', 'solo', copy('Weekly Newsletter', 'Haftalık Bülten'), hero(
        'Every Sunday morning', 'Her Pazar sabahı',
        'One thoughtful email a week.', 'Haftada bir, üzerine düşünülmüş bir e-posta.',
        'The week in technology and culture, explained without the hype.', 'Teknoloji ve kültürde haftanın özeti, abartı olmadan anlatılıyor.')),
    ],
  },
  {
    id: 'film', siteCategory: 'portfolio', icon: '🎬', group: 'creative',
    name: copy('Film & Video', 'Film ve Video'),
    desc: copy('Filmmakers, production companies, festivals and video creators.', 'Film yapımcıları, prodüksiyon şirketleri, festivaller ve video üreticileri.'),
    profile: profile({
      nav: [copy('Films', 'Filmler'), copy('About', 'Hakkında'), copy('Contact', 'İletişim')],
      badge: copy('Stories told in moving pictures', 'Hareketli görüntülerle anlatılan hikâyeler'),
      title: copy('Films made to be felt, not just watched.', 'Yalnızca izlenmek için değil, hissedilmek için yapılan filmler.'),
      lead: copy('Documentaries, commercials and short films, from the first idea to the final cut.', 'İlk fikirden son kurguya belgeseller, reklam filmleri ve kısa filmler.'),
      cta: copy('Watch the reel', 'Tanıtım filmini izleyin'),
      sectionTitle: copy('Recent work', 'Son çalışmalar'),
      sectionLead: copy('A few of the projects we are proudest of.', 'En çok gurur duyduğumuz projelerden birkaçı.'),
      items: [
        item('Documentary', 'Belgesel', 'Real people, patient filming and stories that deserve an audience.', 'Gerçek insanlar, sabırlı çekimler ve izleyiciyi hak eden hikâyeler.'),
        item('Commercial', 'Reklam', 'Brand films with a real idea at their heart.', 'Merkezinde gerçek bir fikir olan marka filmleri.'),
        item('Short film', 'Kısa film', 'Personal projects that travel to festivals around the world.', 'Dünyanın dört bir yanındaki festivallere giden kişisel projeler.'),
      ],
      storyTitle: copy('From script to screen', 'Senaryodan perdeye'),
      story: copy('A small crew that writes, shoots and edits, so the idea survives all the way to the final frame.', 'Yazan, çeken ve kurgulayan küçük bir ekip; böylece fikir son kareye kadar korunur.'),
      steps: [copy('Share the idea', 'Fikri paylaşın'), copy('Plan the shoot', 'Çekimi planlayın'), copy('Premiere the film', 'Filmin galasını yapın')],
      ctaTitle: copy('Have a story to tell?', 'Anlatacak bir hikâyeniz mi var?'),
      ctaCopy: copy('Tell us about your project, your deadline and your budget, and we will reply within a week.', 'Projenizi, teslim tarihinizi ve bütçenizi anlatın; bir hafta içinde dönüş yapalım.'),
      footer: copy('Documentaries, commercials and short films.', 'Belgeseller, reklam filmleri ve kısa filmler.'),
      stats: [['70+', copy('Films produced', 'Üretilen film')], ['23', copy('Festival selections', 'Festival seçkisi')], ['6', copy('Awards', 'Ödül')]],
      quote: {
        text: copy('They found the story we did not know we had.', 'Sahip olduğumuzu bilmediğimiz hikâyeyi buldular.'),
        author: copy('Documentary subject', 'Belgesel katılımcısı'),
      },
    }),
    variants: [
      starter('film-production', 'noir', 'showcase', copy('Film Production', 'Film Yapım Şirketi'), hero(
        'Feature films and series', 'Uzun metraj filmler ve diziler',
        'Cinema with something to say.', 'Söyleyecek sözü olan sinema.',
        'An independent production company developing features, series and co-productions.', 'Uzun metraj filmler, diziler ve ortak yapımlar geliştiren bağımsız bir yapım şirketi.')),
      starter('videographer', 'sand', 'lookbook', copy('Videographer', 'Video Çekimcisi'), hero(
        'Weddings · events · brands', 'Düğünler · etkinlikler · markalar',
        'Your day, as it felt.', 'Gününüz, hissettirdiği gibi.',
        'Natural, cinematic films of weddings and events, delivered within a month.', 'Düğün ve etkinliklerin doğal, sinematik filmleri; bir ay içinde teslim.')),
      starter('animation-studio', 'bubble', 'bento', copy('Animation Studio', 'Animasyon Stüdyosu'), hero(
        '2D · 3D · motion graphics', '2B · 3B · hareketli grafik',
        'Ideas that move.', 'Hareket eden fikirler.',
        'Explainers, title sequences and characters for brands, apps and broadcasters.', 'Markalar, uygulamalar ve yayıncılar için tanıtım videoları, jenerikler ve karakterler.')),
      starter('film-festival', 'midnight', 'chronicle', copy('Film Festival', 'Film Festivali'), hero(
        'Ten days · eighty films', 'On gün · seksen film',
        'The best new cinema, under one roof.', 'En iyi yeni sinema tek çatı altında.',
        'Premieres, retrospectives and talks with filmmakers every October.', 'Her Ekim galalar, retrospektifler ve yönetmenlerle söyleşiler.')),
      starter('drone-studio', 'arctic', 'split', copy('Drone Studio', 'Drone Çekim Stüdyosu'), hero(
        'Licensed aerial filming', 'Lisanslı hava çekimi',
        'See it from above.', 'Yukarıdan görün.',
        'Aerial video and photography for real estate, tourism, construction and film.', 'Emlak, turizm, inşaat ve film için hava videosu ve fotoğrafı.')),
      starter('wedding-films', 'rose', 'letter', copy('Wedding Films', 'Düğün Filmleri'), hero(
        'Now booking next summer', 'Gelecek yaz için rezervasyon açık',
        'The vows, the laughter and the last dance.', 'Yeminler, kahkahalar ve son dans.',
        'A short film and a full ceremony edit, made so quietly you forget we are there.', 'Orada olduğumuzu unutacağınız kadar sessizce çekilmiş kısa bir film ve törenin tam kurgusu.')),
      starter('music-video-director', 'neon', 'poster', copy('Music Video Director', 'Klip Yönetmeni'), hero(
        'Music videos · visualisers', 'Müzik klipleri · görselleştiriciler',
        'Make the song look as good as it sounds.', 'Şarkıyı kulağa geldiği kadar iyi gösterin.',
        'Bold visual ideas for artists and labels, shot on any budget.', 'Sanatçılar ve plak şirketleri için her bütçeyle çekilen cesur görsel fikirler.')),
      starter('post-production', 'graphite', 'appshell', copy('Post-Production House', 'Post Prodüksiyon Stüdyosu'), hero(
        'Edit · colour · sound', 'Kurgu · renk · ses',
        'Where the footage becomes a film.', 'Görüntülerin filme dönüştüğü yer.',
        'Editing suites, colour grading and sound mixing, with remote review for every stage.', 'Kurgu odaları, renk düzenleme ve ses miksajı; her aşama için uzaktan inceleme.')),
      starter('casting-agency', 'press', 'directory', copy('Casting Agency', 'Oyuncu Ajansı'), hero(
        'Film · TV · commercials', 'Film · dizi · reklam',
        'The right face for every role.', 'Her rol için doğru yüz.',
        'Casting for productions of every size, from a single line to a leading role.', 'Tek repliklik rollerden başrollere, her ölçekte yapım için oyuncu seçimi.')),
      starter('short-film', 'teal', 'stack', copy('Short Film', 'Kısa Film'), hero(
        'Official selection 2026', '2026 resmî seçki',
        'Twelve minutes on a night train.', 'Bir gece treninde on iki dakika.',
        'A short film about strangers, a delayed train and one conversation that changes both of them.', 'Yabancılar, gecikmeli bir tren ve ikisini de değiştiren tek bir konuşma üzerine kısa bir film.')),
    ],
  },
  {
    id: 'creators', siteCategory: 'personal', icon: '🎙️', group: 'personal',
    name: copy('Creators & Personal Brands', 'İçerik Üreticileri ve Kişisel Markalar'),
    desc: copy('Homes for podcasters, writers, speakers, coaches and creators.', 'Podcast yayıncıları, yazarlar, konuşmacılar, koçlar ve içerik üreticileri için bir ev.'),
    profile: profile({
      nav: [copy('Watch & listen', 'İzle ve dinle'), copy('About me', 'Hakkımda'), copy('Work with me', 'Birlikte çalışalım')],
      badge: copy('Creator · writer · speaker', 'İçerik üreticisi · yazar · konuşmacı'),
      title: copy('Ideas worth sharing, made every week.', 'Her hafta üretilen, paylaşmaya değer fikirler.'),
      lead: copy('Videos, essays and a newsletter for people who like to learn something new every week.', 'Her hafta yeni bir şey öğrenmeyi seven insanlar için videolar, yazılar ve bir bülten.'),
      cta: copy('Join the newsletter', 'Bültene katılın'),
      sectionTitle: copy('Where to find my work', 'Çalışmalarımı nerede bulabilirsiniz'),
      sectionLead: copy('Pick the format you like best; the ideas are the same everywhere.', 'En sevdiğiniz formatı seçin; fikirler her yerde aynı.'),
      items: [
        item('Videos', 'Videolar', 'A new episode every Tuesday, around fifteen minutes long.', 'Her Salı yaklaşık on beş dakikalık yeni bir bölüm.'),
        item('Newsletter', 'Bülten', 'A Sunday note with what I learned, read and recommend.', 'Öğrendiklerimi, okuduklarımı ve önerdiklerimi içeren bir Pazar notu.'),
        item('Talks & workshops', 'Konuşmalar ve atölyeler', 'Keynotes and hands-on sessions for teams and conferences.', 'Ekipler ve konferanslar için açılış konuşmaları ve uygulamalı oturumlar.'),
      ],
      storyTitle: copy('A little about me', 'Biraz benden'),
      story: copy('I spent ten years doing the work before I started talking about it. Now I share what I wish someone had told me.', 'Anlatmaya başlamadan önce on yıl boyunca bu işi yaptım. Şimdi keşke biri bana söyleseydi dediğim şeyleri paylaşıyorum.'),
      steps: [copy('Watch an episode', 'Bir bölüm izleyin'), copy('Join the newsletter', 'Bültene katılın'), copy('Say hello', 'Merhaba deyin')],
      ctaTitle: copy('Get the Sunday note', 'Pazar notunu alın'),
      ctaCopy: copy('One email a week, no spam, and you can leave any time.', 'Haftada bir e-posta, spam yok ve istediğiniz zaman ayrılabilirsiniz.'),
      footer: copy('Videos, writing and talks about ideas that matter.', 'Önemli fikirler üzerine videolar, yazılar ve konuşmalar.'),
      stats: [[copy('180K', '180 B'), copy('Subscribers', 'Abone')], ['240', copy('Episodes', 'Bölüm')], [copy('32,000', '32.000'), copy('Newsletter readers', 'Bülten okuru')]],
      quote: {
        text: copy('Every episode leaves me with one idea I actually use.', 'Her bölüm bana gerçekten kullandığım bir fikir bırakıyor.'),
        author: copy('Longtime viewer', 'Uzun süreli izleyici'),
      },
    }),
    variants: [
      starter('video-creator', 'citrus', 'bento', copy('Video Creator', 'Video İçerik Üreticisi'), hero(
        'New video every Tuesday', 'Her Salı yeni video',
        'Learn something useful in fifteen minutes.', 'On beş dakikada işe yarar bir şey öğrenin.',
        'Practical videos on design, tools and working smarter, watched by thousands every week.', 'Tasarım, araçlar ve daha akıllı çalışma üzerine her hafta binlerce kişinin izlediği pratik videolar.')),
      starter('podcast', 'midnight', 'split', copy('Podcast', 'Podcast'), hero(
        'New episode every Monday', 'Her Pazartesi yeni bölüm',
        'Long conversations with interesting people.', 'İlginç insanlarla uzun sohbetler.',
        'Unhurried interviews with makers, scientists and founders about how they think.', 'Üreticiler, bilim insanları ve kurucularla nasıl düşündükleri üzerine acelesiz söyleşiler.')),
      starter('streamer', 'neon', 'appshell', copy('Streamer', 'Canlı Yayıncı'), hero(
        'Live four nights a week', 'Haftada dört gece canlı',
        'Come and hang out on stream.', 'Yayında takılmaya gelin.',
        'Games, chat and a community that keeps the good vibes going after the stream ends.', 'Oyunlar, sohbet ve yayın bittikten sonra da iyi enerjiyi sürdüren bir topluluk.')),
      starter('writer', 'paper', 'letter', copy('Writer', 'Yazar'), hero(
        'Essays and a weekly letter', 'Denemeler ve haftalık bir mektup',
        'Notes on reading, writing and paying attention.', 'Okumak, yazmak ve dikkat etmek üzerine notlar.',
        'Essays and a Sunday letter about books, habits and the small things that make a life.', 'Kitaplar, alışkanlıklar ve bir hayatı oluşturan küçük şeyler üzerine denemeler ve bir Pazar mektubu.')),
      starter('novelist', 'ivory', 'editorial', copy('Author', 'Kitap Yazarı'), hero(
        'New novel · out in spring', 'Yeni roman · baharda çıkıyor',
        'Stories about families and the secrets they keep.', 'Aileler ve sakladıkları sırlar üzerine hikâyeler.',
        'Read an extract, find a signing near you and join the list for news about the next book.', 'Bir bölüm okuyun, yakınınızdaki imza gününü bulun ve bir sonraki kitapla ilgili haberler için listeye katılın.')),
      starter('keynote-speaker', 'navy', 'showcase', copy('Keynote Speaker', 'Konuşmacı'), hero(
        'Conferences · leadership · culture', 'Konferanslar · liderlik · kültür',
        'Talks that change how a room thinks.', 'Bir salonun düşünme biçimini değiştiren konuşmalar.',
        'Keynotes on leadership and creativity, tailored to your audience and full of practical ideas.', 'Dinleyicinize göre uyarlanmış, pratik fikirlerle dolu liderlik ve yaratıcılık konuşmaları.')),
      starter('life-coach', 'sunset', 'service', copy('Life Coach', 'Yaşam Koçu'), hero(
        'One-to-one coaching', 'Bire bir koçluk',
        'Get unstuck and moving again.', 'Sıkıştığınız yerden çıkın ve yeniden harekete geçin.',
        'Coaching sessions that help you get clear on what you want and take the first real step.', 'Ne istediğinizi netleştirmenize ve ilk gerçek adımı atmanıza yardım eden koçluk seansları.')),
      starter('illustrator', 'coral', 'lookbook', copy('Illustrator', 'İllüstratör'), hero(
        'Commissions open', 'Siparişlere açık',
        'Drawings with a sense of humour.', 'Mizah duygusu olan çizimler.',
        'Editorial illustration, book covers and prints, drawn by hand and finished digitally.', 'Elde çizilip dijitalde tamamlanan editoryal illüstrasyonlar, kitap kapakları ve baskılar.')),
      starter('musician', 'ink', 'poster', copy('Musician', 'Müzisyen'), hero(
        'New single out now', 'Yeni tekli çıktı',
        'Songs for late drives home.', 'Gece geç saatte eve dönüş yolları için şarkılar.',
        'Listen to the new single, catch the tour and get early access to tickets.', 'Yeni tekliyi dinleyin, turneyi yakalayın ve biletlere erken erişim sağlayın.')),
      starter('travel-creator', 'ocean', 'stack', copy('Travel Creator', 'Seyahat İçerik Üreticisi'), hero(
        'Slow travel · honest guides', 'Yavaş seyahat · dürüst rehberler',
        'Places worth the long way round.', 'Uzun yoldan gitmeye değer yerler.',
        'Guides, films and itineraries from years of travelling slowly and paying my own way.', 'Yıllardır yavaş ve masraflarımı kendim ödeyerek yaptığım seyahatlerden rehberler, filmler ve rotalar.')),
    ],
  },
  {
    id: 'personal', siteCategory: 'personal', icon: '🏡', group: 'personal',
    name: copy('Personal & Family Pages', 'Kişisel ve Aile Sayfaları'),
    desc: copy("Pages for life's moments: announcements, reunions, journals and celebrations.", 'Hayatın anları için sayfalar: duyurular, buluşmalar, günlükler ve kutlamalar.'),
    profile: profile({
      nav: [copy('Our news', 'Haberlerimiz'), copy('Photos', 'Fotoğraflar'), copy('Say hello', 'Merhaba deyin')],
      badge: copy('A little corner of the internet for us', 'İnternette bize ait küçük bir köşe'),
      title: copy('The moments we want to remember.', 'Hatırlamak istediğimiz anlar.'),
      lead: copy('News, photos and plans, shared with the people who matter to us.', 'Bizim için önemli insanlarla paylaştığımız haberler, fotoğraflar ve planlar.'),
      cta: copy('See the latest', 'En yenileri görün'),
      sectionTitle: copy('What is new', 'Neler yeni'),
      sectionLead: copy('A few updates for family and friends, near and far.', 'Yakındaki ve uzaktaki aile ve arkadaşlar için birkaç haber.'),
      items: [
        item('Big news', 'Büyük haber', 'The announcement we have been waiting to share.', 'Paylaşmak için sabırsızlandığımız duyuru.'),
        item('Photo album', 'Fotoğraf albümü', 'Our favourite pictures from the last few months.', 'Son birkaç aydan en sevdiğimiz fotoğraflar.'),
        item('Save the date', 'Tarihi not edin', 'Everything you need to know about the next get-together.', 'Bir sonraki buluşma hakkında bilmeniz gereken her şey.'),
      ],
      storyTitle: copy('Why we made this page', 'Bu sayfayı neden yaptık'),
      story: copy('Group chats get busy and photos get lost. This page keeps our news in one place for everyone we love.', 'Grup sohbetleri kalabalıklaşıyor, fotoğraflar kayboluyor. Bu sayfa haberlerimizi sevdiğimiz herkes için tek bir yerde tutuyor.'),
      steps: [copy('Read our news', 'Haberlerimizi okuyun'), copy('Leave us a message', 'Bize bir mesaj bırakın'), copy('Come and celebrate', 'Kutlamaya gelin')],
      ctaTitle: copy('We would love to hear from you', 'Sizden haber almak isteriz'),
      ctaCopy: copy('Send us a message, a photo or a memory. We read every one.', 'Bize bir mesaj, fotoğraf ya da anı gönderin. Hepsini okuyoruz.'),
      footer: copy('Made with love for family and friends.', 'Aile ve arkadaşlar için sevgiyle yapıldı.'),
      stats: [['3', copy('Generations', 'Kuşak')], ['1', copy('Big announcement', 'Büyük duyuru')], ['∞', copy('Photos to share', 'Paylaşılacak fotoğraf')]],
      quote: {
        text: copy('Home is wherever this lot is gathered.', 'Ev, bu kalabalığın toplandığı her yerdir.'),
        author: copy('Grandma, at every holiday', 'Babaanne, her bayramda'),
      },
    }),
    variants: [
      starter('family-blog', 'sand', 'editorial', copy('Family Blog', 'Aile Blogu'), hero(
        'Notes from our home', 'Evimizden notlar',
        'Life with three kids and one very patient dog.', 'Üç çocuk ve çok sabırlı bir köpekle hayat.',
        'Recipes that worked, trips that almost did and the little things we do not want to forget.', 'İşe yarayan tarifler, neredeyse yarayan geziler ve unutmak istemediğimiz küçük şeyler.')),
      starter('golden-anniversary', 'paper', 'letter', copy('Wedding Anniversary', 'Evlilik Yıldönümü'), hero(
        'Fifty years together', 'Birlikte elli yıl',
        'Half a century, and still holding hands.', 'Yarım asır geçti, hâlâ el ele.',
        'Join us for a golden anniversary lunch, and share a photo or memory of the couple.', 'Altın yıldönümü öğle yemeğine katılın, çiftle ilgili bir fotoğraf ya da anı paylaşın.')),
      starter('baby-announcement', 'bubble', 'solo', copy('Baby Announcement', 'Bebek Müjdesi'), hero(
        'Born on a Sunday morning', 'Bir Pazar sabahı doğdu',
        'Please welcome the newest member of the family.', 'Ailenin en yeni üyesine merhaba deyin.',
        'Name, weight, the first photos and a note on when we will be ready for visitors.', 'İsim, kilo, ilk fotoğraflar ve ziyaretçi kabul etmeye ne zaman hazır olacağımıza dair bir not.')),
      starter('graduation', 'lavender', 'poster', copy('Graduation', 'Mezuniyet'), hero(
        'Class of 2026', '2026 mezunu',
        'Four years, one diploma, a lot of coffee.', 'Dört yıl, bir diploma ve bolca kahve.',
        'Join us to celebrate, see the ceremony details and leave a note for the graduate.', 'Kutlamaya katılın, tören ayrıntılarını görün ve mezuna bir not bırakın.')),
      starter('travel-diary', 'ocean', 'lookbook', copy('Travel Diary', 'Seyahat Günlüğü'), hero(
        'Six months on the road', 'Altı aydır yollarda',
        'Postcards from a long trip.', 'Uzun bir yolculuktan kartpostallar.',
        'Where we are this week, what we ate and the photos that did not fit on social media.', 'Bu hafta neredeyiz, ne yedik ve sosyal medyaya sığmayan fotoğraflar.')),
      starter('recipe-journal', 'citrus', 'catalog', copy('Recipe Journal', 'Tarif Defteri'), hero(
        'Family recipes, written down at last', 'Aile tarifleri, sonunda yazıya döküldü',
        'Grandma never measured anything.', 'Babaanne hiçbir şeyi ölçmezdi.',
        'The dishes we grew up with, finally written down with measurements that actually work.', 'Büyüdüğümüz yemekler, sonunda gerçekten işe yarayan ölçülerle yazıya döküldü.')),
      starter('class-reunion', 'forest', 'booking', copy('Class Reunion', 'Sınıf Buluşması'), hero(
        'Twenty years on', 'Yirmi yıl sonra',
        'Same faces, a few more grey hairs.', 'Aynı yüzler, birkaç tel daha fazla beyaz saç.',
        'Everything about the reunion weekend: the venue, the programme and who has already said yes.', 'Buluşma hafta sonuyla ilgili her şey: mekân, program ve kimlerin şimdiden evet dediği.')),
      starter('family-history', 'olive', 'chronicle', copy('Family History', 'Aile Tarihi'), hero(
        'Five generations and counting', 'Beş kuşak ve artıyor',
        'Where we come from.', 'Nereden geliyoruz.',
        'Old photos, stories and a family tree that everyone can help complete.', 'Eski fotoğraflar, hikâyeler ve herkesin tamamlamaya yardım edebileceği bir soy ağacı.')),
      starter('birthday-party', 'sunset', 'bento', copy('Birthday Party', 'Doğum Günü Partisi'), hero(
        'Turning forty, finally', 'Nihayet kırk yaşında',
        'Come and celebrate, and bring your dancing shoes.', 'Kutlamaya gelin, dans ayakkabılarınızı da getirin.',
        'The date, the place, the playlist, and one small request about presents.', 'Tarih, yer, şarkı listesi ve hediyelerle ilgili küçük bir rica.')),
      starter('retirement-party', 'cocoa', 'magazine', copy('Retirement Party', 'Emeklilik Kutlaması'), hero(
        'Thirty-five years at the school', 'Okulda otuz beş yıl',
        'Thank you for everything, teacher.', 'Her şey için teşekkürler, öğretmenim.',
        'Messages from former students, photos through the years and details of the farewell dinner.', 'Eski öğrencilerden mesajlar, yıllar içinden fotoğraflar ve veda yemeğinin ayrıntıları.')),
    ],
  },
  {
    id: 'culture', siteCategory: 'other', icon: '🏛️', group: 'community',
    name: copy('Museums & Culture', 'Müze ve Kültür'),
    desc: copy('Museums, galleries, heritage sites and cultural centres.', 'Müzeler, galeriler, tarihi alanlar ve kültür merkezleri.'),
    profile: profile({
      nav: [copy('Visit', 'Ziyaret'), copy('Exhibitions', 'Sergiler'), copy('Plan your visit', 'Ziyaretinizi planlayın')],
      badge: copy('Open Tuesday to Sunday', 'Salı–Pazar açık'),
      title: copy('Stories worth seeing in person.', 'Yerinde görmeye değer hikâyeler.'),
      lead: copy('Collections, exhibitions and events that bring art, history and science closer.', 'Sanatı, tarihi ve bilimi yakınlaştıran koleksiyonlar, sergiler ve etkinlikler.'),
      cta: copy('Plan your visit', 'Ziyaretinizi planlayın'),
      sectionTitle: copy('On view now', 'Şu an sergide'),
      sectionLead: copy('Exhibitions, tours and events for curious visitors of every age.', 'Her yaştan meraklı ziyaretçi için sergiler, turlar ve etkinlikler.'),
      items: [
        item('Exhibitions', 'Sergiler', 'New displays each season, alongside the permanent collection.', 'Kalıcı koleksiyonun yanında her mevsim yeni sergiler.'),
        item('Guided tours', 'Rehberli turlar', 'Walk through the highlights with an expert, in several languages.', 'Bir uzmanla, birden fazla dilde öne çıkan eserleri gezin.'),
        item('Learning', 'Öğrenme', 'Workshops for schools, families and lifelong learners.', 'Okullar, aileler ve ömür boyu öğrenenler için atölyeler.'),
      ],
      storyTitle: copy('A place for everyone', 'Herkes için bir yer'),
      story: copy('Step-free access, free entry for under-18s and quiet hours every Sunday morning.', 'Basamaksız erişim, 18 yaş altına ücretsiz giriş ve her Pazar sabahı sessiz saatler.'),
      steps: [copy('Choose a date', 'Bir tarih seçin'), copy('Book your ticket', 'Biletinizi alın'), copy('Enjoy the visit', 'Ziyaretin keyfini çıkarın')],
      ctaTitle: copy('Plan a day with us', 'Bizimle bir gün planlayın'),
      ctaCopy: copy('Book timed tickets online, or become a member for free entry all year.', 'Saatli biletleri online alın ya da yıl boyu ücretsiz giriş için üye olun.'),
      footer: copy('Art, history and science for everyone.', 'Herkes için sanat, tarih ve bilim.'),
      stats: [[copy('4,500', '4.500'), copy('Objects in the collection', 'Koleksiyondaki eser')], ['12', copy('Exhibitions a year', 'Yıllık sergi')], [copy('Free', 'Ücretsiz'), copy('Entry for under-18s', '18 yaş altı giriş')]],
      quote: {
        text: copy('We came for an hour and stayed until closing.', 'Bir saatliğine geldik, kapanışa kadar kaldık.'),
        author: copy('Visitor review', 'Ziyaretçi yorumu'),
      },
    }),
    variants: [
      starter('art-museum', 'mono', 'lookbook', copy('Art Museum', 'Sanat Müzesi'), hero(
        'Modern and contemporary art', 'Modern ve çağdaş sanat',
        'Art that asks good questions.', 'İyi sorular soran sanat.',
        'Four floors of modern and contemporary art, with a new exhibition every season.', 'Dört katta modern ve çağdaş sanat; her mevsim yeni bir sergi.')),
      starter('contemporary-gallery', 'ink', 'split', copy('Contemporary Gallery', 'Çağdaş Sanat Galerisi'), hero(
        'Now showing · until 30 November', "Sergide · 30 Kasım'a kadar",
        'New work by artists to watch.', 'Takip edilmesi gereken sanatçılardan yeni işler.',
        'A small gallery representing emerging artists, with openings on the first Thursday of the month.', 'Genç sanatçıları temsil eden, her ayın ilk Perşembesi açılış yapan küçük bir galeri.')),
      starter('history-museum', 'press', 'magazine', copy('History Museum', 'Tarih Müzesi'), hero(
        'Eight thousand years in one building', 'Tek binada sekiz bin yıl',
        'The past, up close.', 'Geçmiş, yakından.',
        'Archaeology, everyday objects and the stories of the people who used them.', 'Arkeoloji, gündelik objeler ve onları kullanan insanların hikâyeleri.')),
      starter('cultural-centre', 'coral', 'onepage', copy('Cultural Centre', 'Kültür Merkezi'), hero(
        'Concerts · talks · workshops', 'Konserler · söyleşiler · atölyeler',
        'Something on every evening.', 'Her akşam bir etkinlik.',
        'A neighbourhood cultural centre with concerts, film nights, talks and classes.', 'Konserler, film geceleri, söyleşiler ve kurslarla bir mahalle kültür merkezi.')),
      starter('science-centre', 'sky', 'bento', copy('Science Centre', 'Bilim Merkezi'), hero(
        'Hands-on for every age', 'Her yaşa uygulamalı deneyim',
        'Touch everything. Ask why.', 'Her şeye dokunun. Nedenini sorun.',
        'Interactive exhibits, live experiments and a planetarium show every hour.', 'Etkileşimli sergiler, canlı deneyler ve her saat başı planetaryum gösterisi.')),
      starter('botanical-garden', 'forest', 'showcase', copy('Botanical Garden', 'Botanik Bahçesi'), hero(
        'Twelve hectares · open all year', 'On iki hektar · yıl boyu açık',
        'Walk through every climate in an afternoon.', 'Bir öğleden sonrada tüm iklimlerde yürüyün.',
        'Glasshouses, seasonal gardens and guided walks through a living collection of plants.', 'Seralar, mevsim bahçeleri ve yaşayan bir bitki koleksiyonunda rehberli yürüyüşler.')),
      starter('heritage-site', 'sand', 'chronicle', copy('Heritage Site', 'Tarihi Alan'), hero(
        'UNESCO World Heritage', 'UNESCO Dünya Mirası',
        'Walk where history happened.', 'Tarihin yaşandığı yerde yürüyün.',
        'An ancient city with guided tours, an audio guide and a museum of finds from the site.', 'Rehberli turlar, sesli rehber ve alandan çıkan buluntuların müzesiyle antik bir kent.')),
      starter('planetarium', 'midnight', 'poster', copy('Planetarium', 'Planetaryum'), hero(
        'Full-dome shows daily', 'Her gün tam kubbe gösterileri',
        'The universe, overhead.', 'Evren, başınızın üstünde.',
        'Immersive shows about stars, planets and the edge of the universe, for all ages.', 'Her yaş için yıldızlar, gezegenler ve evrenin sınırı hakkında sürükleyici gösteriler.')),
      starter('city-archive', 'paper', 'directory', copy('City Archive', 'Kent Arşivi'), hero(
        'Maps · photographs · records', 'Haritalar · fotoğraflar · kayıtlar',
        'The memory of the city, open to all.', 'Herkese açık kent belleği.',
        'Search old maps, photographs and records, or book a reading room visit.', 'Eski haritaları, fotoğrafları ve kayıtları arayın ya da okuma salonu ziyareti ayırtın.')),
      starter('opera-house', 'plum', 'compare', copy('Opera House', 'Opera Binası'), hero(
        'Season 2026–27 on sale', '2026–27 sezonu satışta',
        'Grand stories, live on stage.', 'Büyük hikâyeler, sahnede canlı.',
        'Opera and ballet with a full orchestra, plus affordable tickets for under-30s.', 'Tam orkestrayla opera ve bale; 30 yaş altına uygun fiyatlı biletler.')),
    ],
  },
]
