// Pages for everyday life: pets, children, celebrations, sport and the public
// services a city runs.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const PEOPLE_SEEDS = [
  {
    id: 'pets', siteCategory: 'business', icon: '🐾', group: 'shops',
    name: copy('Pets & Animals', 'Evcil Hayvanlar'),
    desc: copy('Groomers, trainers, pet hotels and shops for the animals we love.', 'Sevdiğimiz hayvanlar için bakım salonları, eğitmenler, pet oteller ve mağazalar.'),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('Meet the team', 'Ekiple tanışın'), copy('Book a visit', 'Ziyaret ayırt')],
      badge: copy('Gentle care for happy pets', 'Mutlu dostlar için nazik bakım'),
      title: copy('Care your pet will actually enjoy.', 'Dostunuzun gerçekten keyif alacağı bir bakım.'),
      lead: copy('Patient people, calm spaces and updates with photos, so you never have to wonder.', 'Sabırlı insanlar, sakin alanlar ve fotoğraflı güncellemeler; böylece hiç merak etmezsiniz.'),
      cta: copy('Book a visit', 'Ziyaret ayırt'),
      sectionTitle: copy('How we can help', 'Nasıl yardımcı olabiliriz'),
      sectionLead: copy('Everything your dog or cat needs, from a quick trim to a long stay.', 'Kısa bir tıraştan uzun bir konaklamaya, köpeğinizin ya da kedinizin ihtiyacı olan her şey.'),
      items: [
        item('Grooming', 'Bakım ve tıraş', 'Baths, trims and nail care, done calmly and without rushing.', 'Banyo, tıraş ve tırnak bakımı; sakin ve acele etmeden.'),
        item('Day care & stays', 'Kreş ve konaklama', 'Play, rest and company while you are at work or away.', 'Siz işteyken ya da uzaktayken oyun, dinlenme ve arkadaşlık.'),
        item('Dog training', 'Köpek eğitimi', 'Friendly, reward-based training for puppies and grown-ups.', 'Yavrular ve yetişkinler için ödül temelli, dostane eğitim.'),
      ],
      storyTitle: copy('Treated like family', 'Ailenin bir parçası gibi'),
      story: copy('Small groups, trained staff and a vet on call. We only take as many pets as we can properly look after.', 'Küçük gruplar, eğitimli personel ve her an ulaşılabilen bir veteriner. Yalnızca gerçekten ilgilenebileceğimiz kadar dost kabul ediyoruz.'),
      steps: [copy('Tell us about your pet', 'Bize dostunuzu anlatın'), copy('Come for a meet and greet', 'Tanışma ziyaretine gelin'), copy('Book with confidence', 'Gönül rahatlığıyla ayırtın')],
      ctaTitle: copy('First visit? Say hello first', 'İlk ziyaret mi? Önce bir merhaba deyin'),
      ctaCopy: copy('Bring your pet for a free meet and greet, so they can sniff the place out before their first stay.', 'İlk konaklamadan önce ortamı koklayabilmesi için dostunuzu ücretsiz bir tanışma ziyaretine getirin.'),
      footer: copy('Kind, professional care for dogs and cats.', 'Köpekler ve kediler için şefkatli, profesyonel bakım.'),
      stats: [[copy('1,800', '1.800'), copy('Happy pets', 'Mutlu dost')], [copy('4.9', '4,9'), copy('Owner rating', 'Sahip puanı')], ['24/7', copy('Vet on call', 'Nöbetçi veteriner')]],
      quote: {
        text: copy('Our dog pulls us to the door every morning.', 'Köpeğimiz her sabah bizi kapıya doğru çekiyor.'),
        author: copy('Owner of Luna, a day care regular', "Luna'nın sahibi, kreşin müdavimi"),
      },
    }),
    variants: [
      starter('dog-grooming', 'bubble', 'catalog', copy('Dog Grooming', 'Köpek Kuaförü'), hero(
        'Salon and mobile van', 'Salon ve mobil araç',
        'Fresh, fluffy and completely relaxed.', 'Tertemiz, kabarık ve tamamen rahat.',
        'Breed-specific cuts, gentle handling and a mobile van that comes to your door.', 'Irka özel kesimler, nazik yaklaşım ve kapınıza gelen mobil bir araç.')),
      starter('pet-hotel', 'sand', 'booking', copy('Pet Hotel', 'Pet Otel'), hero(
        'Holiday stays for dogs and cats', 'Köpek ve kediler için tatil konaklaması',
        'A holiday for them while you are on yours.', 'Siz tatildeyken onlar da tatilde.',
        'Spacious rooms, daily walks and a photo update every evening.', 'Geniş odalar, günlük yürüyüşler ve her akşam fotoğraflı bir güncelleme.')),
      starter('dog-trainer', 'forest', 'chronicle', copy('Dog Trainer', 'Köpek Eğitmeni'), hero(
        'Puppy classes · one-to-one', 'Yavru sınıfları · bire bir',
        'A calmer walk starts here.', 'Daha sakin bir yürüyüş burada başlar.',
        'Reward-based training that builds trust, focus and good manners.', 'Güven, odak ve iyi davranışlar kazandıran ödül temelli eğitim.')),
      starter('cat-cafe', 'rose', 'lookbook', copy('Cat Café', 'Kedi Kafe'), hero(
        'Twelve resident cats · all adoptable', 'On iki yerleşik kedi · hepsi sahiplenilebilir',
        'Coffee, cake and a cat on your lap.', 'Kahve, pasta ve kucağınızda bir kedi.',
        'Book an hour with our cats, and maybe take one of them home.', 'Kedilerimizle bir saat ayırtın; belki birini eve götürürsünüz.')),
      starter('pet-food-brand', 'citrus', 'compare', copy('Pet Food Brand', 'Mama Markası'), hero(
        'Vet-approved recipes', 'Veteriner onaylı tarifler',
        'Food they love, ingredients you can read.', 'Sevdikleri mama, okuyabileceğiniz içerikler.',
        'Complete meals made from real meat and vegetables, delivered on your schedule.', 'Gerçek et ve sebzelerle hazırlanan tam öğünler; sizin programınıza göre teslim.')),
      starter('aquarium-shop', 'ocean', 'directory', copy('Aquarium Shop', 'Akvaryum Dükkânı'), hero(
        'Fish · plants · aquascaping', 'Balıklar · bitkiler · akvaryum tasarımı',
        'A small world, living in your home.', 'Evinizde yaşayan küçük bir dünya.',
        'Healthy fish, planted tanks and advice that keeps your aquarium thriving.', 'Sağlıklı balıklar, bitkili akvaryumlar ve akvaryumunuzu canlı tutan tavsiyeler.')),
      starter('riding-stable', 'cocoa', 'showcase', copy('Riding Stable', 'Binicilik Kulübü'), hero(
        'Lessons · livery · pony club', 'Dersler · pansiyon · midilli kulübü',
        'Learn to ride with patient horses.', 'Sabırlı atlarla binmeyi öğrenin.',
        'Lessons for all ages, livery for your own horse and trail rides every weekend.', 'Her yaşa dersler, kendi atınız için pansiyon ve her hafta sonu patika sürüşleri.')),
      starter('pet-sitter', 'mint', 'solo', copy('Pet Sitter', 'Evcil Hayvan Bakıcısı'), hero(
        'Home visits and walks', 'Ev ziyaretleri ve yürüyüşler',
        'They stay home, happy and looked after.', 'Evde kalırlar; mutlu ve bakımlı.',
        'Insured, experienced sitters for walks, feeding and company while you are away.', 'Siz yokken yürüyüş, besleme ve arkadaşlık için sigortalı ve deneyimli bakıcılar.')),
      starter('pet-photographer', 'lavender', 'bento', copy('Pet Photographer', 'Evcil Hayvan Fotoğrafçısı'), hero(
        'Studio and outdoor sessions', 'Stüdyo ve açık hava çekimleri',
        'Portraits with plenty of personality.', 'Kişiliği bol portreler.',
        'Relaxed photo sessions, treats included, and prints you will want on every wall.', 'Ödül mamaları dahil rahat çekimler ve her duvara asmak isteyeceğiniz baskılar.')),
      starter('pet-boutique', 'plum', 'stack', copy('Pet Boutique', 'Pet Butik'), hero(
        'Beds · toys · accessories', 'Yataklar · oyuncaklar · aksesuarlar',
        'Beautiful things for your best friend.', 'En iyi dostunuz için güzel şeyler.',
        'Well-made beds, collars and toys that look good in your home and survive the chewing.', 'Evinizde güzel duran ve ısırılmaya dayanan, iyi yapılmış yataklar, tasmalar ve oyuncaklar.')),
    ],
  },
  {
    id: 'kids', siteCategory: 'business', icon: '🧸', group: 'community',
    name: copy('Kids & Family', 'Çocuk ve Aile'),
    desc: copy('Nurseries, camps, classes and services for children and parents.', 'Çocuklar ve ebeveynler için kreşler, kamplar, kurslar ve hizmetler.'),
    profile: profile({
      nav: [copy('Programmes', 'Programlar'), copy('Our approach', 'Yaklaşımımız'), copy('Visit us', 'Bizi ziyaret edin')],
      badge: copy('Play-based · qualified educators', 'Oyun temelli · uzman eğitimciler'),
      title: copy('A happy place to learn, play and grow.', 'Öğrenmek, oynamak ve büyümek için mutlu bir yer.'),
      lead: copy('Warm educators, safe spaces and days full of curiosity, with updates for parents every afternoon.', 'Sıcak eğitimciler, güvenli alanlar ve merak dolu günler; ebeveynlere her öğleden sonra bilgilendirme.'),
      cta: copy('Book a visit', 'Ziyaret ayırt'),
      sectionTitle: copy('Programmes for every age', 'Her yaşa uygun programlar'),
      sectionLead: copy('Small groups, gentle routines and plenty of time outdoors.', 'Küçük gruplar, nazik rutinler ve bolca açık hava zamanı.'),
      items: [
        item('Little ones', 'Minikler', 'Care for babies and toddlers, built around their own rhythm.', 'Bebekler ve küçük çocuklar için kendi ritimlerine göre kurulmuş bakım.'),
        item('Preschool', 'Okul öncesi', 'Play-based learning that gets children ready for school.', 'Çocukları okula hazırlayan oyun temelli öğrenme.'),
        item('After school', 'Okul sonrası', 'Homework help, clubs and a snack before pick-up.', 'Ödev desteği, kulüpler ve eve dönmeden önce bir ara öğün.'),
      ],
      storyTitle: copy('Safe, warm and curious', 'Güvenli, sıcak ve meraklı'),
      story: copy('Qualified staff, secure doors and a daily photo diary, so parents always know how the day went.', 'Uzman personel, güvenli girişler ve günlük fotoğraflı günlük; ebeveynler günün nasıl geçtiğini her zaman bilir.'),
      steps: [copy('Book a visit', 'Ziyaret ayırt'), copy('Settle in gently', 'Yavaş yavaş alışın'), copy('Watch them flourish', 'Gelişimlerini izleyin')],
      ctaTitle: copy('Come and see a day with us', 'Bizimle bir günü görmeye gelin'),
      ctaCopy: copy('Visit during the morning, meet the team and ask everything you want to know.', 'Sabah saatlerinde ziyaret edin, ekiple tanışın ve bilmek istediğiniz her şeyi sorun.'),
      footer: copy('Caring, play-based education for young children.', 'Küçük çocuklar için şefkatli, oyun temelli eğitim.'),
      stats: [['1:4', copy('Staff to child ratio', 'Eğitimci-çocuk oranı')], ['12', copy('Children per group', 'Grup başına çocuk')], [copy('2,000 m²', '2.000 m²'), copy('Garden to explore', 'Keşfedilecek bahçe')]],
      quote: {
        text: copy('Our daughter runs in every morning without looking back.', 'Kızımız her sabah arkasına bakmadan içeri koşuyor.'),
        author: copy('Parent', 'Veli'),
      },
    }),
    variants: [
      starter('day-care', 'bubble', 'service', copy('Day Care', 'Kreş'), hero(
        'Ages 1 to 4', '1-4 yaş',
        'A second home for your little one.', 'Minikleriniz için ikinci bir ev.',
        'Nurturing day care with healthy meals, nap time and lots of play.', 'Sağlıklı öğünler, uyku saati ve bolca oyunla şefkatli bir kreş.')),
      starter('kindergarten', 'sky', 'catalog', copy('Kindergarten', 'Anaokulu'), hero(
        'Bilingual preschool', 'İki dilli okul öncesi',
        'Curious minds, happy hearts.', 'Meraklı zihinler, mutlu kalpler.',
        'A bilingual kindergarten where children learn through projects, music and nature.', 'Çocukların projeler, müzik ve doğa aracılığıyla öğrendiği iki dilli bir anaokulu.')),
      starter('kids-parties', 'sunset', 'bento', copy('Kids Parties', 'Çocuk Partileri'), hero(
        'Themes · games · cake', 'Temalar · oyunlar · pasta',
        'The party they will talk about all year.', 'Bütün yıl konuşacakları parti.',
        'Themed parties with entertainers, games and decorations, at our place or yours.', 'Animatörler, oyunlar ve süslemelerle temalı partiler; bizim mekânımızda ya da sizinkinde.')),
      starter('summer-camp', 'forest', 'chronicle', copy('Summer Camp', 'Yaz Kampı'), hero(
        'Two-week sessions · ages 8 to 14', 'İki haftalık dönemler · 8-14 yaş',
        'Lakes, campfires and new best friends.', 'Göller, kamp ateşleri ve yeni can dostları.',
        'Outdoor adventures, sports and crafts with trained counsellors, in the forest by the lake.', 'Gölün kıyısındaki ormanda eğitimli rehberlerle açık hava maceraları, sporlar ve el işleri.')),
      starter('baby-store', 'rose', 'lookbook', copy('Baby Store', 'Bebek Mağazası'), hero(
        'Essentials for the first year', 'İlk yıl için temel ihtiyaçlar',
        'Soft, safe and ready for the first day home.', 'Yumuşak, güvenli ve eve ilk gün için hazır.',
        'Organic clothing, tested gear and friendly advice for new parents.', 'Organik kıyafetler, test edilmiş ürünler ve yeni ebeveynler için samimi tavsiyeler.')),
      starter('nanny-agency', 'lavender', 'directory', copy('Nanny Agency', 'Bakıcı Ajansı'), hero(
        'Vetted, experienced nannies', 'Güvenilir, deneyimli bakıcılar',
        'The right person to care for your children.', 'Çocuklarınıza bakacak doğru kişi.',
        'Background-checked nannies and babysitters, matched to your family by people who listen.', 'Sizi dinleyen insanlar tarafından ailenize uygun eşleştirilen, geçmişi kontrol edilmiş bakıcılar.')),
      starter('play-cafe', 'citrus', 'split', copy('Play Café', 'Oyun Kafe'), hero(
        'Soft play · good coffee', 'Oyun alanı · iyi kahve',
        'They play, you drink your coffee while it is hot.', 'Onlar oynasın, siz kahvenizi sıcakken için.',
        'A safe soft-play area for under-sixes, with a café that takes coffee seriously.', 'Altı yaş altı için güvenli bir oyun alanı ve kahveyi ciddiye alan bir kafe.')),
      starter('kids-music-school', 'plum', 'stack', copy('Kids Music School', 'Çocuk Müzik Okulu'), hero(
        'Ages 3 to 12', '3-12 yaş',
        'First notes, big smiles.', 'İlk notalar, kocaman gülümsemeler.',
        'Music classes, instrument lessons and an end-of-term concert for the family.', 'Müzik dersleri, enstrüman eğitimi ve aile için dönem sonu konseri.')),
      starter('kids-sports-club', 'lemon', 'poster', copy('Kids Sports Club', 'Çocuk Spor Kulübü'), hero(
        'Football · swimming · gymnastics', 'Futbol · yüzme · jimnastik',
        'Run, jump, laugh, repeat.', 'Koş, zıpla, gül, tekrarla.',
        'Fun, well-coached sports for children who just want to move.', 'Sadece hareket etmek isteyen çocuklar için eğlenceli ve iyi yönetilen sporlar.')),
      starter('family-photographer', 'sand', 'editorial', copy('Family Photographer', 'Aile Fotoğrafçısı'), hero(
        'Relaxed outdoor sessions', 'Rahat açık hava çekimleri',
        'Real moments, not stiff poses.', 'Kaskatı pozlar değil, gerçek anlar.',
        'Natural family portraits in the park, at home or at the beach, with plenty of time to warm up.', 'Parkta, evde ya da sahilde, ısınmak için bolca zaman tanıyan doğal aile portreleri.')),
    ],
  },
  {
    id: 'weddings', siteCategory: 'business', icon: '💐', group: 'community',
    name: copy('Weddings & Events', 'Düğün ve Organizasyon'),
    desc: copy('Planners, venues, caterers and everyone who makes a big day happen.', 'Büyük bir günü gerçekleştiren organizatörler, mekânlar, catering firmaları ve herkes.'),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('Gallery', 'Galeri'), copy('Check dates', 'Tarihleri kontrol edin')],
      badge: copy('Weddings · celebrations · corporate events', 'Düğünler · kutlamalar · kurumsal etkinlikler'),
      title: copy('The day you imagined, without the stress.', 'Hayal ettiğiniz gün, stres olmadan.'),
      lead: copy('Planning, styling and coordination by a team that has done this hundreds of times.', 'Bunu yüzlerce kez yapmış bir ekipten planlama, stil ve koordinasyon.'),
      cta: copy('Check dates', 'Tarihleri kontrol edin'),
      sectionTitle: copy('How we help', 'Nasıl yardımcı oluyoruz'),
      sectionLead: copy('Full planning, partial support or just the day itself; you choose.', 'Tam planlama, kısmi destek ya da yalnızca günün kendisi; seçim sizin.'),
      items: [
        item('Full planning', 'Tam planlama', 'From the first venue visit to the last dance.', 'İlk mekân ziyaretinden son dansa kadar.'),
        item('Styling & flowers', 'Stil ve çiçekler', 'A look that feels like you, carried through every detail.', 'Size benzeyen ve her ayrıntıya yansıyan bir görünüm.'),
        item('On-the-day coordination', 'Gün boyu koordinasyon', 'We run the timeline so you can enjoy every minute.', 'Siz her dakikanın keyfini çıkarın diye akışı biz yönetiriz.'),
      ],
      storyTitle: copy('Calm people for a big day', 'Büyük bir gün için sakin insanlar'),
      story: copy('We plan the details early, keep a clear timeline and handle surprises quietly, before you ever notice them.', 'Ayrıntıları erkenden planlar, net bir akış tutar ve sürprizleri siz fark etmeden sessizce hallederiz.'),
      steps: [copy('Tell us your date', 'Tarihinizi söyleyin'), copy('Plan it together', 'Birlikte planlayalım'), copy('Enjoy your day', 'Gününüzün tadını çıkarın')],
      ctaTitle: copy('Is your date still free?', 'Tarihiniz hâlâ boş mu?'),
      ctaCopy: copy('Send us your date, the number of guests and a few words about your plans.', 'Tarihinizi, misafir sayısını ve planlarınızla ilgili birkaç kelimeyi bize gönderin.'),
      footer: copy('Weddings and celebrations, beautifully planned.', 'Özenle planlanmış düğünler ve kutlamalar.'),
      stats: [['300+', copy('Weddings planned', 'Planlanan düğün')], ['15', copy('Years of experience', 'Yıllık deneyim')], ['50', copy('Trusted suppliers', 'Güvenilir tedarikçi')]],
      quote: {
        text: copy('We did not have to think about a single thing on the day.', 'O gün tek bir şey hakkında bile düşünmek zorunda kalmadık.'),
        author: copy('Newlyweds, summer wedding', 'Yeni evliler, yaz düğünü'),
      },
    }),
    variants: [
      starter('wedding-planner', 'ivory', 'editorial', copy('Wedding Planner', 'Düğün Organizatörü'), hero(
        'Planning and design since 2011', "2011'den beri planlama ve tasarım",
        'Beautiful weddings, calmly planned.', 'Sakin bir şekilde planlanmış güzel düğünler.',
        'Full-service planning for couples who want every detail considered and every guest looked after.', 'Her ayrıntının düşünüldüğü ve her misafirle ilgilenildiği bir düğün isteyen çiftler için tam hizmet planlama.')),
      starter('event-venue', 'sand', 'showcase', copy('Event Venue', 'Etkinlik Mekânı'), hero(
        'Garden · terrace · ballroom', 'Bahçe · teras · balo salonu',
        'A venue that sets the scene by itself.', 'Sahneyi kendi başına kuran bir mekân.',
        'Indoor and outdoor spaces for up to 300 guests, with an in-house team for everything.', '300 misafire kadar iç ve dış mekânlar; her şey için kendi ekibimizle.')),
      starter('event-catering', 'olive', 'catalog', copy('Event Catering', 'Etkinlik Catering'), hero(
        'Menus for 20 to 500 guests', '20 ila 500 misafir için menüler',
        'Food people talk about after the party.', 'Partiden sonra konuşulan yemekler.',
        'Seasonal menus, tastings before you decide and service staff who know what they are doing.', 'Mevsimlik menüler, karar vermeden önce tadım ve işini bilen servis ekibi.')),
      starter('party-dj', 'neon', 'poster', copy('Party DJ', 'Parti DJ'), hero(
        'Weddings · birthdays · corporate', 'Düğünler · doğum günleri · kurumsal',
        'Keep the dance floor full until the end.', 'Dans pistini sonuna kadar dolu tutun.',
        'A DJ who reads the room, plays your must-haves and skips your never-evers.', 'Ortamı okuyan, mutlaka çalmasını istediklerinizi çalan ve asla istemediklerinizi atlayan bir DJ.')),
      starter('conference', 'arctic', 'onepage', copy('Conference', 'Konferans'), hero(
        'Two days · forty speakers', 'İki gün · kırk konuşmacı',
        'Ideas, people and a very good lunch.', 'Fikirler, insanlar ve çok iyi bir öğle yemeği.',
        'Talks, workshops and time to meet the people doing the most interesting work in the field.', 'Konuşmalar, atölyeler ve alanda en ilginç işleri yapan insanlarla tanışmak için zaman.')),
      starter('gala-dinner', 'navy', 'letter', copy('Gala Dinner', 'Gala Yemeği'), hero(
        'Black tie · charity auction', 'Siyah kravat · yardım müzayedesi',
        'An evening for a good cause.', 'Anlamlı bir amaç için bir akşam.',
        'Dinner, music and an auction supporting local schools. Tables of ten available.', 'Yerel okulları destekleyen akşam yemeği, müzik ve müzayede. On kişilik masalar mevcut.')),
      starter('photo-booth', 'bubble', 'bento', copy('Photo Booth', 'Fotoğraf Kabini'), hero(
        'Instant prints · props included', 'Anında baskı · aksesuarlar dahil',
        'The corner everyone ends up in.', 'Herkesin sonunda toplandığı köşe.',
        'A stylish booth with instant prints, a digital gallery and an attendant all evening.', 'Anında baskı, dijital galeri ve bütün akşam başında duran bir görevliyle şık bir kabin.')),
      starter('event-rentals', 'steel', 'directory', copy('Event Rentals', 'Etkinlik Ekipman Kiralama'), hero(
        'Tables · chairs · tents · lighting', 'Masalar · sandalyeler · çadırlar · aydınlatma',
        'Everything for the event, delivered and set up.', 'Etkinlik için her şey, teslim ve kurulum dahil.',
        'Furniture, tableware, tents and lighting, with delivery, setup and collection.', 'Mobilya, masa takımları, çadırlar ve aydınlatma; teslimat, kurulum ve toplama dahil.')),
      starter('event-florist', 'rose', 'lookbook', copy('Event Florist', 'Etkinlik Çiçekçisi'), hero(
        'Arches · tables · bouquets', 'Taklar · masa süsleri · buketler',
        'Flowers that make the room.', 'Mekânı baştan yaratan çiçekler.',
        'Seasonal installations and bridal flowers designed around your venue and colours.', 'Mekânınıza ve renklerinize göre tasarlanan mevsimlik düzenlemeler ve gelin çiçekleri.')),
      starter('party-planner', 'citrus', 'stack', copy('Party Planner', 'Parti Organizatörü'), hero(
        'Birthdays · anniversaries · surprises', 'Doğum günleri · yıldönümleri · sürprizler',
        'Throw the party, skip the stress.', 'Partiyi verin, stresi atlayın.',
        'Themes, invitations, venue and catering sorted, so you get to be a guest at your own party.', 'Tema, davetiye, mekân ve ikramlar hazır; kendi partinizde misafir olun.')),
    ],
  },
  {
    id: 'sports', siteCategory: 'other', icon: '⚽', group: 'health',
    name: copy('Sports Clubs & Academies', 'Spor Kulüpleri ve Akademiler'),
    desc: copy('Clubs, academies and teams for every sport and every level.', 'Her spor ve her seviye için kulüpler, akademiler ve takımlar.'),
    profile: profile({
      nav: [copy('Our teams', 'Takımlarımız'), copy('The club', 'Kulüp'), copy('Join the club', 'Kulübe katılın')],
      badge: copy('All ages · all levels', 'Her yaş · her seviye'),
      title: copy('Play the sport you love, with people who love it too.', 'Sevdiğiniz sporu, onu sizin kadar seven insanlarla yapın.'),
      lead: copy('Qualified coaches, friendly teams and training that makes every session count.', 'Uzman antrenörler, samimi takımlar ve her antrenmanı değerli kılan çalışmalar.'),
      cta: copy('Book a free trial', 'Ücretsiz deneme ayırt'),
      sectionTitle: copy('Find your place in the club', 'Kulüpte yerinizi bulun'),
      sectionLead: copy('Beginners, juniors and competitive squads all train here.', 'Yeni başlayanlar, gençler ve yarışma takımları hep burada çalışır.'),
      items: [
        item('Beginners', 'Yeni başlayanlar', 'Learn the basics in a relaxed group, with all equipment provided.', 'Tüm ekipman sağlanarak, rahat bir grupta temel bilgileri öğrenin.'),
        item('Juniors', 'Gençler', 'Age-group training that builds skills and confidence.', 'Beceri ve özgüven kazandıran yaş grubu antrenmanları.'),
        item('Competitive squads', 'Yarışma takımları', 'Structured training and a full season of matches.', 'Yapılandırılmış antrenman ve dolu bir maç sezonu.'),
      ],
      storyTitle: copy('A club, not just a facility', 'Yalnızca bir tesis değil, bir kulüp'),
      story: copy('Volunteers, parents and players who have been here for decades make this place feel like home.', 'Gönüllüler, veliler ve on yıllardır burada olan oyuncular bu yeri bir ev gibi hissettiriyor.'),
      steps: [copy('Book a free trial', 'Ücretsiz deneme ayırt'), copy('Train with the team', 'Takımla çalışın'), copy('Play your first match', 'İlk maçınıza çıkın')],
      ctaTitle: copy('Your first session is free', 'İlk antrenmanınız ücretsiz'),
      ctaCopy: copy('Come along, meet the coaches and see if the club is right for you.', 'Gelin, antrenörlerle tanışın ve kulübün size uygun olup olmadığını görün.'),
      footer: copy('A community club for every age and level.', 'Her yaş ve seviye için bir topluluk kulübü.'),
      stats: [['1952', copy('Founded', 'Kuruluş')], ['650', copy('Members', 'Üye')], ['18', copy('Squads', 'Takım')]],
      quote: {
        text: copy('I joined to get fit and found a second family.', 'Forma girmek için katıldım, ikinci bir aile buldum.'),
        author: copy('Member for twelve years', 'On iki yıllık üye'),
      },
    }),
    variants: [
      starter('football-club', 'forest', 'magazine', copy('Football Club', 'Futbol Kulübü'), hero(
        'Est. 1952 · community club', "1952'de kuruldu · topluluk kulübü",
        'One badge, every generation.', 'Tek arma, her kuşak.',
        "Men's, women's and youth teams, a full fixture list and matchday news.", 'Erkek, kadın ve genç takımları, tam fikstür ve maç günü haberleri.')),
      starter('tennis-academy', 'lemon', 'service', copy('Tennis Academy', 'Tenis Akademisi'), hero(
        'Clay courts · coaching for all levels', 'Toprak kortlar · her seviyeye antrenman',
        'Better tennis, one lesson at a time.', 'Her derste biraz daha iyi tenis.',
        'Private lessons, junior programmes and social doubles on eight clay courts.', 'Sekiz toprak kortta özel dersler, genç programları ve sosyal çiftler maçları.')),
      starter('swim-school', 'ocean', 'compare', copy('Swim School', 'Yüzme Okulu'), hero(
        'Babies to adults', 'Bebeklerden yetişkinlere',
        'Confident in the water, for life.', 'Hayat boyu suda özgüven.',
        'Small classes in a warm pool, with progress badges and certified instructors.', 'Sıcak bir havuzda küçük sınıflar; ilerleme rozetleri ve sertifikalı eğitmenlerle.')),
      starter('climbing-gym', 'graphite', 'bento', copy('Climbing Gym', 'Tırmanış Salonu'), hero(
        'Bouldering · ropes · yoga', 'Bouldering · ip tırmanışı · yoga',
        'New routes every week.', 'Her hafta yeni rotalar.',
        'Bouldering and rope climbing for every level, with intro sessions and a café upstairs.', 'Her seviyeye bouldering ve ip tırmanışı; tanışma seansları ve üst katta bir kafe.')),
      starter('golf-club', 'emerald', 'showcase', copy('Golf Club', 'Golf Kulübü'), hero(
        '18 holes by the sea', 'Deniz kenarında 18 delik',
        'A round worth the early tee time.', 'Erken başlama saatine değer bir tur.',
        'A championship course, a friendly clubhouse and lessons for new golfers.', 'Şampiyona standartlarında bir saha, samimi bir kulüp binası ve yeni başlayanlar için dersler.')),
      starter('cycling-club', 'sunset', 'chronicle', copy('Cycling Club', 'Bisiklet Kulübü'), hero(
        'Weekend rides · all paces', 'Hafta sonu sürüşleri · her tempo',
        'Ride further, together.', 'Birlikte daha uzağa pedal çevirin.',
        'Group rides for every pace, a Sunday café stop and a big ride every season.', 'Her tempoya grup sürüşleri, Pazar kafe molası ve her sezon büyük bir tur.')),
      starter('surf-school', 'citrus', 'stack', copy('Surf School', 'Sörf Okulu'), hero(
        'Lessons and board hire', 'Dersler ve sörf tahtası kiralama',
        'Stand up on your first day.', 'İlk gününüzde ayağa kalkın.',
        'Beginner lessons on a sandy beach, with boards, wetsuits and patient instructors.', 'Kumsalda yeni başlayanlar için dersler; tahtalar, dalış kıyafetleri ve sabırlı eğitmenlerle.')),
      starter('basketball-academy', 'ink', 'poster', copy('Basketball Academy', 'Basketbol Akademisi'), hero(
        'Ages 8 to 18', '8-18 yaş',
        'Work hard, play smart.', 'Çok çalış, akıllı oyna.',
        'Skills training, league teams and summer camps run by former professional players.', 'Eski profesyonel oyuncuların yönettiği beceri antrenmanları, lig takımları ve yaz kampları.')),
      starter('sailing-club', 'navy', 'split', copy('Sailing Club', 'Yelken Kulübü'), hero(
        'Dinghies · keelboats · racing', 'Dingiler · omurgalı tekneler · yarışlar',
        'Learn the wind, then race it.', 'Rüzgârı öğrenin, sonra onunla yarışın.',
        'Sailing courses for beginners, club racing every Wednesday and boats to hire.', 'Yeni başlayanlar için yelken kursları, her Çarşamba kulüp yarışları ve kiralık tekneler.')),
      starter('athletics-club', 'mint', 'onepage', copy('Athletics Club', 'Atletizm Kulübü'), hero(
        'Track · road · cross-country', 'Pist · yol · kros',
        'Faster, stronger, together.', 'Birlikte daha hızlı, daha güçlü.',
        'Coached sessions on the track and the road, from a first 5K to national championships.', "İlk 5K'dan ulusal şampiyonalara, pistte ve yolda antrenör eşliğinde çalışmalar.")),
    ],
  },
  {
    id: 'public', siteCategory: 'other', icon: '🏙️', group: 'community',
    name: copy('Public Services & Cities', 'Kamu Hizmetleri ve Şehirler'),
    desc: copy('Municipalities, public services and civic information that people can find.', 'Belediyeler, kamu hizmetleri ve insanların kolayca bulabileceği resmi bilgiler.'),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('News', 'Haberler'), copy('Contact us', 'Bize ulaşın')],
      badge: copy('Official information · updated daily', 'Resmi bilgiler · her gün güncellenir'),
      title: copy('The services you need, easy to find.', 'İhtiyacınız olan hizmetler, kolayca bulunur.'),
      lead: copy('Apply, pay, report and book online, in plain language and with help when you need it.', 'Online başvurun, ödeyin, bildirin ve randevu alın; sade bir dille ve ihtiyaç duyduğunuzda destekle.'),
      cta: copy('Find a service', 'Hizmet bul'),
      sectionTitle: copy('Most requested', 'En çok aranan'),
      sectionLead: copy('The things residents look for most often, all in one place.', 'Sakinlerin en sık aradığı şeyler, hepsi tek bir yerde.'),
      items: [
        item('Apply & pay', 'Başvur ve öde', 'Permits, fees and taxes, handled online in minutes.', 'İzinler, harçlar ve vergiler; dakikalar içinde online.'),
        item('Report a problem', 'Sorun bildir', 'Potholes, broken lights or missed collections, with updates as they are fixed.', 'Yol çukurları, bozuk lambalar ya da alınmayan çöpler; giderildikçe bilgilendirme.'),
        item('Make an appointment', 'Randevu al', 'Skip the queue with a time slot at the service centre.', 'Hizmet merkezinde bir saat dilimi seçerek sırayı atlayın.'),
      ],
      storyTitle: copy('Built for everyone', 'Herkes için tasarlandı'),
      story: copy('Accessible pages, plain language and support by phone or in person for anyone who needs it.', 'Erişilebilir sayfalar, sade dil ve ihtiyacı olan herkes için telefonla ya da yüz yüze destek.'),
      steps: [copy('Find the service', 'Hizmeti bulun'), copy('Complete it online', 'Online tamamlayın'), copy('Track the progress', 'Süreci takip edin')],
      ctaTitle: copy('Cannot find what you need?', 'Aradığınızı bulamadınız mı?'),
      ctaCopy: copy('Call the service centre or visit us in person; our team is happy to help.', 'Hizmet merkezini arayın ya da bizi yüz yüze ziyaret edin; ekibimiz seve seve yardımcı olur.'),
      footer: copy('Public services and information for residents.', 'Sakinler için kamu hizmetleri ve bilgiler.'),
      stats: [['150+', copy('Online services', 'Online hizmet')], [copy('3 min', '3 dk'), copy('Average application time', 'Ortalama başvuru süresi')], ['24/7', copy('Online access', 'Online erişim')]],
      quote: {
        text: copy('I renewed my permit on the bus on the way to work.', 'İzin belgemi işe giderken otobüste yeniledim.'),
        author: copy('Resident', 'Mahalle sakini'),
      },
    }),
    variants: [
      starter('municipality', 'sky', 'directory', copy('Municipality', 'Belediye'), hero(
        'Your city, online', 'Şehriniz, online',
        'City services in a few clicks.', 'Birkaç tıkla şehir hizmetleri.',
        'Pay bills, apply for permits and follow council news, all in one place.', 'Faturaları ödeyin, izin başvurusu yapın ve meclis haberlerini takip edin; hepsi tek bir yerde.')),
      starter('city-council', 'press', 'magazine', copy('City Council', 'Belediye Meclisi'), hero(
        'Meetings open to the public', 'Toplantılar halka açık',
        'Decisions made in the open.', 'Açık bir şekilde alınan kararlar.',
        'Agendas, minutes and live streams of every council meeting, with ways to have your say.', 'Her meclis toplantısının gündemi, tutanakları ve canlı yayını; görüş bildirme yollarıyla birlikte.')),
      starter('tourism-office', 'ocean', 'showcase', copy('Tourism Office', 'Turizm Ofisi'), hero(
        'Official visitor guide', 'Resmi ziyaretçi rehberi',
        'Discover the city like a local.', 'Şehri bir yerli gibi keşfedin.',
        'Maps, events and itineraries from the people who know the city best.', 'Şehri en iyi tanıyan insanlardan haritalar, etkinlikler ve rotalar.')),
      starter('public-transport', 'citrus', 'appshell', copy('Public Transport', 'Toplu Taşıma'), hero(
        'Live times · routes · tickets', 'Canlı saatler · güzergâhlar · biletler',
        'Know when your bus is coming.', 'Otobüsünüzün ne zaman geleceğini bilin.',
        'Live departures, journey planning and mobile tickets for every line in the city.', 'Şehirdeki her hat için canlı kalkış saatleri, yolculuk planlama ve mobil biletler.')),
      starter('school-district', 'lavender', 'catalog', copy('School District', 'İlçe Eğitim Müdürlüğü'), hero(
        'Enrolment open for next year', 'Gelecek yıl için kayıtlar açık',
        'Every child, a good school nearby.', 'Her çocuğa yakınında iyi bir okul.',
        'Enrolment, school calendars and transport information for families in the district.', 'İlçedeki aileler için kayıt, okul takvimleri ve servis bilgileri.')),
      starter('election-information', 'steel', 'compare', copy('Election Information', 'Seçim Bilgilendirme'), hero(
        'Official voter guide', 'Resmi seçmen rehberi',
        'Everything you need to vote.', 'Oy kullanmak için ihtiyacınız olan her şey.',
        'Check your registration, find your polling station and see what is on the ballot.', 'Kaydınızı kontrol edin, sandık yerinizi bulun ve oy pusulasında neler olduğunu görün.')),
      starter('city-park', 'forest', 'lookbook', copy('City Park', 'Kent Parkı'), hero(
        'Open dawn to dusk', 'Şafaktan gün batımına açık',
        'Green space for the whole city.', 'Bütün şehir için yeşil alan.',
        'Trails, playgrounds, a lake and free events every weekend of the summer.', 'Yürüyüş yolları, oyun alanları, bir göl ve yaz boyunca her hafta sonu ücretsiz etkinlikler.')),
      starter('citizen-services', 'indigo', 'service', copy('Citizen Service Centre', 'Vatandaş Hizmet Merkezi'), hero(
        'One desk for every request', 'Her talep için tek masa',
        'One place for every question.', 'Her soru için tek bir yer.',
        'Book an appointment, ask a question or get help with any public service.', 'Randevu alın, soru sorun ya da herhangi bir kamu hizmetiyle ilgili yardım alın.')),
      starter('emergency-information', 'sunset', 'solo', copy('Emergency Information', 'Acil Durum Bilgilendirme'), hero(
        'Alerts and preparedness', 'Uyarılar ve hazırlık',
        'Be ready before it happens.', 'Olmadan önce hazır olun.',
        'Sign up for alerts, make a family plan and find your nearest assembly point.', 'Uyarılara kaydolun, bir aile planı yapın ve size en yakın toplanma alanını bulun.')),
      starter('public-library', 'paper', 'letter', copy('Public Library', 'Halk Kütüphanesi'), hero(
        'Free for every resident', 'Her sakin için ücretsiz',
        'Borrow a book, stay for the afternoon.', 'Bir kitap ödünç alın, öğleden sonra boyunca kalın.',
        'Books, study spaces, free Wi-Fi and events for every age, in every neighbourhood.', 'Her mahallede kitaplar, çalışma alanları, ücretsiz internet ve her yaşa etkinlikler.')),
    ],
  },
]
