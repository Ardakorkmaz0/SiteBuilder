// People who make and build things: industry, energy, architecture, crafts and
// fashion.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const MAKE_SEEDS = [
  {
    id: 'industry', siteCategory: 'business', icon: '🏭', group: 'industry',
    name: copy('Manufacturing & Industry', 'Üretim ve Sanayi'),
    desc: copy('Factories, engineering firms and suppliers that make and move physical things.', 'Fiziksel ürünler üreten ve tedarik eden fabrikalar, mühendislik firmaları ve tedarikçiler.'),
    profile: profile({
      nav: [copy('Capabilities', 'Yetkinlikler'), copy('Quality', 'Kalite'), copy('Request a quote', 'Teklif iste')],
      badge: copy('ISO 9001 · made to specification', 'ISO 9001 · şartnameye uygun üretim'),
      title: copy('Precision parts, delivered on schedule.', 'Hassas parçalar, planlandığı zamanda teslim.'),
      lead: copy('Engineering support from drawing to delivery, with the capacity to scale when your orders do.', 'Çizimden teslimata mühendislik desteği ve siparişleriniz büyüdüğünde ölçeklenebilen kapasite.'),
      cta: copy('Request a quote', 'Teklif iste'),
      sectionTitle: copy('What we can make for you', 'Sizin için neler üretebiliriz'),
      sectionLead: copy('Prototypes, short runs and long production contracts, all under one roof.', 'Prototipler, kısa seri üretimler ve uzun vadeli üretim sözleşmeleri, hepsi tek çatı altında.'),
      items: [
        item('Engineering & prototyping', 'Mühendislik ve prototipleme', 'Design for manufacture, samples and test runs before you commit.', 'Karar vermeden önce üretime uygun tasarım, numuneler ve deneme üretimleri.'),
        item('Series production', 'Seri üretim', 'Stable quality across thousands of parts, with full traceability.', 'Binlerce parçada tam izlenebilirlikle istikrarlı kalite.'),
        item('Finishing & assembly', 'Yüzey işlem ve montaj', 'Coating, assembly and packing, ready for your line or your customer.', 'Kaplama, montaj ve paketleme; hattınıza ya da müşterinize hazır.'),
      ],
      storyTitle: copy('Quality you can audit', 'Denetleyebileceğiniz kalite'),
      story: copy('Every batch is measured, recorded and traceable to the raw material. Our clients visit the floor whenever they like.', 'Her parti ölçülür, kayıt altına alınır ve ham maddeye kadar izlenebilir. Müşterilerimiz üretim alanını istedikleri zaman ziyaret eder.'),
      steps: [copy('Send your drawings', 'Çizimlerinizi gönderin'), copy('Approve a sample', 'Numuneyi onaylayın'), copy('Scale production', 'Üretimi ölçeklendirin')],
      ctaTitle: copy('Have a drawing ready?', 'Hazır bir çiziminiz var mı?'),
      ctaCopy: copy('Send the files and quantities, and our engineers will reply with a quote and lead time within three days.', 'Dosyaları ve adetleri gönderin; mühendislerimiz üç gün içinde teklif ve termin süresiyle dönsün.'),
      footer: copy('Engineering and manufacturing you can rely on.', 'Güvenebileceğiniz mühendislik ve üretim.'),
      stats: [[copy('12,000 m²', '12.000 m²'), copy('Production floor', 'Üretim alanı')], ['35', copy('Countries we export to', 'İhracat yapılan ülke')], [copy('0.02 mm', '0,02 mm'), copy('Typical tolerance', 'Tipik tolerans')]],
      quote: {
        text: copy('Their first sample passed our inspection, which almost never happens.', 'İlk numuneleri kontrolümüzden geçti; bu neredeyse hiç olmaz.'),
        author: copy('Procurement lead, automotive supplier', 'Satın alma sorumlusu, otomotiv tedarikçisi'),
      },
    }),
    variants: [
      starter('contract-manufacturer', 'steel', 'catalog', copy('Contract Manufacturer', 'Fason Üretici'), hero(
        'Your product, made at scale', 'Ürününüz, ölçekli üretimle',
        'We make it. You sell it.', 'Biz üretelim, siz satın.',
        'Contract manufacturing with engineering, sourcing and quality control handled for you.', 'Mühendislik, tedarik ve kalite kontrolün sizin yerinize yürütüldüğü fason üretim.')),
      starter('engineering-firm', 'navy', 'service', copy('Engineering Firm', 'Mühendislik Firması'), hero(
        'Mechanical · electrical · structural', 'Makine · elektrik · yapı',
        'Engineering that holds up in the real world.', 'Gerçek dünyada ayakta kalan mühendislik.',
        'Design, calculations and site support for industrial projects of every size.', 'Her ölçekte endüstriyel proje için tasarım, hesaplama ve saha desteği.')),
      starter('cnc-workshop', 'graphite', 'directory', copy('CNC Workshop', 'CNC Atölyesi'), hero(
        '5-axis machining · short runs', '5 eksen işleme · kısa seriler',
        'Parts cut to a fraction of a hair.', 'Bir saç telinin kesri hassasiyetinde işlenen parçalar.',
        'Milling, turning and finishing in aluminium, steel and engineering plastics.', 'Alüminyum, çelik ve mühendislik plastiklerinde frezeleme, tornalama ve yüzey işlemleri.')),
      starter('packaging-maker', 'citrus', 'bento', copy('Packaging Maker', 'Ambalaj Üreticisi'), hero(
        'Custom boxes from 500 units', '500 adetten başlayan özel kutular',
        'Packaging people keep after unboxing.', 'Kutuyu açtıktan sonra bile saklanan ambalajlar.',
        'Printed boxes, mailers and inserts made from recycled board.', 'Geri dönüştürülmüş kartondan baskılı kutular, gönderi kutuları ve iç ambalajlar.')),
      starter('textile-mill', 'sand', 'lookbook', copy('Textile Mill', 'Tekstil Fabrikası'), hero(
        'Weaving since 1964', "1964'ten beri dokuma",
        'Fabrics with a hand you can feel.', 'Dokunduğunuzda hissedeceğiniz kumaşlar.',
        'Cotton, linen and blends woven in-house for fashion and interior brands.', 'Moda ve iç mekân markaları için kendi tesisimizde dokunan pamuklu, keten ve karışım kumaşlar.')),
      starter('electronics-assembly', 'teal', 'appshell', copy('Electronics Assembly', 'Elektronik Montaj'), hero(
        'PCB assembly and testing', 'Baskılı devre montajı ve testi',
        'Boards built, tested and ready to ship.', 'Kartlar dizildi, test edildi, gönderime hazır.',
        'SMT assembly, functional testing and box builds for hardware teams.', 'Donanım ekipleri için SMT dizgi, fonksiyonel test ve kutu montajı.')),
      starter('steel-works', 'ink', 'poster', copy('Steel Works', 'Çelik Konstrüksiyon'), hero(
        'Structural steel · fabrication', 'Yapısal çelik · imalat',
        'Steel frames for buildings that last.', 'Uzun ömürlü binalar için çelik iskeletler.',
        'Fabrication and erection of structural steel for industrial and commercial projects.', 'Endüstriyel ve ticari projeler için yapısal çelik imalatı ve montajı.')),
      starter('industrial-supply', 'sky', 'compare', copy('Industrial Supply', 'Endüstriyel Tedarik'), hero(
        'Next-day delivery on 20,000 items', '20.000 üründe ertesi gün teslimat',
        'The parts you need, before the line stops.', 'Hat durmadan önce ihtiyacınız olan parçalar.',
        'Bearings, fasteners, tools and safety gear with trade pricing and account support.', 'Rulmanlar, bağlantı elemanları, takımlar ve iş güvenliği ürünleri; bayi fiyatları ve hesap desteğiyle.')),
      starter('3d-printing', 'lavender', 'stack', copy('3D Printing Bureau', '3B Baskı Merkezi'), hero(
        'Upload today, parts on Friday', 'Bugün yükleyin, parçalar Cuma günü sizde',
        'From file to finished part in days.', 'Dosyadan bitmiş parçaya birkaç günde.',
        'Industrial 3D printing in nylon, resin and metal for prototypes and small series.', 'Prototipler ve küçük seriler için naylon, reçine ve metalde endüstriyel 3B baskı.')),
      starter('factory-automation', 'slate', 'split', copy('Factory Automation', 'Fabrika Otomasyonu'), hero(
        'Robotics · PLC · vision systems', 'Robotik · PLC · görüntü işleme',
        'Automate the repetitive, keep people on the important.', 'Tekrarlayan işleri otomatiğe bağlayın, insanları önemli işlere ayırın.',
        'Robot cells and control systems designed around your line, with training for your team.', 'Hattınıza göre tasarlanan robot hücreleri ve kontrol sistemleri; ekibinize eğitimle birlikte.')),
    ],
  },
  {
    id: 'energy', siteCategory: 'business', icon: '☀️', group: 'industry',
    name: copy('Energy & Environment', 'Enerji ve Çevre'),
    desc: copy('Solar, clean energy, recycling and environmental services.', 'Güneş enerjisi, temiz enerji, geri dönüşüm ve çevre hizmetleri.'),
    profile: profile({
      nav: [copy('Solutions', 'Çözümler'), copy('Impact', 'Etki'), copy('Get an assessment', 'Değerlendirme iste')],
      badge: copy('Cleaner energy · lower bills', 'Daha temiz enerji · daha düşük faturalar'),
      title: copy('Energy that is better for your bills and the planet.', 'Hem faturalarınız hem gezegen için daha iyi enerji.'),
      lead: copy('Practical steps to use less, generate your own and measure the difference month by month.', 'Daha az tüketmek, kendi enerjinizi üretmek ve farkı ay ay ölçmek için pratik adımlar.'),
      cta: copy('Get a free assessment', 'Ücretsiz değerlendirme alın'),
      sectionTitle: copy('Where we can help', 'Nerede yardımcı olabiliriz'),
      sectionLead: copy('Start with an honest assessment and invest only where the numbers make sense.', 'Dürüst bir değerlendirmeyle başlayın, yalnızca rakamların anlamlı olduğu yerlere yatırım yapın.'),
      items: [
        item('Generate', 'Üretin', 'Solar panels, batteries and heat pumps sized to your real usage.', 'Gerçek tüketiminize göre boyutlandırılmış güneş panelleri, bataryalar ve ısı pompaları.'),
        item('Save', 'Tasarruf edin', 'Insulation, efficient equipment and smarter controls.', 'Yalıtım, verimli ekipman ve daha akıllı kontroller.'),
        item('Report', 'Raporlayın', 'Clear numbers for your team, investors and sustainability reports.', 'Ekibiniz, yatırımcılarınız ve sürdürülebilirlik raporlarınız için net rakamlar.'),
      ],
      storyTitle: copy('Numbers first, then panels', 'Önce rakamlar, sonra paneller'),
      story: copy('We model your consumption before we recommend anything, and we show the payback period in writing.', 'Bir şey önermeden önce tüketiminizi modelliyor ve geri ödeme süresini yazılı olarak gösteriyoruz.'),
      steps: [copy('Share a year of bills', 'Bir yıllık faturalarınızı paylaşın'), copy('Review the proposal', 'Öneriyi inceleyin'), copy('Watch the savings', 'Tasarrufu izleyin')],
      ctaTitle: copy('See what you could save', 'Ne kadar tasarruf edebileceğinizi görün'),
      ctaCopy: copy('Send us your recent bills and we will prepare a free, no-pressure assessment.', 'Son faturalarınızı gönderin; ücretsiz ve baskısız bir değerlendirme hazırlayalım.'),
      footer: copy('Clean energy and efficiency, measured honestly.', 'Dürüstçe ölçülen temiz enerji ve verimlilik.'),
      stats: [[copy('1,200', '1.200'), copy('Installations', 'Kurulum')], [copy('38%', '%38'), copy('Average bill reduction', 'Ortalama fatura düşüşü')], [copy('6 yrs', '6 yıl'), copy('Typical payback', 'Tipik geri ödeme süresi')]],
      quote: {
        text: copy('The system paid for itself a year earlier than they promised.', 'Sistem, söz verdiklerinden bir yıl önce kendini amorti etti.'),
        author: copy('Owner of a family hotel', 'Aile oteli sahibi'),
      },
    }),
    variants: [
      starter('solar-installer', 'sunset', 'catalog', copy('Solar Installer', 'Güneş Paneli Kurulumu'), hero(
        'Rooftop solar · battery storage', 'Çatı GES · batarya depolama',
        'Turn your roof into a power plant.', 'Çatınızı bir enerji santraline dönüştürün.',
        'Panels and batteries designed, installed and monitored by one local team.', 'Tek bir yerel ekip tarafından tasarlanan, kurulan ve izlenen paneller ve bataryalar.')),
      starter('wind-energy', 'arctic', 'showcase', copy('Wind Energy', 'Rüzgâr Enerjisi'), hero(
        'Utility-scale wind projects', 'Büyük ölçekli rüzgâr projeleri',
        'Clean power, harvested from the coastline.', 'Kıyı şeridinden toplanan temiz enerji.',
        'Development, construction and operation of wind farms, with local communities at the table.', 'Yerel toplulukların da söz sahibi olduğu rüzgâr santrallerinin geliştirilmesi, inşası ve işletilmesi.')),
      starter('ev-charging', 'mint', 'appshell', copy('EV Charging', 'Elektrikli Araç Şarjı'), hero(
        'Chargers for homes and car parks', 'Evler ve otoparklar için şarj üniteleri',
        'Charge where you park.', 'Park ettiğiniz yerde şarj edin.',
        'Smart chargers, installation and a dashboard to manage costs across every site.', 'Akıllı şarj üniteleri, kurulum ve tüm lokasyonlarda maliyetleri yönetmek için bir panel.')),
      starter('recycling-centre', 'forest', 'directory', copy('Recycling Centre', 'Geri Dönüşüm Merkezi'), hero(
        'Collection for homes and businesses', 'Evler ve işletmeler için toplama',
        'Less landfill, more second lives.', 'Daha az çöp, daha çok ikinci hayat.',
        'Sorted collection, clear rules on what goes where and monthly recycling reports.', 'Ayrıştırılmış toplama, neyin nereye gittiğine dair net kurallar ve aylık geri dönüşüm raporları.')),
      starter('environmental-consultancy', 'olive', 'editorial', copy('Environmental Consultancy', 'Çevre Danışmanlığı'), hero(
        'Impact assessments · permits', 'Etki değerlendirmeleri · izinler',
        'Build responsibly, with the evidence to show it.', 'Sorumlu inşa edin, kanıtıyla birlikte.',
        'Environmental studies, permits and monitoring for developers and public bodies.', 'Geliştiriciler ve kamu kurumları için çevre çalışmaları, izinler ve izleme.')),
      starter('water-technology', 'ocean', 'stack', copy('Water Technology', 'Su Teknolojileri'), hero(
        'Filtration · reuse · leak detection', 'Filtrasyon · geri kazanım · kaçak tespiti',
        'Every drop, measured and put to work.', 'Her damla ölçülür ve işe yarar.',
        'Treatment and reuse systems that cut water use for factories, hotels and farms.', 'Fabrikalar, oteller ve çiftlikler için su tüketimini azaltan arıtma ve geri kazanım sistemleri.')),
      starter('energy-audit', 'lemon', 'compare', copy('Energy Audit', 'Enerji Etüdü'), hero(
        'Certified energy assessors', 'Sertifikalı enerji uzmanları',
        'Find out where your energy is really going.', 'Enerjinizin gerçekte nereye gittiğini öğrenin.',
        'A site visit, thermal imaging and a report that ranks every saving by payback.', 'Saha ziyareti, termal görüntüleme ve her tasarrufu geri ödeme süresine göre sıralayan bir rapor.')),
      starter('green-building', 'paper', 'letter', copy('Green Building Advisors', 'Yeşil Bina Danışmanlığı'), hero(
        'LEED and BREEAM projects', 'LEED ve BREEAM projeleri',
        'Buildings that use less and feel better.', 'Daha az tüketen, daha iyi hissettiren binalar.',
        'Design advice and certification support for healthier, lower-energy buildings.', 'Daha sağlıklı ve düşük enerjili binalar için tasarım danışmanlığı ve sertifikasyon desteği.')),
      starter('carbon-programme', 'emerald', 'chronicle', copy('Carbon Reduction Programme', 'Karbon Azaltım Programı'), hero(
        'Measure · reduce · report', 'Ölç · azalt · raporla',
        'A credible path to net zero.', 'Net sıfıra giden inandırıcı bir yol.',
        'We measure your footprint, set realistic targets and help your team hit them year by year.', 'Ayak izinizi ölçer, gerçekçi hedefler koyar ve ekibinizin bunlara yıl yıl ulaşmasına yardım ederiz.')),
      starter('battery-storage', 'neon', 'bento', copy('Battery Storage', 'Enerji Depolama'), hero(
        'Store the sun for the evening', 'Güneşi akşam için saklayın',
        'Keep the lights on when the grid does not.', 'Şebeke kesildiğinde bile ışıklar yanık kalsın.',
        'Home and commercial batteries that store cheap energy and switch over in milliseconds.', 'Ucuz enerjiyi depolayan ve milisaniyeler içinde devreye giren ev ve iş yeri bataryaları.')),
    ],
  },
  {
    id: 'architecture', siteCategory: 'portfolio', icon: '📐', group: 'creative',
    name: copy('Architecture & Interiors', 'Mimarlık ve İç Mimari'),
    desc: copy('Architects, interior designers and studios who shape spaces.', 'Mekânlara biçim veren mimarlar, iç mimarlar ve stüdyolar.'),
    profile: profile({
      nav: [copy('Projects', 'Projeler'), copy('Studio', 'Stüdyo'), copy('Start a project', 'Projeyi başlat')],
      badge: copy('Architecture · interiors · landscape', 'Mimarlık · iç mimari · peyzaj'),
      title: copy('Spaces shaped around the people who use them.', 'Onları kullanan insanlara göre biçimlenen mekânlar.'),
      lead: copy('Thoughtful buildings and interiors, from the first sketch to the last door handle.', 'İlk eskizden son kapı koluna kadar özenle düşünülmüş binalar ve iç mekânlar.'),
      cta: copy('Start a project', 'Projeyi başlat'),
      sectionTitle: copy('Selected projects', 'Seçili projeler'),
      sectionLead: copy('Homes, workplaces and public spaces, each designed for its site and its people.', 'Her biri kendi arsası ve insanları için tasarlanmış evler, çalışma alanları ve kamusal mekânlar.'),
      items: [
        item('Residential', 'Konut', 'New homes and careful renovations that make the most of light and space.', 'Işığı ve alanı en iyi şekilde kullanan yeni evler ve özenli renovasyonlar.'),
        item('Workplace', 'Çalışma alanı', 'Offices and studios that help teams focus, meet and rest.', 'Ekiplerin odaklanmasına, buluşmasına ve dinlenmesine yardım eden ofisler ve stüdyolar.'),
        item('Hospitality', 'Konaklama ve ağırlama', 'Hotels, restaurants and shops with a strong sense of place.', 'Güçlü bir yer duygusu taşıyan oteller, restoranlar ve mağazalar.'),
      ],
      storyTitle: copy('Design that starts with listening', 'Dinlemekle başlayan tasarım'),
      story: copy('We spend time on site and with you before we draw a line, and we stay involved until the building is finished.', 'Tek bir çizgi çizmeden önce sahada ve sizinle vakit geçirir, bina bitene kadar sürecin içinde kalırız.'),
      steps: [copy('Brief and site visit', 'Brif ve saha ziyareti'), copy('Concept and design', 'Konsept ve tasarım'), copy('Build with confidence', 'Güvenle inşa edin')],
      ctaTitle: copy('Tell us about your space', 'Bize mekânınızı anlatın'),
      ctaCopy: copy('Share a few photos, the address and what you hope to change, and we will arrange a first visit.', 'Birkaç fotoğraf, adres ve neyi değiştirmek istediğinizi paylaşın; ilk ziyareti planlayalım.'),
      footer: copy('Architecture and interiors with care for detail.', 'Ayrıntıya özen gösteren mimarlık ve iç mimari.'),
      stats: [['140', copy('Completed projects', 'Tamamlanan proje')], ['18', copy('Design awards', 'Tasarım ödülü')], ['11', copy('Architects and designers', 'Mimar ve tasarımcı')]],
      quote: {
        text: copy('They understood how we live before they showed us a single drawing.', 'Tek bir çizim göstermeden önce nasıl yaşadığımızı anladılar.'),
        author: copy('Clients, family house renovation', 'Müşteri, müstakil ev renovasyonu'),
      },
    }),
    variants: [
      starter('architecture-office', 'mono', 'lookbook', copy('Architecture Office', 'Mimarlık Ofisi'), hero(
        'Buildings for living and working', 'Yaşamak ve çalışmak için binalar',
        'Calm buildings with a clear idea.', 'Net bir fikre sahip sakin binalar.',
        'Residential and public architecture, carefully detailed and built to age well.', 'Özenle detaylandırılmış, iyi yaşlanmak üzere inşa edilen konut ve kamu mimarisi.')),
      starter('interior-designer', 'rose', 'editorial', copy('Interior Designer', 'İç Mimar'), hero(
        'Homes · boutiques · hotels', 'Evler · butikler · oteller',
        'Rooms that feel like they were always this way.', 'Hep böyleymiş gibi hissettiren odalar.',
        'Interiors with warm materials, good light and furniture that earns its place.', 'Sıcak malzemeler, iyi ışık ve yerini hak eden mobilyalarla iç mekânlar.')),
      starter('landscape-architect', 'forest', 'showcase', copy('Landscape Architect', 'Peyzaj Mimarı'), hero(
        'Gardens · parks · public space', 'Bahçeler · parklar · kamusal alanlar',
        'Outdoor spaces that grow better every year.', 'Her yıl daha da güzelleşen dış mekânlar.',
        'Private gardens and public landscapes designed around native plants and real use.', 'Yerli bitkiler ve gerçek kullanım etrafında tasarlanan özel bahçeler ve kamusal peyzajlar.')),
      starter('furniture-maker', 'cocoa', 'catalog', copy('Furniture Maker', 'Mobilya Atölyesi'), hero(
        'Solid wood · made to order', 'Masif ahşap · siparişe özel',
        'Furniture built to be handed down.', 'Kuşaktan kuşağa aktarılmak üzere yapılan mobilyalar.',
        'Tables, chairs and cabinets made in our workshop from responsibly sourced timber.', 'Sorumlu kaynaklardan gelen keresteyle atölyemizde yapılan masalar, sandalyeler ve dolaplar.')),
      starter('lighting-design', 'ink', 'poster', copy('Lighting Design', 'Aydınlatma Tasarımı'), hero(
        'Architectural lighting studio', 'Mimari aydınlatma stüdyosu',
        'Light is the first material.', 'Işık, ilk malzemedir.',
        'Lighting concepts for homes, museums and hotels that change how a space feels at night.', 'Evler, müzeler ve oteller için bir mekânın gece nasıl hissettirdiğini değiştiren aydınlatma kurguları.')),
      starter('kitchen-studio', 'sand', 'compare', copy('Kitchen Studio', 'Mutfak Stüdyosu'), hero(
        'Design · build · install', 'Tasarım · üretim · montaj',
        'The kitchen you will cook in every day.', 'Her gün yemek yapacağınız mutfak.',
        'Bespoke kitchens planned around how you cook, installed by our own fitters.', 'Nasıl yemek yaptığınıza göre planlanan, kendi ustalarımızca monte edilen özel mutfaklar.')),
      starter('home-staging', 'lavender', 'stack', copy('Home Staging', 'Ev Sahneleme'), hero(
        'Sell faster, for more', 'Daha hızlı ve daha iyi fiyata satın',
        'Help buyers picture themselves at home.', 'Alıcıların kendilerini o evde hayal etmesine yardım edin.',
        'Furniture, styling and photography that make a listing stand out in a busy market.', 'Kalabalık bir piyasada ilanı öne çıkaran mobilya, stil ve fotoğraf.')),
      starter('urban-planning', 'paper', 'magazine', copy('Urban Planning', 'Şehir Planlama'), hero(
        'Masterplans · public engagement', 'Nazım planlar · katılımcı süreçler',
        'Neighbourhoods designed with the people who live there.', 'Orada yaşayan insanlarla birlikte tasarlanan mahalleler.',
        'Masterplanning, transport studies and consultation for cities and developers.', 'Şehirler ve geliştiriciler için nazım planlama, ulaşım çalışmaları ve istişare süreçleri.')),
      starter('design-build', 'steel', 'chronicle', copy('Design & Build', 'Tasarla ve İnşa Et'), hero(
        'One contract · one team', 'Tek sözleşme · tek ekip',
        'From drawings to keys, with one team accountable.', 'Çizimden anahtar teslimine, sorumluluğu tek ekipte.',
        'Architects and builders working together, so the budget and design stay in step.', 'Bütçe ve tasarımın uyum içinde kalması için birlikte çalışan mimarlar ve ustalar.')),
      starter('design-showroom', 'plum', 'sidebar', copy('Design Showroom', 'Tasarım Showroomu'), hero(
        'Furniture · lighting · textiles', 'Mobilya · aydınlatma · tekstil',
        'Pieces from the studios we admire.', 'Hayran olduğumuz stüdyolardan parçalar.',
        'A curated showroom of contemporary design, with advice for architects and homeowners.', 'Mimarlar ve ev sahipleri için danışmanlıkla birlikte seçkin bir çağdaş tasarım showroomu.')),
    ],
  },
  {
    id: 'makers', siteCategory: 'shop', icon: '🏺', group: 'shops',
    name: copy('Makers & Crafts', 'Zanaat ve El Yapımı'),
    desc: copy('Potters, woodworkers, jewellers and makers who sell and teach their craft.', 'Zanaatını satan ve öğreten çömlekçiler, ahşap ustaları, kuyumcular ve üreticiler.'),
    profile: profile({
      nav: [copy('Shop', 'Mağaza'), copy('The workshop', 'Atölye'), copy('Classes', 'Dersler')],
      badge: copy('Handmade · one of a kind', 'El yapımı · tek ve eşsiz'),
      title: copy('Made by hand, one piece at a time.', 'Elde, her seferinde tek bir parça olarak yapıldı.'),
      lead: copy('Objects with the marks of the hands that made them, and classes where you can make your own.', 'Onu yapan ellerin izini taşıyan objeler ve kendinizinkini yapabileceğiniz dersler.'),
      cta: copy('Visit the shop', 'Mağazayı ziyaret edin'),
      sectionTitle: copy('From the workbench', 'Tezgâhtan'),
      sectionLead: copy('Small batches and single pieces, listed as they come out of the workshop.', 'Atölyeden çıktıkça listelenen küçük seriler ve tek parçalar.'),
      items: [
        item('One-off pieces', 'Tek parçalar', 'Made once and never exactly repeated.', 'Bir kez yapılan ve asla birebir tekrarlanmayan.'),
        item('Commissions', 'Özel siparişler', 'A piece designed with you, for a person or a place you have in mind.', 'Aklınızdaki bir kişi ya da yer için sizinle birlikte tasarlanan bir parça.'),
        item('Workshops', 'Atölyeler', 'Small classes where you leave with something you made yourself.', 'Kendi yaptığınız bir şeyle ayrıldığınız küçük dersler.'),
      ],
      storyTitle: copy('Slow work, honest materials', 'Yavaş iş, dürüst malzemeler'),
      story: copy('We work with local materials, traditional techniques and a lot of patience. Each piece is signed and dated.', 'Yerel malzemeler, geleneksel teknikler ve bolca sabırla çalışırız. Her parça imzalanır ve tarihlenir.'),
      steps: [copy('Browse the latest pieces', 'En yeni parçalara göz atın'), copy('Order or commission', 'Sipariş verin ya da özel yaptırın'), copy('Receive it carefully packed', 'Özenle paketlenmiş olarak teslim alın')],
      ctaTitle: copy('Want to make one yourself?', 'Kendiniz yapmak ister misiniz?'),
      ctaCopy: copy('Beginner workshops run every month. All materials and tea are included.', 'Başlangıç atölyeleri her ay yapılıyor. Tüm malzemeler ve çay dahil.'),
      footer: copy('Handmade objects and craft classes.', 'El yapımı objeler ve zanaat dersleri.'),
      stats: [['1', copy('Maker per piece', 'Parça başına usta')], ['40+', copy('Workshops a year', 'Yıllık atölye')], [copy('100%', '%100'), copy('Made by hand', 'El yapımı')]],
      quote: {
        text: copy('Every time I use this bowl, I think about the person who made it.', 'Bu kâseyi her kullandığımda onu yapan kişiyi düşünüyorum.'),
        author: copy('Customer in Izmir', "İzmir'den bir müşteri"),
      },
    }),
    variants: [
      starter('pottery-studio', 'terra', 'lookbook', copy('Pottery Studio', 'Seramik Atölyesi'), hero(
        'Stoneware · wheel-thrown', 'Taşçini · çarkta şekillendirilmiş',
        'Everyday ceramics for slow mornings.', 'Yavaş sabahlar için gündelik seramikler.',
        'Mugs, bowls and plates thrown on the wheel and glazed in small batches.', 'Çarkta şekillendirilip küçük partiler hâlinde sırlanan kupalar, kâseler ve tabaklar.')),
      starter('woodworker', 'olive', 'catalog', copy('Woodworker', 'Ahşap Ustası'), hero(
        'Hand tools · local timber', 'El aletleri · yerel kereste',
        'Wood that has been listened to.', 'Dinlenerek işlenmiş ahşap.',
        'Boards, spoons and small furniture shaped from walnut and olive wood.', 'Ceviz ve zeytin ağacından şekillendirilen kesme tahtaları, kaşıklar ve küçük mobilyalar.')),
      starter('leather-goods', 'cocoa', 'split', copy('Leather Goods', 'Deri Atölyesi'), hero(
        'Hand-stitched · vegetable tanned', 'Elde dikilmiş · bitkisel tabaklanmış',
        'Bags and wallets that get better with age.', 'Yaşlandıkça güzelleşen çantalar ve cüzdanlar.',
        'Every seam stitched by hand, from leather that softens and darkens as you use it.', 'Her dikişi elde atılmış, kullandıkça yumuşayıp koyulaşan derilerden.')),
      starter('candle-maker', 'sand', 'bento', copy('Candle Maker', 'Mum Atölyesi'), hero(
        'Soy wax · hand poured', 'Soya mumu · elle dökülmüş',
        'Candles that smell like somewhere you have been.', 'Bir zamanlar bulunduğunuz bir yer gibi kokan mumlar.',
        'Small-batch candles and room sprays inspired by gardens, kitchens and seaside towns.', 'Bahçelerden, mutfaklardan ve sahil kasabalarından ilham alan küçük parti mumlar ve oda spreyleri.')),
      starter('knit-shop', 'rose', 'stack', copy('Knit Shop', 'Örgü Dükkânı'), hero(
        'Yarn · patterns · knit nights', 'İp · desenler · örgü geceleri',
        'Everything you need for your next project.', 'Bir sonraki projeniz için ihtiyacınız olan her şey.',
        'Natural yarns, friendly patterns and a Thursday knit night where everyone is welcome.', 'Doğal ipler, kolay desenler ve herkesin davetli olduğu Perşembe örgü geceleri.')),
      starter('bookbinder', 'paper', 'letter', copy('Bookbinder', 'Cilt Atölyesi'), hero(
        'Notebooks · repairs · restoration', 'Defterler · onarım · restorasyon',
        'Books made to be opened a thousand times.', 'Bin kez açılmak üzere yapılmış kitaplar.',
        'Hand-bound notebooks, wedding albums and careful repairs for books you love.', 'Elde ciltlenmiş defterler, düğün albümleri ve sevdiğiniz kitaplar için özenli onarımlar.')),
      starter('blacksmith', 'graphite', 'poster', copy('Blacksmith', 'Demirci'), hero(
        'Forged by hand', 'Elde dövülmüş',
        'Hot iron, hard work, honest tools.', 'Kızgın demir, sıkı çalışma, dürüst aletler.',
        'Knives, hooks and garden tools forged in a coal fire, plus weekend forging classes.', 'Kömür ateşinde dövülen bıçaklar, askılar ve bahçe aletleri; hafta sonu demircilik dersleriyle.')),
      starter('glass-studio', 'teal', 'showcase', copy('Glass Studio', 'Cam Atölyesi'), hero(
        'Blown glass · live demonstrations', 'Üflemeli cam · canlı gösteriler',
        'Shaped by breath and fire.', 'Nefes ve ateşle biçimlenen.',
        'Vases, glasses and lighting blown in our furnace, with demonstrations every Saturday.', 'Fırınımızda üflenen vazolar, bardaklar ve aydınlatmalar; her Cumartesi canlı gösteriler.')),
      starter('textile-artist', 'lavender', 'editorial', copy('Textile Artist', 'Tekstil Sanatçısı'), hero(
        'Weaving · natural dyes', 'Dokuma · doğal boyalar',
        'Colour taken from plants and woven by hand.', 'Bitkilerden alınan ve elde dokunan renkler.',
        'Wall hangings, throws and scarves dyed with madder, indigo and walnut.', 'Kökboya, çivit ve cevizle boyanmış duvar dokumaları, örtüler ve şallar.')),
      starter('jewellery-maker', 'noir', 'sidebar', copy('Jewellery Maker', 'Takı Tasarımcısı'), hero(
        'Recycled silver and gold', 'Geri dönüştürülmüş gümüş ve altın',
        'Small things to wear every day.', 'Her gün takmak için küçük şeyler.',
        'Rings, earrings and pendants made by hand in recycled precious metals.', 'Geri dönüştürülmüş değerli metallerden elde yapılan yüzükler, küpeler ve kolyeler.')),
    ],
  },
  {
    id: 'fashion', siteCategory: 'shop', icon: '👗', group: 'shops',
    name: copy('Fashion & Retail', 'Moda ve Perakende'),
    desc: copy('Boutiques, labels and stores with a clear point of view.', 'Net bir bakış açısına sahip butikler, markalar ve mağazalar.'),
    profile: profile({
      nav: [copy('New in', 'Yeni gelenler'), copy('Our story', 'Hikâyemiz'), copy('Shop now', 'Şimdi alışveriş yap')],
      badge: copy('New season · free returns', 'Yeni sezon · ücretsiz iade'),
      title: copy('Clothes you will reach for again and again.', 'Tekrar tekrar uzanacağınız kıyafetler.'),
      lead: copy('Considered pieces, honest fabrics and a fit guide that actually helps.', 'Düşünülmüş parçalar, dürüst kumaşlar ve gerçekten işe yarayan bir beden rehberi.'),
      cta: copy('Shop the collection', 'Koleksiyonu keşfet'),
      sectionTitle: copy('This season', 'Bu sezon'),
      sectionLead: copy('A small, edited collection that works together and lasts beyond the season.', 'Birbiriyle uyumlu ve sezonun ötesinde kullanılan küçük, özenle seçilmiş bir koleksiyon.'),
      items: [
        item('Everyday essentials', 'Günlük temel parçalar', 'The pieces you will wear most, made to survive a lot of washing.', 'En çok giyeceğiniz, çok yıkamaya dayanacak şekilde üretilmiş parçalar.'),
        item('Statement pieces', 'Dikkat çeken parçalar', 'A few bolder things for the days you want to be noticed.', 'Fark edilmek istediğiniz günler için birkaç cesur parça.'),
        item('Accessories', 'Aksesuarlar', 'Bags, belts and small things that finish an outfit.', 'Bir kombini tamamlayan çantalar, kemerler ve küçük şeyler.'),
      ],
      storyTitle: copy('Fewer, better things', 'Daha az ama daha iyi'),
      story: copy('We make small runs in family-owned workshops and publish where every piece is made.', 'Aile işletmesi atölyelerde küçük seriler üretir ve her parçanın nerede yapıldığını yayımlarız.'),
      steps: [copy('Find your size', 'Bedeninizi bulun'), copy('Free delivery over €80', '€80 üzeri ücretsiz kargo'), copy('Easy 30-day returns', '30 gün içinde kolay iade')],
      ctaTitle: copy('Join the list for early access', 'Erken erişim için listeye katılın'),
      ctaCopy: copy('New drops, restocks and the occasional sample sale, straight to your inbox.', 'Yeni ürünler, yeniden stoklananlar ve ara sıra numune satışları doğrudan gelen kutunuza.'),
      footer: copy('Considered clothing, responsibly made.', 'Sorumlulukla üretilmiş, özenli giyim.'),
      stats: [['24', copy('Pieces this season', 'Bu sezonki parça')], ['6', copy('Partner workshops', 'Ortak atölye')], ['30', copy('Days to return', 'Günlük iade süresi')]],
      quote: {
        text: copy('The first jeans that fit me without a single alteration.', 'Hiç tadilat gerektirmeden bana uyan ilk kot.'),
        author: copy('Customer review', 'Müşteri yorumu'),
      },
    }),
    variants: [
      starter('fashion-boutique', 'ivory', 'lookbook', copy('Fashion Boutique', 'Moda Butiği'), hero(
        'Independent boutique since 2012', "2012'den beri bağımsız butik",
        'Pieces chosen one by one.', 'Tek tek seçilmiş parçalar.',
        'Designers you will not find in the mall, and a stylist who remembers your size.', "AVM'de bulamayacağınız tasarımcılar ve bedeninizi hatırlayan bir stilist.")),
      starter('sneaker-store', 'neon', 'poster', copy('Sneaker Store', 'Sneaker Mağazası'), hero(
        'Limited drops every Friday', 'Her Cuma sınırlı sayıda ürün',
        'Fresh pairs, first in line.', 'Taze çiftler, sıranın en önünde.',
        'Rare releases, everyday classics and an online raffle for the most wanted drops.', 'Nadir çıkışlar, gündelik klasikler ve en çok istenen ürünler için online çekiliş.')),
      starter('jewellery-store', 'plum', 'catalog', copy('Jewellery Store', 'Mücevher Mağazası'), hero(
        'Engagement rings · fine jewellery', 'Tektaşlar · pırlanta mücevher',
        'For the moments you will remember.', 'Unutmayacağınız anlar için.',
        'Certified diamonds, custom settings and a private appointment to choose together.', 'Sertifikalı pırlantalar, özel tasarım montürler ve birlikte seçmek için özel randevu.')),
      starter('eyewear-store', 'sky', 'compare', copy('Eyewear Store', 'Gözlükçü'), hero(
        'Eye tests · frames · lenses', 'Göz muayenesi · çerçeveler · camlar',
        'Glasses that suit your face and your prescription.', 'Hem yüzünüze hem numaranıza uyan gözlükler.',
        'Independent frames, careful fitting and lenses ready in three days.', 'Bağımsız markaların çerçeveleri, özenli ayarlama ve üç günde hazır camlar.')),
      starter('vintage-shop', 'sunset', 'bento', copy('Vintage Shop', 'Vintage Dükkânı'), hero(
        'Second-hand, first-rate', 'İkinci el, birinci sınıf',
        'Clothes with a past and plenty of future.', 'Geçmişi olan, önünde uzun bir gelecek bulunan kıyafetler.',
        'Hand-picked vintage from the seventies to the nineties, cleaned, repaired and ready to wear.', 'Yetmişlerden doksanlara elle seçilmiş, temizlenmiş, onarılmış ve giyilmeye hazır vintage.')),
      starter('independent-bookstore', 'paper', 'magazine', copy('Independent Bookstore', 'Bağımsız Kitapçı'), hero(
        'Staff picks every week', 'Her hafta çalışan önerileri',
        'Your next favourite book is on our table.', 'Bir sonraki favori kitabınız masamızda.',
        'Hand-sold books, author evenings and a reading club that meets every month.', 'Elden önerilen kitaplar, yazar akşamları ve her ay buluşan bir okuma kulübü.')),
      starter('florist', 'rose', 'split', copy('Florist', 'Çiçekçi'), hero(
        'Seasonal flowers · weddings · events', 'Mevsim çiçekleri · düğünler · etkinlikler',
        'Flowers arranged the way they grow.', 'Yetiştikleri gibi düzenlenmiş çiçekler.',
        'Loose, seasonal bouquets and event flowers from a studio that buys from local growers.', 'Yerel üreticilerden alım yapan bir stüdyodan serbest, mevsimlik buketler ve etkinlik çiçekleri.')),
      starter('toy-store', 'bubble', 'directory', copy('Toy Store', 'Oyuncakçı'), hero(
        'Wooden toys · games · books', 'Ahşap oyuncaklar · oyunlar · kitaplar',
        'Toys that last longer than a birthday.', 'Bir doğum gününden uzun ömürlü oyuncaklar.',
        'Well-made toys and games for every age, gift-wrapped for free.', 'Her yaşa uygun, iyi üretilmiş oyuncaklar ve oyunlar; hediye paketi ücretsiz.')),
      starter('furniture-store', 'sand', 'showcase', copy('Furniture Store', 'Mobilya Mağazası'), hero(
        'Sofas · tables · lighting', 'Kanepeler · masalar · aydınlatma',
        'Furniture for the way you actually live.', 'Gerçekten yaşadığınız şekle uygun mobilyalar.',
        'Comfortable, well-built furniture with free room planning and white-glove delivery.', 'Konforlu ve sağlam mobilyalar; ücretsiz oda planlama ve özenli teslimatla.')),
      starter('streetwear-label', 'ink', 'stack', copy('Streetwear Label', 'Sokak Modası Markası'), hero(
        'Drop 07 out now', '07 numaralı koleksiyon çıktı',
        'Made in small runs, gone when it is gone.', 'Küçük seriler hâlinde üretildi; bitince biter.',
        'Heavyweight tees, hoodies and caps designed in the city and printed locally.', 'Şehirde tasarlanıp yerelde basılan kalın tişörtler, kapüşonlular ve şapkalar.')),
    ],
  },
]
