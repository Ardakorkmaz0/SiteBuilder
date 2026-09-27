// Software, apps, games, research and the agencies that launch them.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const DIGITAL_SEEDS = [
  {
    id: 'saas', siteCategory: 'landing', icon: '💻', group: 'tech',
    name: copy('Software & SaaS', 'Yazılım ve SaaS'),
    desc: copy('Product sites for software teams: features, pricing and sign-up.', 'Yazılım ekipleri için ürün siteleri: özellikler, fiyatlar ve kayıt.'),
    profile: profile({
      nav: [copy('Product', 'Ürün'), copy('Customers', 'Müşteriler'), copy('Start free trial', 'Ücretsiz denemeyi başlat')],
      badge: copy('New: faster workflows', 'Yeni: daha hızlı iş akışları'),
      title: copy("The simplest way to get your team's work done.", 'Ekibinizin işlerini halletmenin en basit yolu.'),
      lead: copy('One place for the work, the conversations and the decisions, with nothing to install.', 'İşler, konuşmalar ve kararlar için tek bir yer; kurulacak hiçbir şey yok.'),
      cta: copy('Start free trial', 'Ücretsiz denemeyi başlat'),
      sectionTitle: copy('Built for how teams really work', 'Ekiplerin gerçek çalışma biçimi için geliştirildi'),
      sectionLead: copy('Powerful enough for experts, simple enough that everyone actually uses it.', 'Uzmanlar için yeterince güçlü, herkesin gerçekten kullanacağı kadar basit.'),
      items: [
        item('Automate the busywork', 'Rutin işleri otomatikleştirin', 'Rules and templates that take repetitive steps off your plate.', 'Tekrarlayan adımları üzerinizden alan kurallar ve şablonlar.'),
        item('Work together in real time', 'Gerçek zamanlı birlikte çalışın', 'Comments, mentions and live editing, without the email chains.', 'E-posta zincirleri olmadan yorumlar, bahsetmeler ve canlı düzenleme.'),
        item('Connect your tools', 'Araçlarınızı bağlayın', 'Integrations with the apps your team already relies on.', 'Ekibinizin zaten kullandığı uygulamalarla entegrasyonlar.'),
      ],
      storyTitle: copy('Secure by default', 'Varsayılan olarak güvenli'),
      story: copy('Single sign-on, audit logs and encryption at rest come as standard, not as an enterprise upsell.', 'Tek oturum açma, denetim kayıtları ve depolamada şifreleme standart olarak gelir; kurumsal ek paket olarak değil.'),
      steps: [copy('Create a workspace', 'Bir çalışma alanı oluşturun'), copy('Invite your team', 'Ekibinizi davet edin'), copy('Ship your first project', 'İlk projenizi tamamlayın')],
      ctaTitle: copy('Try it free for 14 days', '14 gün boyunca ücretsiz deneyin'),
      ctaCopy: copy('No credit card required. Bring your team and see if it sticks.', 'Kredi kartı gerekmez. Ekibinizi getirin ve alışıp alışmadığınızı görün.'),
      footer: copy('Software that helps teams do their best work.', 'Ekiplerin en iyi işlerini çıkarmasına yardım eden yazılım.'),
      stats: [[copy('10,000+', '10.000+'), copy('Teams', 'Ekip')], [copy('99.99%', '%99,99'), copy('Uptime', 'Çalışma süresi')], [copy('4.8/5', '4,8/5'), copy('Customer rating', 'Müşteri puanı')]],
      quote: {
        text: copy('We replaced three tools and our Monday meeting.', 'Üç aracı ve Pazartesi toplantımızı bununla değiştirdik.'),
        author: copy('Head of operations, design agency', 'Operasyon direktörü, tasarım ajansı'),
      },
    }),
    variants: [
      starter('developer-tools', 'graphite', 'appshell', copy('Developer Tools', 'Geliştirici Araçları'), hero(
        'CLI · API · dashboard', 'CLI · API · panel',
        'Deploy on Friday, sleep on Friday night.', 'Cuma günü yayına alın, Cuma gecesi rahat uyuyun.',
        'Previews for every branch, instant rollbacks and logs you can actually search.', 'Her dal için önizleme, anında geri alma ve gerçekten arama yapabileceğiniz kayıtlar.')),
      starter('ai-assistant', 'neon', 'bento', copy('AI Assistant', 'Yapay Zekâ Asistanı'), hero(
        'Private by design', 'Tasarımdan gizlilik odaklı',
        'An assistant that knows your documents, not the whole internet.', 'Tüm interneti değil, sizin belgelerinizi bilen bir asistan.',
        'Ask questions across your files and get answers with the source linked.', 'Dosyalarınızın tamamında soru sorun, kaynağı bağlantılı yanıtlar alın.')),
      starter('analytics-platform', 'indigo', 'onepage', copy('Analytics Platform', 'Analitik Platformu'), hero(
        'Cookieless · privacy friendly', 'Çerezsiz · gizlilik dostu',
        'Numbers your whole team can read.', 'Tüm ekibinizin okuyabileceği rakamlar.',
        'Simple dashboards, honest metrics and reports that arrive before the meeting does.', 'Sade paneller, dürüst metrikler ve toplantıdan önce gelen raporlar.')),
      starter('security-platform', 'slate', 'compare', copy('Security Platform', 'Güvenlik Platformu'), hero(
        'SOC 2 in weeks, not months', 'SOC 2 aylarda değil haftalarda',
        'Compliance without the spreadsheets.', 'Tablolarla boğuşmadan uyumluluk.',
        'Continuous monitoring, automatic evidence and policies your auditor will recognise.', 'Sürekli izleme, otomatik kanıt toplama ve denetçinizin tanıyacağı politikalar.')),
      starter('business-banking', 'emerald', 'split', copy('Business Banking', 'Kurumsal Bankacılık'), hero(
        'Accounts · cards · invoices', 'Hesaplar · kartlar · faturalar',
        'Business finances that run themselves.', 'Kendi kendine yönetilen şirket finansı.',
        'Accounts, cards and bookkeeping in one app, built for small companies.', 'Küçük şirketler için hesaplar, kartlar ve muhasebe tek bir uygulamada.')),
      starter('api-platform', 'ink', 'directory', copy('API Platform', 'API Platformu'), hero(
        'Docs · SDKs · status', "Dokümanlar · SDK'lar · durum",
        'One API, fifty integrations.', 'Tek API, elli entegrasyon.',
        'Clear docs, typed SDKs and a sandbox you can call in the next five minutes.', "Net dokümanlar, tipli SDK'lar ve önümüzdeki beş dakikada çağırabileceğiniz bir test ortamı.")),
      starter('open-source', 'paper', 'letter', copy('Open Source Project', 'Açık Kaynak Proje'), hero(
        'MIT licensed · community driven', 'MIT lisanslı · topluluk odaklı',
        'Built in the open, by people who use it.', 'Onu kullanan insanlar tarafından, açıkta geliştirildi.',
        'Read the docs, join the discussion and send your first pull request this week.', 'Dokümanları okuyun, tartışmaya katılın ve ilk katkınızı bu hafta gönderin.')),
      starter('small-business-crm', 'sky', 'catalog', copy('Small Business CRM', 'KOBİ CRM'), hero(
        'Set up in an afternoon', 'Bir öğleden sonrada kurulum',
        'Remember every customer, follow up every lead.', 'Her müşteriyi hatırlayın, her fırsatın peşinden gidin.',
        'A friendly CRM for small teams, with pipelines, reminders and email built in.', 'Küçük ekipler için satış hunileri, hatırlatıcılar ve e-postayla gelen samimi bir CRM.')),
      starter('project-management', 'lavender', 'stack', copy('Project Management', 'Proje Yönetimi'), hero(
        'Boards · timelines · docs', 'Panolar · zaman çizelgeleri · dokümanlar',
        'Plans everyone can see and nobody has to chase.', 'Herkesin görebildiği, kimsenin peşinden koşmak zorunda kalmadığı planlar.',
        'Boards, timelines and docs that stay in sync, so status meetings become optional.', 'Senkron kalan panolar, zaman çizelgeleri ve dokümanlar; durum toplantıları artık isteğe bağlı.')),
      starter('no-code-builder', 'citrus', 'poster', copy('No-Code Builder', 'Kodsuz Uygulama Geliştirici'), hero(
        'Build apps without code', 'Kod yazmadan uygulama geliştirin',
        'If you can use a spreadsheet, you can build an app.', 'Tablo kullanabiliyorsanız uygulama da yapabilirsiniz.',
        'Drag in your data, design the screens and share a working app with your team today.', 'Verinizi sürükleyin, ekranları tasarlayın ve bugün ekibinizle çalışan bir uygulama paylaşın.')),
    ],
  },
  {
    id: 'apps', siteCategory: 'landing', icon: '📱', group: 'tech',
    name: copy('Apps & Digital Products', 'Uygulamalar ve Dijital Ürünler'),
    desc: copy('Mobile apps, gadgets, courses and digital products with a launch to make.', 'Lansmanı yapılacak mobil uygulamalar, cihazlar, kurslar ve dijital ürünler.'),
    profile: profile({
      nav: [copy('Features', 'Özellikler'), copy('Reviews', 'Yorumlar'), copy('Get it now', 'Hemen edinin')],
      badge: copy('Available now', 'Şimdi kullanıma sunuldu'),
      title: copy('Small product, big difference to your day.', 'Küçük bir ürün, gününüzde büyük bir fark.'),
      lead: copy('Designed with care, tested by real people and priced fairly, with no subscription traps.', 'Özenle tasarlandı, gerçek insanlarca test edildi ve adil fiyatlandırıldı; abonelik tuzağı yok.'),
      cta: copy('Get it now', 'Hemen edinin'),
      sectionTitle: copy('Why people love it', 'İnsanlar neden seviyor'),
      sectionLead: copy('Three reasons it earns a place on your home screen.', 'Ana ekranınızda yer hak etmesinin üç nedeni.'),
      items: [
        item('Works in seconds', 'Saniyeler içinde çalışır', 'No account needed to start, and nothing to configure.', 'Başlamak için hesap gerekmez, ayarlanacak bir şey yok.'),
        item('Private by default', 'Varsayılan olarak gizli', 'Your data stays on your device unless you choose otherwise.', 'Siz aksini seçmedikçe verileriniz cihazınızda kalır.'),
        item('Made to last', 'Uzun ömürlü', 'Regular updates and support from the people who built it.', 'Onu yapan insanlardan düzenli güncellemeler ve destek.'),
      ],
      storyTitle: copy('Made by a small team that uses it every day', 'Onu her gün kullanan küçük bir ekip tarafından yapıldı'),
      story: copy('We answer every support email ourselves and ship improvements every few weeks.', 'Her destek e-postasını kendimiz yanıtlıyor ve birkaç haftada bir iyileştirme yayınlıyoruz.'),
      steps: [copy('Download or order', 'İndirin ya da sipariş verin'), copy('Set up in a minute', 'Bir dakikada kurun'), copy('Enjoy the difference', 'Farkın keyfini çıkarın')],
      ctaTitle: copy('Ready to try it?', 'Denemeye hazır mısınız?'),
      ctaCopy: copy('Free to start, with a fair one-time price if you decide to keep it.', 'Başlamak ücretsiz; saklamaya karar verirseniz adil ve tek seferlik bir fiyat.'),
      footer: copy('Thoughtful digital products for everyday life.', 'Günlük hayat için özenle tasarlanmış dijital ürünler.'),
      stats: [[copy('250,000', '250.000'), copy('Downloads', 'İndirme')], [copy('4.8', '4,8'), copy('App store rating', 'Mağaza puanı')], ['32', copy('Countries', 'Ülke')]],
      quote: {
        text: copy('It does one thing and does it perfectly.', 'Tek bir işi yapıyor ve kusursuz yapıyor.'),
        author: copy('Review on the App Store', "App Store'daki bir yorum"),
      },
    }),
    variants: [
      starter('mobile-app', 'bubble', 'stack', copy('Mobile App', 'Mobil Uygulama'), hero(
        'iPhone and Android', 'iPhone ve Android',
        'The app that makes Mondays manageable.', 'Pazartesileri yönetilebilir kılan uygulama.',
        'Plan the week in two minutes and get gentle reminders when it matters.', 'Haftayı iki dakikada planlayın, gerektiğinde nazik hatırlatmalar alın.')),
      starter('browser-extension', 'sky', 'solo', copy('Browser Extension', 'Tarayıcı Eklentisi'), hero(
        'For Chrome, Firefox and Edge', 'Chrome, Firefox ve Edge için',
        'A calmer internet, one click away.', 'Tek tıkla daha sakin bir internet.',
        'Hide the distractions, save articles for later and read without clutter.', 'Dikkat dağıtıcıları gizleyin, yazıları sonraya kaydedin ve kalabalık olmadan okuyun.')),
      starter('smart-gadget', 'arctic', 'showcase', copy('Smart Gadget', 'Akıllı Cihaz'), hero(
        'Pre-orders open', 'Ön siparişler açık',
        'The small device that knows when to water your plants.', 'Bitkilerinizi ne zaman sulayacağınızı bilen küçük cihaz.',
        'A sensor, a clear app and a battery that lasts a whole year.', 'Bir sensör, anlaşılır bir uygulama ve bir yıl dayanan bir pil.')),
      starter('ebook-launch', 'sand', 'letter', copy('Ebook Launch', 'E-Kitap Lansmanı'), hero(
        'New book · out now', 'Yeni kitap · çıktı',
        'Everything I wish I had known in my first year.', 'İlk yılımda keşke bilseydim dediğim her şey.',
        'A practical guide in twelve short chapters, with worksheets and a private reader community.', 'Çalışma sayfaları ve okurlara özel bir toplulukla, on iki kısa bölümden oluşan pratik bir rehber.')),
      starter('online-course', 'lavender', 'chronicle', copy('Online Course', 'Online Kurs'), hero(
        'Self-paced · lifetime access', 'Kendi hızınızda · ömür boyu erişim',
        'Learn a new skill in six weekends.', 'Altı hafta sonunda yeni bir beceri öğrenin.',
        'Video lessons, real projects and feedback from an instructor who replies.', 'Video dersler, gerçek projeler ve yanıt veren bir eğitmenden geri bildirim.')),
      starter('template-shop', 'lemon', 'bento', copy('Template Shop', 'Şablon Mağazası'), hero(
        'Notion · Figma · spreadsheets', 'Notion · Figma · tablolar',
        'Templates that save you a weekend.', 'Size bir hafta sonu kazandıran şablonlar.',
        'Ready-made planners, trackers and design kits you can duplicate in one click.', 'Tek tıkla çoğaltabileceğiniz hazır planlayıcılar, takip tabloları ve tasarım kitleri.')),
      starter('plugin-marketplace', 'graphite', 'directory', copy('Plugin Marketplace', 'Eklenti Pazarı'), hero(
        'For designers and developers', 'Tasarımcılar ve geliştiriciler için',
        'Small tools that remove big annoyances.', 'Büyük sıkıntıları gideren küçük araçlar.',
        'Plugins that rename layers, tidy code and export assets in the formats you need.', 'Katmanları adlandıran, kodu düzenleyen ve dosyaları ihtiyacınız olan biçimlerde dışa aktaran eklentiler.')),
      starter('wearable', 'midnight', 'split', copy('Wearable', 'Giyilebilir Teknoloji'), hero(
        'Sleep and recovery tracker', 'Uyku ve toparlanma takibi',
        'Know how rested you really are.', 'Gerçekte ne kadar dinlendiğinizi bilin.',
        'A light ring that measures sleep, heart rate and recovery, with no screen to distract you.', 'Uykuyu, nabzı ve toparlanmayı ölçen, dikkatinizi dağıtacak ekranı olmayan hafif bir yüzük.')),
      starter('habit-tracker', 'mint', 'appshell', copy('Habit Tracker', 'Alışkanlık Takibi'), hero(
        'Streaks · reminders · insights', 'Seriler · hatırlatmalar · içgörüler',
        'Small habits, tracked kindly.', 'Küçük alışkanlıklar, nazikçe takip edilir.',
        'Build routines that stick, with streaks that forgive a missed day.', 'Kalıcı rutinler oluşturun; kaçırılan bir günü affeden serilerle.')),
      starter('budget-app', 'navy', 'compare', copy('Budget App', 'Bütçe Uygulaması'), hero(
        'Bank-level encryption', 'Banka düzeyinde şifreleme',
        'See where your money goes, then decide where it should.', 'Paranızın nereye gittiğini görün, sonra nereye gitmesi gerektiğine karar verin.',
        'Connect your accounts, set simple budgets and get a monthly summary in plain language.', 'Hesaplarınızı bağlayın, basit bütçeler belirleyin ve sade bir dille aylık özet alın.')),
    ],
  },
  {
    id: 'gaming', siteCategory: 'other', icon: '🎮', group: 'tech',
    name: copy('Games & Esports', 'Oyun ve Espor'),
    desc: copy('Game studios, esports teams, cafés and communities of players.', 'Oyun stüdyoları, espor takımları, oyun kafeler ve oyuncu toplulukları.'),
    profile: profile({
      nav: [copy('Play', 'Oyna'), copy('Community', 'Topluluk'), copy('Join now', 'Hemen katıl')],
      badge: copy('New season live', 'Yeni sezon başladı'),
      title: copy('Press start with people who play like you.', 'Sizin gibi oynayan insanlarla başla tuşuna basın.'),
      lead: copy('Games, tournaments and a community that makes every session better.', 'Oyunlar, turnuvalar ve her oturumu daha iyi yapan bir topluluk.'),
      cta: copy('Join now', 'Hemen katıl'),
      sectionTitle: copy('What is waiting for you', 'Sizi neler bekliyor'),
      sectionLead: copy('Jump into a match, join a league or just hang out with other players.', 'Bir maça dalın, bir lige katılın ya da sadece diğer oyuncularla takılın.'),
      items: [
        item('Play together', 'Birlikte oynayın', 'Squads, matchmaking and friends lists that actually work.', 'Gerçekten çalışan takımlar, eşleştirme ve arkadaş listeleri.'),
        item('Compete', 'Rekabet edin', 'Weekly tournaments with brackets for every skill level.', 'Her beceri seviyesi için eşleşme tablolarıyla haftalık turnuvalar.'),
        item('Create', 'Üretin', 'Share clips, mods and guides with players who appreciate them.', 'Klip, mod ve rehberlerinizi onları takdir eden oyuncularla paylaşın.'),
      ],
      storyTitle: copy('Fair play, good vibes', 'Adil oyun, iyi enerji'),
      story: copy('Active moderators, clear rules and zero tolerance for cheating keep the community worth logging into.', 'Aktif moderatörler, net kurallar ve hileye sıfır tolerans, topluluğu giriş yapmaya değer kılıyor.'),
      steps: [copy('Create your profile', 'Profilinizi oluşturun'), copy('Find your squad', 'Takımınızı bulun'), copy('Play the first match', 'İlk maçı oynayın')],
      ctaTitle: copy('The lobby is open', 'Lobi açık'),
      ctaCopy: copy("Sign up free, link your platform account and jump into tonight's games.", 'Ücretsiz kaydolun, platform hesabınızı bağlayın ve bu akşamın oyunlarına katılın.'),
      footer: copy('Games, tournaments and a friendly community.', 'Oyunlar, turnuvalar ve samimi bir topluluk.'),
      stats: [[copy('48,000', '48.000'), copy('Players', 'Oyuncu')], ['120', copy('Tournaments a year', 'Yıllık turnuva')], ['24/7', copy('Servers online', 'Açık sunucular')]],
      quote: {
        text: copy('Found my regular squad here after one weekend tournament.', 'Tek bir hafta sonu turnuvasından sonra düzenli takımımı burada buldum.'),
        author: copy('Player since season one', 'İlk sezondan beri oyuncu'),
      },
    }),
    variants: [
      starter('indie-studio', 'lavender', 'lookbook', copy('Indie Game Studio', 'Bağımsız Oyun Stüdyosu'), hero(
        'Wishlist our next game', 'Yeni oyunumuzu istek listenize ekleyin',
        'Small team, handmade worlds.', 'Küçük ekip, elde yapılmış dünyalar.',
        'Atmospheric games with hand-drawn art, original music and stories that stay with you.', 'Elde çizilmiş görseller, özgün müzik ve akılda kalan hikâyelerle atmosferik oyunlar.')),
      starter('game-launch', 'neon', 'poster', copy('Game Launch', 'Oyun Lansmanı'), hero(
        'Out on PC and consoles', 'PC ve konsollarda çıktı',
        'The city is yours. Take it back.', 'Şehir sizin. Geri alın.',
        'An open-world action game with co-op for four and a soundtrack you will hum for weeks.', 'Dört kişilik co-op ve haftalarca mırıldanacağınız bir müzikle açık dünya aksiyon oyunu.')),
      starter('esports-team', 'ink', 'bento', copy('Esports Team', 'Espor Takımı'), hero(
        'League champions 2025', '2025 lig şampiyonu',
        'Five players, one voice on comms.', 'Beş oyuncu, iletişimde tek ses.',
        'Follow the roster, catch the next match and grab the new jersey before it sells out.', 'Kadroyu takip edin, sonraki maçı yakalayın ve yeni formayı tükenmeden alın.')),
      starter('gaming-cafe', 'midnight', 'catalog', copy('Gaming Café', 'Oyun Kafe'), hero(
        'High-end PCs · consoles · snacks', 'Güçlü bilgisayarlar · konsollar · atıştırmalıklar',
        'Your seat is warm and the frame rate is high.', 'Koltuğunuz sıcak, kare hızı yüksek.',
        'Book a station by the hour, bring your friends and stay for Friday night tournaments.', 'Saatlik istasyon ayırtın, arkadaşlarınızı getirin ve Cuma gecesi turnuvalarına kalın.')),
      starter('board-game-cafe', 'citrus', 'directory', copy('Board Game Café', 'Kutu Oyunu Kafesi'), hero(
        '600 games · friendly game gurus', '600 oyun · güler yüzlü oyun rehberleri',
        'Pick a box, grab a table, lose track of time.', 'Bir kutu seçin, bir masaya geçin, zamanı unutun.',
        'Hundreds of games, staff who teach the rules and food that will not ruin the cards.', 'Yüzlerce oyun, kuralları öğreten çalışanlar ve kartları mahvetmeyecek yiyecekler.')),
      starter('tabletop-rpg', 'cocoa', 'letter', copy('Tabletop RPG Club', 'Masa Üstü RPG Kulübü'), hero(
        'Campaigns every week', 'Her hafta kampanyalar',
        'Roll for initiative with a table of new friends.', 'Yeni arkadaşlardan oluşan bir masada inisiyatif için zar atın.',
        'Beginner one-shots, long campaigns and game masters who make every session memorable.', 'Yeni başlayanlar için tek seanslık oyunlar, uzun kampanyalar ve her oturumu unutulmaz kılan oyun yöneticileri.')),
      starter('game-jam', 'lemon', 'chronicle', copy('Game Jam', 'Oyun Maratonu'), hero(
        '48 hours · one theme', '48 saat · tek tema',
        'Make a game in a weekend.', 'Bir hafta sonunda oyun yapın.',
        'Join solo or in a team, build something from scratch and show it to everyone on Sunday.', 'Tek başınıza ya da ekiple katılın, sıfırdan bir şey yapın ve Pazar günü herkese gösterin.')),
      starter('vr-arcade', 'teal', 'showcase', copy('VR Arcade', 'Sanal Gerçeklik Salonu'), hero(
        'Free-roam virtual reality', 'Serbest hareketli sanal gerçeklik',
        'Step inside the game.', 'Oyunun içine adım atın.',
        'Room-scale VR adventures for groups, birthdays and team outings.', 'Gruplar, doğum günleri ve ekip gezileri için oda ölçekli sanal gerçeklik maceraları.')),
      starter('mod-community', 'graphite', 'sidebar', copy('Mod Community', 'Mod Topluluğu'), hero(
        '15,000 mods and counting', '15.000 mod ve artıyor',
        'Make your favourite game new again.', 'En sevdiğiniz oyunu yeniden yeni yapın.',
        'Browse, install and rate mods, with guides for anyone who wants to make their own.', 'Modlara göz atın, kurun ve puanlayın; kendi modunu yapmak isteyenler için rehberlerle.')),
      starter('speedrun-league', 'sunset', 'onepage', copy('Speedrun League', 'Speedrun Ligi'), hero(
        'Monthly races · live commentary', 'Aylık yarışlar · canlı yorum',
        'Every second counts.', 'Her saniye önemli.',
        'Race your favourite games against runners worldwide, with leaderboards and live finals.', 'En sevdiğiniz oyunlarda dünyanın dört bir yanındaki oyuncularla yarışın; sıralamalar ve canlı finallerle.')),
    ],
  },
  {
    id: 'research', siteCategory: 'other', icon: '🔬', group: 'tech',
    name: copy('Science & Research', 'Bilim ve Araştırma'),
    desc: copy('Labs, research groups and institutes sharing their work.', 'Çalışmalarını paylaşan laboratuvarlar, araştırma grupları ve enstitüler.'),
    profile: profile({
      nav: [copy('Research', 'Araştırma'), copy('Team', 'Ekip'), copy('Collaborate', 'İş birliği yapın')],
      badge: copy('Open data · peer reviewed', 'Açık veri · hakemli'),
      title: copy('Careful research on questions that matter.', 'Önemli sorular üzerine özenli araştırma.'),
      lead: copy('We publish our methods, share our data and work with partners who want answers they can trust.', 'Yöntemlerimizi yayımlar, verilerimizi paylaşır ve güvenilir yanıtlar isteyen ortaklarla çalışırız.'),
      cta: copy('Read our work', 'Çalışmalarımızı okuyun'),
      sectionTitle: copy('Current research', 'Güncel araştırmalar'),
      sectionLead: copy('Three programmes, each with open publications and datasets.', 'Her biri açık yayınlar ve veri setleriyle üç program.'),
      items: [
        item('Fundamental research', 'Temel araştırma', 'Long-term questions pursued with patience and rigour.', 'Sabır ve titizlikle sürdürülen uzun vadeli sorular.'),
        item('Applied projects', 'Uygulamalı projeler', 'Work with industry and public partners on real-world problems.', 'Gerçek dünya sorunları üzerine sanayi ve kamu ortaklarıyla çalışmalar.'),
        item('Open data', 'Açık veri', 'Datasets and code released so others can check and build on our work.', 'Başkalarının çalışmamızı kontrol edip üzerine inşa edebilmesi için yayımlanan veri setleri ve kodlar.'),
      ],
      storyTitle: copy('Science in the open', 'Açık bilim'),
      story: copy('Preregistered studies, public code and plain-language summaries for everyone who funds us.', 'Ön kayıtlı çalışmalar, herkese açık kodlar ve bizi finanse eden herkes için sade dilli özetler.'),
      steps: [copy('Read the publications', 'Yayınları okuyun'), copy('Download the data', 'Verileri indirin'), copy('Propose a collaboration', 'Bir iş birliği önerin')],
      ctaTitle: copy('Work with us', 'Bizimle çalışın'),
      ctaCopy: copy('We welcome students, visiting researchers and partners. Write to us with a short proposal.', 'Öğrencileri, misafir araştırmacıları ve ortakları memnuniyetle karşılıyoruz. Kısa bir öneriyle bize yazın.'),
      footer: copy('Rigorous, open research for the public good.', 'Kamu yararı için titiz ve açık araştırma.'),
      stats: [['86', copy('Publications', 'Yayın')], ['24', copy('Researchers', 'Araştırmacı')], ['12', copy('Open datasets', 'Açık veri seti')]],
      quote: {
        text: copy('Their data release saved our project six months of work.', 'Paylaştıkları veriler projemize altı aylık iş kazandırdı.'),
        author: copy('Partner university lab', 'Ortak üniversite laboratuvarı'),
      },
    }),
    variants: [
      starter('research-lab', 'arctic', 'magazine', copy('Research Lab', 'Araştırma Laboratuvarı'), hero(
        'University research group', 'Üniversite araştırma grubu',
        'Understanding how cells decide.', 'Hücrelerin nasıl karar verdiğini anlamak.',
        'A molecular biology lab studying cell signalling, with open positions for PhD students.', 'Hücre sinyalleşmesini inceleyen, doktora öğrencileri için açık pozisyonları olan bir moleküler biyoloji laboratuvarı.')),
      starter('biotech-startup', 'mint', 'appshell', copy('Biotech Startup', 'Biyoteknoloji Girişimi'), hero(
        'Series A · clinical stage', 'A serisi · klinik aşama',
        'Faster diagnostics, closer to the patient.', 'Hastaya daha yakın, daha hızlı tanı.',
        'A rapid test platform that brings lab-quality results to the clinic in fifteen minutes.', 'Laboratuvar kalitesinde sonuçları on beş dakikada kliniğe getiren hızlı test platformu.')),
      starter('observatory', 'midnight', 'showcase', copy('Observatory', 'Gözlemevi'), hero(
        'Public nights every Friday', 'Her Cuma halka açık geceler',
        'Look up. Further than you think.', 'Yukarı bakın. Düşündüğünüzden daha uzağa.',
        'Research telescopes by day, public stargazing and talks by night.', 'Gündüz araştırma teleskopları, gece halka açık gözlem ve söyleşiler.')),
      starter('think-tank', 'press', 'letter', copy('Policy Think Tank', 'Politika Düşünce Kuruluşu'), hero(
        'Independent · non-partisan', 'Bağımsız · tarafsız',
        'Evidence for better public decisions.', 'Daha iyi kamu kararları için kanıt.',
        'Research, briefings and events on the economy, climate and cities.', 'Ekonomi, iklim ve şehirler üzerine araştırmalar, bilgi notları ve etkinlikler.')),
      starter('data-science-lab', 'graphite', 'bento', copy('Data Science Lab', 'Veri Bilimi Laboratuvarı'), hero(
        'Models · analysis · training', 'Modeller · analiz · eğitim',
        'Turn messy data into decisions.', 'Dağınık veriyi kararlara dönüştürün.',
        'Applied data science and machine learning projects for public and private partners.', 'Kamu ve özel ortaklar için uygulamalı veri bilimi ve makine öğrenmesi projeleri.')),
      starter('climate-institute', 'forest', 'chronicle', copy('Climate Institute', 'İklim Enstitüsü'), hero(
        'Research · monitoring · outreach', 'Araştırma · izleme · toplumla buluşma',
        'Measuring a changing coastline.', 'Değişen bir kıyı şeridini ölçmek.',
        'Long-term climate monitoring and research on how coastal communities can adapt.', 'Uzun vadeli iklim izleme ve kıyı topluluklarının nasıl uyum sağlayabileceğine dair araştırmalar.')),
      starter('clinical-research', 'sky', 'compare', copy('Clinical Research', 'Klinik Araştırma'), hero(
        'Now recruiting volunteers', 'Şimdi gönüllü alıyoruz',
        'Help test the treatments of tomorrow.', 'Yarının tedavilerini test etmeye yardım edin.',
        'Ethically approved studies with clear information, careful monitoring and travel costs covered.', 'Net bilgilendirme, dikkatli takip ve karşılanan yol masraflarıyla etik onaylı çalışmalar.')),
      starter('robotics-lab', 'steel', 'split', copy('Robotics Lab', 'Robotik Laboratuvarı'), hero(
        'Autonomy · manipulation · safety', 'Otonomi · manipülasyon · güvenlik',
        'Robots that work safely beside people.', 'İnsanların yanında güvenle çalışan robotlar.',
        'Research on perception and control for robots in homes, hospitals and warehouses.', 'Evlerde, hastanelerde ve depolarda çalışacak robotlar için algılama ve kontrol üzerine araştırmalar.')),
      starter('humanities-group', 'ivory', 'sidebar', copy('University Research Group', 'Üniversite Araştırma Grubu'), hero(
        'Faculty of Humanities', 'İnsan Bilimleri Fakültesi',
        'Reading the past through its letters.', 'Geçmişi mektupları üzerinden okumak.',
        'A digital humanities project transcribing and mapping two centuries of correspondence.', 'İki yüzyıllık yazışmaları çözümleyen ve haritalayan bir dijital beşerî bilimler projesi.')),
      starter('open-science-hub', 'lemon', 'directory', copy('Open Science Hub', 'Açık Bilim Merkezi'), hero(
        'Datasets · code · preprints', 'Veri setleri · kod · ön baskılar',
        'Research anyone can check.', 'Herkesin kontrol edebileceği araştırma.',
        'A shared home for open datasets, reusable code and preprints across disciplines.', 'Disiplinler arası açık veri setleri, yeniden kullanılabilir kodlar ve ön baskılar için ortak bir ev.')),
    ],
  },
  {
    id: 'agency', siteCategory: 'business', icon: '💡', group: 'creative',
    name: copy('Creative & Marketing Agencies', 'Yaratıcı ve Pazarlama Ajansları'),
    desc: copy('Branding studios, marketing agencies and creative teams for hire.', 'Marka stüdyoları, pazarlama ajansları ve kiralanabilecek yaratıcı ekipler.'),
    profile: profile({
      nav: [copy('Work', 'Çalışmalar'), copy('Services', 'Hizmetler'), copy('Start a project', 'Projeyi başlat')],
      badge: copy('Independent creative studio', 'Bağımsız yaratıcı stüdyo'),
      title: copy('Ideas that get noticed, and results you can measure.', 'Fark edilen fikirler ve ölçebileceğiniz sonuçlar.'),
      lead: copy('Strategy, design and campaigns for brands that want to stand out without shouting.', 'Bağırmadan öne çıkmak isteyen markalar için strateji, tasarım ve kampanyalar.'),
      cta: copy('Start a project', 'Projeyi başlat'),
      sectionTitle: copy('What we do best', 'En iyi yaptığımız işler'),
      sectionLead: copy('A senior team that takes an idea from the first workshop to the final launch.', 'Bir fikri ilk atölyeden son lansmana kadar taşıyan deneyimli bir ekip.'),
      items: [
        item('Brand strategy', 'Marka stratejisi', 'Positioning, naming and a story your team can tell.', 'Konumlandırma, isimlendirme ve ekibinizin anlatabileceği bir hikâye.'),
        item('Identity & design', 'Kimlik ve tasarım', 'Logos, typography and systems that work everywhere.', 'Her yerde çalışan logolar, tipografi ve sistemler.'),
        item('Campaigns & content', 'Kampanyalar ve içerik', 'Launches, social content and ads that earn attention.', 'Dikkati hak eden lansmanlar, sosyal medya içerikleri ve reklamlar.'),
      ],
      storyTitle: copy('Small team, big clients', 'Küçük ekip, büyük müşteriler'),
      story: copy('You work directly with the people doing the work. No account layers, no surprise invoices.', 'İşi yapan insanlarla doğrudan çalışırsınız. Aracı katman yok, sürpriz fatura yok.'),
      steps: [copy('Discovery workshop', 'Keşif atölyesi'), copy('Concepts and direction', 'Konseptler ve yön'), copy('Launch and learn', 'Yayınla ve öğren')],
      ctaTitle: copy('Have a brief?', 'Bir brifiniz mi var?'),
      ctaCopy: copy('Send us a few lines about the challenge. We reply within two working days.', 'Bize birkaç satırla meseleyi anlatın. İki iş günü içinde dönüş yapıyoruz.'),
      footer: copy('Brand, design and campaigns from an independent studio.', 'Bağımsız bir stüdyodan marka, tasarım ve kampanyalar.'),
      stats: [['60+', copy('Brands launched', 'Hayata geçirilen marka')], ['9', copy('People in the studio', 'Kişilik stüdyo')], ['14', copy('Industry awards', 'Sektör ödülü')]],
      quote: {
        text: copy('They made us sound like ourselves, only clearer.', 'Bizi kendimiz gibi, ama daha net anlatmamızı sağladılar.'),
        author: copy('CEO, specialty coffee brand', 'CEO, nitelikli kahve markası'),
      },
    }),
    variants: [
      starter('branding-studio', 'mono', 'lookbook', copy('Branding Studio', 'Marka Stüdyosu'), hero(
        'Identity · packaging · naming', 'Kimlik · ambalaj · isimlendirme',
        'Brands with a point of view.', 'Bir bakış açısı olan markalar.',
        'Identity systems and packaging for founders who care how things look and feel.', 'Görünüşe ve hisse önem veren kurucular için kimlik sistemleri ve ambalaj tasarımı.')),
      starter('growth-agency', 'citrus', 'compare', copy('Growth Agency', 'Büyüme Ajansı'), hero(
        'Paid media · SEO · CRO', 'Ücretli medya · SEO · dönüşüm optimizasyonu',
        'More customers, lower cost per click.', 'Daha çok müşteri, daha düşük tıklama maliyeti.',
        'Performance marketing with weekly reports in plain language and no long contracts.', 'Sade dilde haftalık raporlar ve uzun sözleşmeler olmadan performans pazarlaması.')),
      starter('video-production', 'noir', 'showcase', copy('Video Production', 'Video Prodüksiyon'), hero(
        'Commercials · documentaries · social', 'Reklam filmleri · belgeseller · sosyal medya',
        'Stories worth watching to the end.', 'Sonuna kadar izlenmeye değer hikâyeler.',
        'From script to final grade, a production team that makes brands feel human.', 'Senaryodan renk düzenlemesine, markaları insani hissettiren bir prodüksiyon ekibi.')),
      starter('web-studio', 'indigo', 'stack', copy('Web Studio', 'Web Stüdyosu'), hero(
        'Design and development', 'Tasarım ve geliştirme',
        'Websites that load fast and sell well.', 'Hızlı açılan ve iyi satan web siteleri.',
        'Strategy, design and development for marketing sites and online stores.', 'Pazarlama siteleri ve online mağazalar için strateji, tasarım ve geliştirme.')),
      starter('pr-firm', 'press', 'magazine', copy('PR Firm', 'Halkla İlişkiler Ajansı'), hero(
        'Media relations · crisis · launches', 'Medya ilişkileri · kriz · lansmanlar',
        'Get the story told, and told right.', 'Hikâyenizi anlatın, doğru anlatın.',
        'Press relations and communications strategy for companies with something to say.', 'Söyleyecek sözü olan şirketler için basın ilişkileri ve iletişim stratejisi.')),
      starter('social-media-agency', 'sunset', 'bento', copy('Social Media Agency', 'Sosyal Medya Ajansı'), hero(
        'Content · community · creators', 'İçerik · topluluk · içerik üreticileri',
        'Content people actually stop scrolling for.', 'İnsanların gerçekten kaydırmayı durdurduğu içerikler.',
        'Short-form video, community management and creator partnerships that feel native.', 'Doğal hissettiren kısa videolar, topluluk yönetimi ve içerik üretici iş birlikleri.')),
      starter('seo-agency', 'forest', 'directory', copy('SEO Agency', 'SEO Ajansı'), hero(
        'Technical SEO · content · links', 'Teknik SEO · içerik · bağlantılar',
        'Be the answer when customers search.', 'Müşteriler arama yaptığında yanıt siz olun.',
        'Audits, content plans and honest link building that grow traffic month after month.', 'Trafiği her ay büyüten denetimler, içerik planları ve dürüst bağlantı çalışmaları.')),
      starter('ux-consultancy', 'lavender', 'chronicle', copy('UX Consultancy', 'UX Danışmanlığı'), hero(
        'Research · testing · design', 'Araştırma · test · tasarım',
        'Find out why users leave, then fix it.', 'Kullanıcıların neden ayrıldığını öğrenin, sonra düzeltin.',
        'User research, usability testing and design sprints that turn guesses into evidence.', 'Tahminleri kanıta dönüştüren kullanıcı araştırmaları, kullanılabilirlik testleri ve tasarım sprintleri.')),
      starter('illustration-studio', 'coral', 'split', copy('Illustration Studio', 'İllüstrasyon Stüdyosu'), hero(
        'Editorial · brand · animation', 'Editoryal · marka · animasyon',
        'Drawings that explain what words cannot.', 'Kelimelerin anlatamadığını anlatan çizimler.',
        'Custom illustration and motion for brands, publishers and product teams.', 'Markalar, yayıncılar ve ürün ekipleri için özel illüstrasyon ve hareketli grafik.')),
      starter('content-studio', 'paper', 'letter', copy('Content Studio', 'İçerik Stüdyosu'), hero(
        'Copywriting · editorial · newsletters', 'Metin yazarlığı · editoryal · bültenler',
        'Words that sound like you on your best day.', 'En iyi gününüzdeki gibi konuşan kelimeler.',
        'Website copy, articles and newsletters written by editors who ask good questions.', 'İyi sorular soran editörlerin yazdığı web sitesi metinleri, makaleler ve bültenler.')),
    ],
  },
]
