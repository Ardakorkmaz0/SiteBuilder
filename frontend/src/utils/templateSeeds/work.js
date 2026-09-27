// Services for people at work: advisors, hiring, workspaces, security and
// logistics.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const WORK_SEEDS = [
  {
    id: 'consulting', siteCategory: 'business', icon: '🧭', group: 'business',
    name: copy('Consulting & Coaching', 'Danışmanlık ve Koçluk'),
    desc: copy('Coaches, consultants and advisors who help people and teams move forward.', 'İnsanların ve ekiplerin ilerlemesine yardım eden koçlar, danışmanlar ve uzmanlar.'),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('Approach', 'Yaklaşım'), copy('Book a call', 'Görüşme ayarla')],
      badge: copy('Independent · practical · confidential', 'Bağımsız · pratik · gizli'),
      title: copy('Clear thinking for the decision in front of you.', 'Önünüzdeki karar için net bir bakış.'),
      lead: copy('Honest questions, useful frameworks and a partner who stays until the plan is working.', 'Dürüst sorular, işe yarayan çerçeveler ve plan işleyene kadar yanınızda kalan bir ortak.'),
      cta: copy('Book an intro call', 'Tanışma görüşmesi ayarla'),
      sectionTitle: copy('Ways we work together', 'Birlikte çalışma biçimlerimiz'),
      sectionLead: copy('Short sprints for a single question, or a longer partnership for bigger change.', 'Tek bir soru için kısa çalışmalar ya da büyük değişim için uzun soluklu bir ortaklık.'),
      items: [
        item('Strategy sessions', 'Strateji oturumları', 'Half-day workshops that end with decisions, not slides.', 'Sunumla değil kararlarla biten yarım günlük atölyeler.'),
        item('One-to-one coaching', 'Bire bir koçluk', 'Regular sessions for leaders who want a thinking partner.', 'Birlikte düşünecek bir ortak arayan liderler için düzenli seanslar.'),
        item('Team programmes', 'Ekip programları', 'Structured support that helps a team change how it works.', 'Bir ekibin çalışma biçimini değiştirmesine yardım eden yapılandırılmış destek.'),
      ],
      storyTitle: copy('Advice you can act on', 'Uygulayabileceğiniz tavsiyeler'),
      story: copy('We listen before we recommend, write things down in plain language and measure progress in outcomes you care about.', 'Önermeden önce dinler, her şeyi sade bir dille yazar ve ilerlemeyi sizin önemsediğiniz sonuçlarla ölçeriz.'),
      steps: [copy('A free first conversation', 'Ücretsiz ilk görüşme'), copy('A clear proposal', 'Net bir teklif'), copy('Work that shows results', 'Sonuç veren çalışma')],
      ctaTitle: copy('Start with thirty minutes', 'Otuz dakikayla başlayın'),
      ctaCopy: copy('Tell us what you are working on. If we are not the right fit, we will say so and suggest someone who is.', 'Üzerinde çalıştığınız konuyu anlatın. Doğru kişi değilsek bunu söyler, doğru kişiyi öneririz.'),
      footer: copy('Practical advice and coaching for people and teams.', 'İnsanlar ve ekipler için pratik danışmanlık ve koçluk.'),
      stats: [['15', copy('Years of practice', 'Yıllık deneyim')], ['120+', copy('Leaders coached', 'Koçluk verilen lider')], [copy('92%', '%92'), copy('Clients who return', 'Yeniden çalışan müşteri')]],
      quote: {
        text: copy('For the first time, our plan fits on one page and everyone knows their part.', 'İlk kez planımız tek bir sayfaya sığıyor ve herkes kendi payını biliyor.'),
        author: copy('Founder, logistics company', 'Kurucu, lojistik şirketi'),
      },
    }),
    variants: [
      starter('business-coach', 'indigo', 'service', copy('Business Coach', 'İş Koçu'), hero(
        'For founders and small business owners', 'Kurucular ve küçük işletme sahipleri için',
        'Grow the business without it running your life.', 'İşinizi büyütün ama hayatınızı yönetmesine izin vermeyin.',
        'Monthly coaching that turns a busy owner into a clear-headed one.', 'Yoğun bir işletme sahibini zihni berrak birine dönüştüren aylık koçluk.')),
      starter('career-coach', 'lavender', 'letter', copy('Career Coach', 'Kariyer Koçu'), hero(
        'Career changes and next steps', 'Kariyer değişiklikleri ve sonraki adımlar',
        'Your next role should fit the person you are now.', 'Bir sonraki işiniz bugünkü hâlinize uymalı.',
        'CV reviews, interview practice and honest advice for a move that makes sense.', 'Mantıklı bir geçiş için özgeçmiş incelemesi, mülakat pratiği ve dürüst tavsiye.')),
      starter('hr-consultancy', 'steel', 'directory', copy('HR Consultancy', 'İK Danışmanlığı'), hero(
        'People operations for growing teams', 'Büyüyen ekipler için insan kaynakları',
        'Policies, hiring and culture, handled properly.', 'Politikalar, işe alım ve kültür; doğru şekilde.',
        'Practical HR support for companies that are too big to improvise and too small for a department.', 'Doğaçlama yapamayacak kadar büyük, ayrı bir departman kuramayacak kadar küçük şirketler için pratik İK desteği.')),
      starter('strategy-firm', 'navy', 'magazine', copy('Strategy Firm', 'Strateji Firması'), hero(
        'Growth · operations · transformation', 'Büyüme · operasyon · dönüşüm',
        'Strategy that survives contact with Monday.', 'Pazartesi sabahına dayanabilen strateji.',
        'We work inside your team to shape plans that people can actually carry out.', 'İnsanların gerçekten uygulayabileceği planları ekibinizin içinde, birlikte şekillendiririz.')),
      starter('executive-search', 'ink', 'split', copy('Executive Search', 'Üst Düzey Yönetici Arama'), hero(
        'Discreet senior hiring', 'Gizlilikle üst düzey işe alım',
        'The right leader is rarely looking for a job.', 'Doğru lider nadiren iş arıyordur.',
        'Research-led search for senior roles, handled with discretion from brief to first day.', 'Üst düzey pozisyonlar için araştırmaya dayalı arama; brifingden ilk güne kadar gizlilikle yürütülür.')),
      starter('translation-agency', 'arctic', 'compare', copy('Translation Agency', 'Çeviri Bürosu'), hero(
        '30 languages · sworn translators', '30 dil · yeminli tercümanlar',
        'Say it clearly, in every language you need.', 'İhtiyacınız olan her dilde, net bir şekilde söyleyin.',
        'Legal, technical and marketing translation reviewed by native speakers.', 'Ana dili konuşanlarca kontrol edilen hukuki, teknik ve pazarlama çevirileri.')),
      starter('virtual-assistant', 'bubble', 'bento', copy('Virtual Assistant', 'Sanal Asistan'), hero(
        'Inbox, calendar and admin', 'E-posta, takvim ve idari işler',
        'Hand over the busywork and get your week back.', 'Rutin işleri devredin, haftanızı geri kazanın.',
        'Reliable remote assistants who keep your inbox, diary and paperwork under control.', 'E-postalarınızı, ajandanızı ve evraklarınızı kontrol altında tutan güvenilir uzaktan asistanlar.')),
      starter('project-office', 'graphite', 'appshell', copy('Project Office', 'Proje Ofisi'), hero(
        'Delivery management on demand', 'İhtiyaç anında proje yönetimi',
        'Projects that land on time, and a team that is not exhausted.', 'Zamanında tamamlanan projeler ve tükenmemiş bir ekip.',
        'Experienced project managers who bring structure, reporting and calm to complex work.', 'Karmaşık işlere düzen, raporlama ve sakinlik getiren deneyimli proje yöneticileri.')),
      starter('leadership-programme', 'forest', 'chronicle', copy('Leadership Programme', 'Liderlik Programı'), hero(
        'Six months · cohort of twelve', 'Altı ay · on iki kişilik grup',
        'Become the manager you wish you had.', 'Sahip olmak istediğiniz yönetici olun.',
        'A six-month programme for new managers, with coaching, peer groups and real projects.', 'Yeni yöneticiler için koçluk, akran grupları ve gerçek projeler içeren altı aylık program.')),
      starter('startup-mentor', 'citrus', 'solo', copy('Startup Mentor', 'Girişim Mentoru'), hero(
        'Office hours for early founders', 'Erken aşama kurucular için ofis saatleri',
        'Advice from someone who has already made the mistakes.', 'O hataları çoktan yapmış birinden tavsiye.',
        'Book a session on fundraising, hiring or product and leave with three next steps.', 'Yatırım, işe alım ya da ürün üzerine bir seans ayırtın ve üç net adımla ayrılın.')),
    ],
  },
  {
    id: 'careers', siteCategory: 'business', icon: '📋', group: 'business',
    name: copy('Careers & Recruiting', 'Kariyer ve İşe Alım'),
    desc: copy('Job boards, recruiters and careers pages that help people find work.', 'İnsanların iş bulmasına yardım eden iş ilanı siteleri, işe alım uzmanları ve kariyer sayfaları.'),
    profile: profile({
      nav: [copy('Open roles', 'Açık pozisyonlar'), copy('Why us', 'Neden biz'), copy('Apply', 'Başvur')],
      badge: copy('Hiring now · remote and on site', 'Şimdi işe alıyoruz · uzaktan ve ofiste'),
      title: copy('Work that matters, with people you will like.', 'Seveceğiniz insanlarla anlamlı bir iş.'),
      lead: copy('Clear job descriptions, fair salaries in every listing and a hiring process that respects your time.', 'Net iş tanımları, her ilanda adil maaş bilgisi ve zamanınıza saygı duyan bir işe alım süreci.'),
      cta: copy('See open roles', 'Açık pozisyonları gör'),
      sectionTitle: copy('Roles we are hiring for', 'İşe aldığımız pozisyonlar'),
      sectionLead: copy('New roles every week. Every listing includes the salary range and the team you would join.', 'Her hafta yeni pozisyonlar. Her ilanda maaş aralığı ve katılacağınız ekip yazar.'),
      items: [
        item('Engineering & product', 'Mühendislik ve ürün', 'Build tools that thousands of people use every day.', 'Binlerce kişinin her gün kullandığı araçlar geliştirin.'),
        item('Sales & customer success', 'Satış ve müşteri başarısı', 'Help customers get real value, and grow with them.', 'Müşterilerin gerçek değer elde etmesine yardım edin ve onlarla birlikte büyüyün.'),
        item('Operations & finance', 'Operasyon ve finans', 'Keep the company running smoothly as it grows.', 'Şirket büyürken işlerin sorunsuz yürümesini sağlayın.'),
      ],
      storyTitle: copy('A hiring process you will not dread', 'Korkmayacağınız bir işe alım süreci'),
      story: copy('Three conversations, one practical exercise we pay you for, and an answer within two weeks, whatever it is.', 'Üç görüşme, ücretini ödediğimiz tek bir pratik çalışma ve iki hafta içinde, sonuç ne olursa olsun, bir yanıt.'),
      steps: [copy('Send your application', 'Başvurunuzu gönderin'), copy('Meet the team', 'Ekiple tanışın'), copy('Get a clear answer', 'Net bir yanıt alın')],
      ctaTitle: copy('Do not see the right role?', 'Uygun pozisyonu göremediniz mi?'),
      ctaCopy: copy('Send us a short note about what you do best and we will keep you in mind.', 'En iyi yaptığınız işi anlatan kısa bir not gönderin; sizi aklımızda tutalım.'),
      footer: copy('Fair, transparent hiring for good teams.', 'İyi ekipler için adil ve şeffaf işe alım.'),
      stats: [['38', copy('Roles open now', 'Şu an açık pozisyon')], ['14', copy('Days to an answer', 'Günde yanıt')], ['4.7', copy('Candidate rating', 'Aday puanı')]],
      quote: {
        text: copy('The most respectful hiring process I have been through.', 'Katıldığım en saygılı işe alım süreciydi.'),
        author: copy('Engineer, hired last spring', 'Mühendis, geçen bahar işe alındı'),
      },
    }),
    variants: [
      starter('job-board', 'sky', 'directory', copy('Job Board', 'İş İlanları'), hero(
        'Salaries on every listing', 'Her ilanda maaş bilgisi',
        'Find a job without the guesswork.', 'Tahmin yürütmeden iş bulun.',
        'Hand-checked listings from companies that publish salaries and answer every applicant.', 'Maaşları paylaşan ve her adaya yanıt veren şirketlerden elle kontrol edilmiş ilanlar.')),
      starter('recruitment-agency', 'indigo', 'service', copy('Recruitment Agency', 'İşe Alım Ajansı'), hero(
        'Specialist recruiters', 'Uzman işe alım danışmanları',
        'We find the people your team is missing.', 'Ekibinizde eksik olan kişileri buluyoruz.',
        'Recruiters who understand the role, meet every candidate and only send you a shortlist worth reading.', 'Pozisyonu anlayan, her adayla görüşen ve size yalnızca okumaya değer bir kısa liste gönderen danışmanlar.')),
      starter('company-careers', 'mint', 'stack', copy('Company Careers', 'Şirket Kariyer Sayfası'), hero(
        'We are hiring', 'İşe alıyoruz',
        'Come and build something you will be proud of.', 'Gurur duyacağınız bir şey inşa etmeye gelin.',
        'Meet the teams, read how we work and apply in minutes, not hours.', 'Ekiplerle tanışın, nasıl çalıştığımızı okuyun ve saatler değil dakikalar içinde başvurun.')),
      starter('internship-programme', 'citrus', 'chronicle', copy('Internship Programme', 'Staj Programı'), hero(
        'Paid · 12 weeks · mentored', 'Ücretli · 12 hafta · mentorlu',
        'An internship where you ship real work.', 'Gerçek işler çıkardığınız bir staj.',
        'Twelve paid weeks with a mentor, a real project and a final demo to the whole company.', 'Bir mentor, gerçek bir proje ve tüm şirkete yapılan final sunumuyla on iki ücretli hafta.')),
      starter('freelance-network', 'graphite', 'bento', copy('Freelance Network', 'Serbest Çalışan Ağı'), hero(
        'Vetted freelancers in 48 hours', '48 saatte seçilmiş serbest çalışanlar',
        'Senior freelancers, ready when the work is.', 'İş hazır olduğunda hazır, deneyimli serbest çalışanlar.',
        'Designers, developers and writers who have been reviewed by people who do the same job.', 'Aynı işi yapan kişilerce değerlendirilmiş tasarımcılar, geliştiriciler ve yazarlar.')),
      starter('remote-jobs', 'teal', 'appshell', copy('Remote Jobs', 'Uzaktan İşler'), hero(
        'Work from anywhere', 'Her yerden çalışın',
        'Remote roles at companies that do remote well.', 'Uzaktan çalışmayı iyi yapan şirketlerde uzaktan işler.',
        'Filter by time zone, salary and team size, and apply with one profile.', 'Saat dilimine, maaşa ve ekip büyüklüğüne göre filtreleyin; tek profille başvurun.')),
      starter('tech-recruiting', 'neon', 'poster', copy('Tech Recruiting', 'Teknoloji İşe Alımı'), hero(
        'Engineers placed at 200+ startups', '200+ girişime mühendis yerleştirdik',
        'Hire engineers who ship.', 'Ürün çıkaran mühendisleri işe alın.',
        'Technical recruiters who can read a pull request and know what great looks like.', 'Bir kod incelemesini okuyabilen ve harika işin neye benzediğini bilen teknik işe alım uzmanları.')),
      starter('hospitality-staffing', 'sunset', 'catalog', copy('Hospitality Staffing', 'Turizm Personeli'), hero(
        'Chefs, waiters and hotel staff', 'Aşçılar, garsonlar ve otel personeli',
        'Great service starts with the right team.', 'Harika hizmet doğru ekiple başlar.',
        'Trained seasonal and permanent staff for restaurants, hotels and events.', 'Restoranlar, oteller ve etkinlikler için eğitimli sezonluk ve kadrolu personel.')),
      starter('campus-careers', 'press', 'magazine', copy('Campus Careers', 'Kampüs Kariyer Merkezi'), hero(
        'For students and new graduates', 'Öğrenciler ve yeni mezunlar için',
        'Your first job starts with a good conversation.', 'İlk işiniz iyi bir sohbetle başlar.',
        'Career advice, employer events and CV clinics for every student on campus.', 'Kampüsteki her öğrenci için kariyer tavsiyesi, işveren etkinlikleri ve özgeçmiş klinikleri.')),
      starter('hiring-day', 'lemon', 'solo', copy('Hiring Day', 'İşe Alım Günü'), hero(
        'One day · twenty companies', 'Bir gün · yirmi şirket',
        'Meet twenty employers in a single afternoon.', 'Tek bir öğleden sonra yirmi işverenle tanışın.',
        'Register once, bring your CV and leave with interviews booked.', 'Bir kez kaydolun, özgeçmişinizi getirin ve planlanmış mülakatlarla ayrılın.')),
    ],
  },
  {
    id: 'coworking', siteCategory: 'business', icon: '🏢', group: 'business',
    name: copy('Workspaces & Studios', 'Çalışma Alanları ve Stüdyolar'),
    desc: copy('Coworking spaces, studios and rooms you can rent by the hour or month.', 'Saatlik ya da aylık kiralanabilen ortak çalışma alanları, stüdyolar ve odalar.'),
    profile: profile({
      nav: [copy('Spaces', 'Alanlar'), copy('Community', 'Topluluk'), copy('Book a tour', 'Tur ayırt')],
      badge: copy('Day passes · desks · private offices', 'Günlük giriş · masalar · özel ofisler'),
      title: copy('A good place to do your best work.', 'En iyi işinizi çıkaracağınız iyi bir yer.'),
      lead: copy('Fast internet, good coffee, quiet corners and a community that is there when you want it.', 'Hızlı internet, iyi kahve, sessiz köşeler ve istediğinizde yanınızda olan bir topluluk.'),
      cta: copy('Book a tour', 'Tur ayırt'),
      sectionTitle: copy('Find the space that fits', 'Size uyan alanı bulun'),
      sectionLead: copy('Come for a day, settle in for a month or give your team a room of its own.', 'Bir günlüğüne gelin, bir aylığına yerleşin ya da ekibinize kendine ait bir oda verin.'),
      items: [
        item('Hot desks', 'Esnek masalar', 'Any free desk, any day, with lockers and meeting-room credits.', 'Her gün boş herhangi bir masa; dolap ve toplantı odası kredisiyle.'),
        item('Dedicated desks', 'Sabit masalar', 'Your own desk and monitor, left exactly how you like it.', 'Tam istediğiniz gibi bıraktığınız kendi masanız ve monitörünüz.'),
        item('Private offices', 'Özel ofisler', 'Lockable rooms for teams of two to twenty.', 'İki ila yirmi kişilik ekipler için kilitlenebilir odalar.'),
      ],
      storyTitle: copy('More than a desk', 'Bir masadan fazlası'),
      story: copy('Lunch talks, Friday breakfasts and members who share what they know. People come for the space and stay for the people.', 'Öğle konuşmaları, Cuma kahvaltıları ve bildiklerini paylaşan üyeler. İnsanlar alan için gelir, insanlar için kalır.'),
      steps: [copy('Book a free tour', 'Ücretsiz tur ayırtın'), copy('Try a day on us', 'Bir günü bizden deneyin'), copy('Pick your plan', 'Planınızı seçin')],
      ctaTitle: copy('Come and work here for a day', 'Bir gün burada çalışmaya gelin'),
      ctaCopy: copy('Book a tour and your first day pass is free. Bring your laptop; we will handle the coffee.', 'Bir tur ayırtın, ilk günlük girişiniz ücretsiz. Dizüstünüzü getirin, kahveyi biz hallederiz.'),
      footer: copy('Flexible workspace with a community built in.', 'İçinde topluluğu olan esnek çalışma alanı.'),
      stats: [['1 Gbps', copy('Fibre internet', 'Fiber internet')], ['24/7', copy('Member access', 'Üye erişimi')], ['180', copy('Members', 'Üye')]],
      quote: {
        text: copy('I get more done in a morning here than in a week at home.', 'Burada bir sabahta evde bir haftada yaptığımdan fazlasını yapıyorum.'),
        author: copy('Freelance designer, member since 2021', "Serbest tasarımcı, 2021'den beri üye"),
      },
    }),
    variants: [
      starter('coworking-space', 'indigo', 'catalog', copy('Coworking Space', 'Ortak Çalışma Alanı'), hero(
        'Open 7 days · central location', 'Haftanın 7 günü açık · merkezi konum',
        'Your desk in the middle of the city.', 'Şehrin tam ortasında masanız.',
        'Flexible desks and private offices five minutes from the metro.', 'Metroya beş dakika mesafede esnek masalar ve özel ofisler.')),
      starter('maker-space', 'graphite', 'directory', copy('Maker Space', 'Üretim Atölyesi'), hero(
        'Laser cutters · 3D printers · wood shop', 'Lazer kesim · 3B yazıcı · ahşap atölyesi',
        'The tools you do not have room for at home.', 'Evde yer açamadığınız aletler burada.',
        'A shared workshop with inductions, storage and people happy to help you finish the project.', 'Tanıtım eğitimleri, depolama alanı ve projenizi bitirmenize seve seve yardım eden insanlarla ortak bir atölye.')),
      starter('studio-rental', 'ink', 'lookbook', copy('Studio Rental', 'Stüdyo Kiralama'), hero(
        'Daylight studio · by the hour', 'Gün ışıklı stüdyo · saatlik',
        'North light, white walls and a kettle.', 'Kuzey ışığı, beyaz duvarlar ve bir çaydanlık.',
        'A photo and video studio with backdrops, lighting and a loading door on the street.', 'Fonları, ışıkları ve sokağa açılan yükleme kapısıyla fotoğraf ve video stüdyosu.')),
      starter('meeting-rooms', 'arctic', 'compare', copy('Meeting Rooms', 'Toplantı Odaları'), hero(
        'Book by the hour', 'Saatlik rezervasyon',
        'A proper room for the meeting that matters.', 'Önemli toplantınız için gerçek bir oda.',
        'Rooms for four to forty with screens, whiteboards and catering on request.', 'Ekranlı, beyaz tahtalı, isteğe göre ikramlı dört ila kırk kişilik odalar.')),
      starter('virtual-office', 'steel', 'solo', copy('Virtual Office', 'Sanal Ofis'), hero(
        'Business address · mail handling', 'İş adresi · posta yönetimi',
        'A professional address without the rent.', 'Kira ödemeden profesyonel bir adres.',
        'Register your company, receive mail and take calls at a central business address.', 'Şirketinizi kaydedin, postalarınızı alın ve aramalarınızı merkezi bir iş adresinde karşılayın.')),
      starter('podcast-studio', 'neon', 'poster', copy('Podcast Studio', 'Podcast Stüdyosu'), hero(
        'Treated room · engineer included', 'Akustik oda · ses mühendisi dahil',
        'Press record in a room that sounds right.', 'Doğru ses veren bir odada kayda basın.',
        'Four microphones, video cameras and an engineer who hands you the files the same day.', 'Dört mikrofon, video kameralar ve dosyaları aynı gün teslim eden bir ses mühendisi.')),
      starter('creative-hub', 'coral', 'bento', copy('Creative Hub', 'Yaratıcı Merkez'), hero(
        'For designers, writers and makers', 'Tasarımcılar, yazarlar ve üreticiler için',
        'Work alongside people who make things.', 'Bir şeyler üreten insanlarla yan yana çalışın.',
        'Studios, desks and a gallery wall for a community of independent creatives.', 'Bağımsız yaratıcılardan oluşan bir topluluk için stüdyolar, masalar ve bir galeri duvarı.')),
      starter('startup-incubator', 'midnight', 'chronicle', copy('Startup Incubator', 'Girişim Kuluçka Merkezi'), hero(
        'Six-month programme · free desks', 'Altı aylık program · ücretsiz masalar',
        'From idea to first customers in six months.', 'Altı ayda fikirden ilk müşterilere.',
        'Mentors, workshops and a demo day, with desk space for the whole founding team.', 'Mentorlar, atölyeler ve bir demo günü; tüm kurucu ekip için masa alanıyla.')),
      starter('library-cafe', 'sand', 'letter', copy('Library Café', 'Kütüphane Kafe'), hero(
        'Quiet floors · good coffee', 'Sessiz katlar · iyi kahve',
        'A quiet table, a full cup and no one in a hurry.', 'Sessiz bir masa, dolu bir fincan ve acele etmeyen insanlar.',
        'Study and work in a café where the upstairs floor is silent all day.', 'Üst katın bütün gün sessiz olduğu bir kafede çalışın ve ders çalışın.')),
      starter('team-offices', 'forest', 'split', copy('Team Offices', 'Ekip Ofisleri'), hero(
        'Private suites for 10 to 60', '10 ila 60 kişilik özel ofisler',
        'An office that grows when your team does.', 'Ekibiniz büyüdükçe büyüyen bir ofis.',
        'Furnished private floors on flexible terms, with reception, meeting rooms and events included.', 'Esnek koşullarla mobilyalı özel katlar; resepsiyon, toplantı odaları ve etkinlikler dahil.')),
    ],
  },
  {
    id: 'security', siteCategory: 'business', icon: '🛡️', group: 'business',
    name: copy('Security & Safety', 'Güvenlik ve Emniyet'),
    desc: copy('Security firms, locksmiths, alarm installers and safety trainers.', 'Güvenlik firmaları, çilingirler, alarm kurulumcuları ve güvenlik eğitmenleri.'),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('How we work', 'Nasıl çalışıyoruz'), copy('Get protected', 'Güvenceye alın')],
      badge: copy('Licensed · insured · on call 24/7', 'Lisanslı · sigortalı · 7/24 ulaşılabilir'),
      title: copy('Peace of mind, installed properly.', 'Doğru şekilde kurulmuş bir iç huzuru.'),
      lead: copy('Security designed around your building, explained in plain language and looked after long after installation.', 'Binanıza göre tasarlanan, sade bir dille anlatılan ve kurulumdan çok sonra da bakımı yapılan güvenlik.'),
      cta: copy('Request a site survey', 'Keşif talep et'),
      sectionTitle: copy('Protection for homes and businesses', 'Evler ve işletmeler için koruma'),
      sectionLead: copy('Start with a free survey and we will recommend only what you actually need.', 'Ücretsiz bir keşifle başlayın; yalnızca gerçekten ihtiyacınız olanı önerelim.'),
      items: [
        item('Alarms & monitoring', 'Alarm ve izleme', 'Sensors, sirens and a control room that answers in seconds.', 'Sensörler, sirenler ve saniyeler içinde yanıt veren bir kontrol merkezi.'),
        item('Cameras & access', 'Kamera ve geçiş kontrolü', 'Clear footage, smart locks and entry you control from your phone.', 'Net görüntü, akıllı kilitler ve telefonunuzdan yönettiğiniz giriş.'),
        item('Guarding & patrols', 'Koruma ve devriye', 'Trained officers for sites, events and after-hours checks.', 'Tesisler, etkinlikler ve mesai sonrası kontroller için eğitimli personel.'),
      ],
      storyTitle: copy('Serious about the details', 'Ayrıntılar konusunda ciddiyiz'),
      story: copy('Every installation is done by our own certified engineers, tested with you before we leave and serviced every year.', 'Her kurulum kendi sertifikalı teknisyenlerimizce yapılır, ayrılmadan önce sizinle birlikte test edilir ve her yıl bakımı yapılır.'),
      steps: [copy('Free site survey', 'Ücretsiz keşif'), copy('A clear, fixed quote', 'Net ve sabit bir teklif'), copy('Installed and tested', 'Kurulum ve test')],
      ctaTitle: copy('Book a free security survey', 'Ücretsiz güvenlik keşfi ayırtın'),
      ctaCopy: copy('An engineer will visit, walk the site with you and send a written recommendation within two days.', 'Bir teknisyen gelir, alanı sizinle birlikte gezer ve iki gün içinde yazılı bir öneri gönderir.'),
      footer: copy('Licensed security for homes and businesses.', 'Evler ve işletmeler için lisanslı güvenlik.'),
      stats: [['24/7', copy('Monitoring centre', 'İzleme merkezi')], [copy('90 s', '90 sn'), copy('Average response', 'Ortalama yanıt süresi')], [copy('2,400', '2.400'), copy('Sites protected', 'Korunan tesis')]],
      quote: {
        text: copy('They explained every option and never tried to sell us more than we needed.', 'Her seçeneği anlattılar ve ihtiyacımızdan fazlasını satmaya hiç çalışmadılar.'),
        author: copy('Retail store owner', 'Mağaza sahibi'),
      },
    }),
    variants: [
      starter('security-company', 'navy', 'service', copy('Security Company', 'Güvenlik Şirketi'), hero(
        'Integrated security since 1998', "1998'den beri entegre güvenlik",
        'One partner for alarms, cameras and guarding.', 'Alarm, kamera ve koruma için tek bir ortak.',
        'Designed, installed and monitored by one team that knows your site.', 'Alanınızı tanıyan tek bir ekip tarafından tasarlanır, kurulur ve izlenir.')),
      starter('locksmith', 'lemon', 'solo', copy('Locksmith', 'Çilingir'), hero(
        'Locked out? We are 20 minutes away', 'Kapıda mı kaldınız? 20 dakika uzaklıktayız',
        'Back inside, without the damage.', 'Hasarsız şekilde yeniden içeride.',
        'Emergency lock-outs, lock changes and security upgrades at fixed prices.', 'Acil kapı açma, kilit değişimi ve güvenlik yükseltmeleri sabit fiyatlarla.')),
      starter('fire-safety', 'sunset', 'compare', copy('Fire Safety', 'Yangın Güvenliği'), hero(
        'Inspections · extinguishers · training', 'Denetimler · yangın söndürücüler · eğitim',
        'Be ready for the day you hope never comes.', 'Hiç gelmemesini umduğunuz güne hazır olun.',
        'Risk assessments, equipment servicing and staff training that keep you compliant.', 'Mevzuata uyumlu kalmanızı sağlayan risk değerlendirmeleri, ekipman bakımı ve personel eğitimi.')),
      starter('smart-alarms', 'slate', 'appshell', copy('Smart Alarms', 'Akıllı Alarm Sistemleri'), hero(
        'App-controlled security', 'Uygulamayla yönetilen güvenlik',
        'See your whole home from one screen.', 'Evinizin tamamını tek bir ekrandan görün.',
        'Wireless alarms, door sensors and cameras that you arm, check and share from your phone.', 'Telefonunuzdan kurup kontrol ettiğiniz ve paylaştığınız kablosuz alarmlar, kapı sensörleri ve kameralar.')),
      starter('cyber-audit', 'graphite', 'directory', copy('Cyber Security Audit', 'Siber Güvenlik Denetimi'), hero(
        'Penetration testing · ISO 27001', 'Sızma testi · ISO 27001',
        'Find the weak spots before someone else does.', 'Zayıf noktaları başkası bulmadan siz bulun.',
        'Independent security testing and clear, prioritised reports your developers can act on.', 'Bağımsız güvenlik testleri ve geliştiricilerinizin uygulayabileceği net, önceliklendirilmiş raporlar.')),
      starter('cctv-installers', 'steel', 'catalog', copy('CCTV Installers', 'Kamera Sistemleri'), hero(
        '4K cameras · remote viewing', '4K kameralar · uzaktan izleme',
        'Clear footage when it matters.', 'Gerektiğinde net görüntü.',
        'Camera systems for shops, offices and homes, installed neatly and set up on your phone.', 'Mağazalar, ofisler ve evler için kamera sistemleri; özenle kurulur, telefonunuza tanımlanır.')),
      starter('event-security', 'ink', 'poster', copy('Event Security', 'Etkinlik Güvenliği'), hero(
        'Concerts · festivals · corporate', 'Konserler · festivaller · kurumsal',
        'Safe crowds, smooth doors, good nights.', 'Güvenli kalabalıklar, sorunsuz girişler, güzel geceler.',
        'Licensed stewards and security teams who keep events safe without spoiling the mood.', 'Havayı bozmadan etkinlikleri güvende tutan lisanslı görevliler ve güvenlik ekipleri.')),
      starter('safety-training', 'forest', 'chronicle', copy('Safety Training', 'İş Güvenliği Eğitimi'), hero(
        'Certified first aid and workplace safety', 'Sertifikalı ilk yardım ve iş güvenliği',
        'Training that people remember when it counts.', 'İnsanların gerektiğinde hatırladığı eğitimler.',
        'Hands-on first aid, fire and workplace safety courses at your site or ours.', 'Sizin ya da bizim mekânımızda uygulamalı ilk yardım, yangın ve iş güvenliği kursları.')),
      starter('smart-locks', 'bubble', 'bento', copy('Smart Locks', 'Akıllı Kilitler'), hero(
        'Keyless entry for rentals', 'Kiralık evler için anahtarsız giriş',
        'Let guests in without handing over a key.', 'Anahtar teslim etmeden misafirleri içeri alın.',
        'Codes that expire when the stay ends, an entry log and no more lost keys.', 'Konaklama bitince geçerliliğini yitiren şifreler, giriş kaydı ve kaybolan anahtarlara son.')),
      starter('private-investigator', 'noir', 'split', copy('Private Investigator', 'Özel Araştırmacı'), hero(
        'Discreet · licensed · confidential', 'Gizli · lisanslı · güvenilir',
        'Facts, gathered quietly and legally.', 'Sessizce ve yasal yollarla toplanan gerçekler.',
        'Background checks, due diligence and investigations handled with complete discretion.', 'Tam bir gizlilikle yürütülen geçmiş araştırmaları, durum tespitleri ve incelemeler.')),
    ],
  },
  {
    id: 'logistics', siteCategory: 'business', icon: '🚚', group: 'industry',
    name: copy('Logistics & Transport', 'Lojistik ve Taşımacılık'),
    desc: copy('Freight, couriers, movers and everyone who gets things from A to B.', "Yük taşımacılığı, kuryeler, nakliyeciler ve bir şeyi A'dan B'ye ulaştıran herkes."),
    profile: profile({
      nav: [copy('Services', 'Hizmetler'), copy('Our network', 'Ağımız'), copy('Get a quote', 'Teklif al')],
      badge: copy('Road · sea · air', 'Kara · deniz · hava'),
      title: copy('Your goods, where they need to be, when they need to be there.', 'Yükünüz, olması gereken yerde, olması gereken zamanda.'),
      lead: copy('Reliable transport, honest tracking and a real person to call when plans change.', 'Güvenilir taşımacılık, dürüst takip ve planlar değiştiğinde arayabileceğiniz gerçek bir insan.'),
      cta: copy('Get a quote', 'Teklif al'),
      sectionTitle: copy('What we move', 'Neler taşıyoruz'),
      sectionLead: copy('From a single parcel to full containers, with the paperwork handled.', 'Tek bir koliden komple konteynerlere kadar; evrak işleri dahil.'),
      items: [
        item('Parcels & pallets', 'Koli ve paletler', 'Same-day and next-day delivery across the region.', 'Bölge genelinde aynı gün ve ertesi gün teslimat.'),
        item('Freight & containers', 'Yük ve konteynerler', 'Full and part loads by road and sea, door to door.', 'Karayolu ve denizyoluyla kapıdan kapıya komple ve parsiyel yükler.'),
        item('Storage & fulfilment', 'Depolama ve sipariş karşılama', 'Warehousing, pick-and-pack and returns in one place.', 'Depolama, toplama-paketleme ve iadeler tek bir yerde.'),
      ],
      storyTitle: copy('No surprises between here and there', 'Burası ile orası arasında sürpriz yok'),
      story: copy('Live tracking on every shipment, customs handled by our own brokers and one account manager who knows your business.', 'Her gönderide canlı takip, kendi gümrük müşavirlerimizce yürütülen işlemler ve işinizi tanıyan tek bir müşteri temsilcisi.'),
      steps: [copy('Tell us what and where', 'Neyi ve nereye olduğunu söyleyin'), copy('Get a price within the hour', 'Bir saat içinde fiyat alın'), copy('Track it all the way', 'Yol boyunca takip edin')],
      ctaTitle: copy('Moving something soon?', 'Yakında bir şey mi taşıyacaksınız?'),
      ctaCopy: copy('Send the size, weight and route, and we will reply with a clear price the same day.', 'Boyutu, ağırlığı ve güzergâhı gönderin; aynı gün net bir fiyatla dönelim.'),
      footer: copy('Dependable logistics, tracked end to end.', 'Uçtan uca takip edilen güvenilir lojistik.'),
      stats: [[copy('98.7%', '%98,7'), copy('On-time delivery', 'Zamanında teslimat')], ['40', copy('Countries served', 'Hizmet verilen ülke')], ['120', copy('Vehicles in our fleet', 'Araçlık filo')]],
      quote: {
        text: copy('They answer the phone, and the truck turns up when they say it will.', 'Telefonu açıyorlar ve kamyon söyledikleri saatte geliyor.'),
        author: copy('Operations manager, furniture brand', 'Operasyon müdürü, mobilya markası'),
      },
    }),
    variants: [
      starter('freight-forwarder', 'navy', 'directory', copy('Freight Forwarder', 'Uluslararası Taşımacılık'), hero(
        'Customs · sea · air freight', 'Gümrük · deniz · hava kargo',
        'International shipping without the headaches.', 'Baş ağrısı olmadan uluslararası taşımacılık.',
        'We book the space, handle customs and keep you updated until it clears.', 'Yeri ayırtır, gümrüğü halleder ve malınız çekilene kadar sizi bilgilendiririz.')),
      starter('same-day-courier', 'citrus', 'poster', copy('Same-Day Courier', 'Aynı Gün Kurye'), hero(
        'Collected in 60 minutes', '60 dakikada teslim alınır',
        'Across the city before lunch.', 'Öğle yemeğinden önce şehrin öbür ucunda.',
        'Motorbike and van couriers for documents, parcels and urgent deliveries.', 'Evrak, koli ve acil teslimatlar için motosiklet ve panelvan kuryeler.')),
      starter('moving-company', 'sky', 'service', copy('Moving Company', 'Nakliyat Firması'), hero(
        'Homes and offices · packing included', 'Ev ve ofis · paketleme dahil',
        'A calmer moving day.', 'Daha sakin bir taşınma günü.',
        'Careful packers, insured transport and a fixed price agreed before we lift a box.', 'Özenli paketleyiciler, sigortalı taşıma ve tek bir koli kaldırmadan önce anlaşılan sabit fiyat.')),
      starter('airport-transfers', 'arctic', 'solo', copy('Airport Transfers', 'Havalimanı Transferi'), hero(
        'Fixed prices · flight tracking', 'Sabit fiyat · uçuş takibi',
        'Your driver is waiting, even if the flight is late.', 'Uçuş gecikse bile şoförünüz sizi bekliyor.',
        'Private transfers between the airport, hotels and home, booked in under a minute.', 'Havalimanı, oteller ve ev arasında bir dakikadan kısa sürede ayırtılan özel transferler.')),
      starter('shipping-line', 'ocean', 'showcase', copy('Shipping Line', 'Denizcilik Şirketi'), hero(
        'Weekly sailings across the Mediterranean', 'Akdeniz genelinde haftalık seferler',
        'Reliable sailings, port to port.', 'Limandan limana güvenilir seferler.',
        'Container and ro-ro services with fixed weekly schedules and online booking.', 'Sabit haftalık tarifeler ve online rezervasyonla konteyner ve ro-ro hizmetleri.')),
      starter('fulfilment-warehouse', 'steel', 'appshell', copy('Warehouse & Fulfilment', 'Depo ve Sipariş Karşılama'), hero(
        'Connected to your online store', 'Online mağazanıza bağlı',
        'Orders in, parcels out, stock always visible.', 'Siparişler gelir, koliler çıkar, stok her an görünür.',
        'Fulfilment for online brands with same-day dispatch and a live stock dashboard.', 'Online markalar için aynı gün sevkiyat ve canlı stok paneliyle sipariş karşılama.')),
      starter('road-haulage', 'terra', 'catalog', copy('Road Haulage', 'Karayolu Taşımacılığı'), hero(
        'Full and part loads', 'Komple ve parsiyel yükler',
        'Trucks on the road every day of the week.', 'Haftanın her günü yolda olan tırlar.',
        'Domestic and European road freight with GPS tracking and experienced drivers.', 'GPS takibi ve deneyimli sürücülerle yurt içi ve Avrupa karayolu taşımacılığı.')),
      starter('bike-courier', 'mint', 'bento', copy('Bike Courier', 'Bisikletli Kurye'), hero(
        'Zero-emission city delivery', 'Sıfır emisyonlu şehir içi teslimat',
        'Fast deliveries with no exhaust.', 'Egzozsuz hızlı teslimatlar.',
        'Cargo bikes that beat the traffic for shops, restaurants and offices in the centre.', 'Merkezdeki mağazalar, restoranlar ve ofisler için trafiği yenen kargo bisikletleri.')),
      starter('customs-broker', 'paper', 'letter', copy('Customs Broker', 'Gümrük Müşavirliği'), hero(
        'Licensed customs consultants', 'Lisanslı gümrük müşavirleri',
        'The paperwork, done right the first time.', 'Evrak işleri, ilk seferde doğru.',
        'Import and export declarations, tariff advice and fewer days stuck at the border.', 'İthalat ve ihracat beyannameleri, tarife danışmanlığı ve sınırda daha az bekleme.')),
      starter('cold-chain', 'teal', 'compare', copy('Cold Chain', 'Soğuk Zincir'), hero(
        'Temperature-controlled transport', 'Isı kontrollü taşımacılık',
        'Fresh at the start, fresh at the end.', 'Yola çıkarken taze, varınca da taze.',
        'Refrigerated trucks and storage for food and pharmaceuticals, logged every minute.', 'Gıda ve ilaç için her dakika kayıt altında tutulan frigorifik araçlar ve depolama.')),
    ],
  },
]
