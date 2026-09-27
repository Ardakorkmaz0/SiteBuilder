// Food, farms and outdoor trips. Every starter names its own pack (palette +
// type) and family (page architecture), and opens with its own hero copy.
import { copy, item, profile, starter } from '../templateCopy.js'

const hero = (badge, badgeTr, title, titleTr, lead, leadTr) => ({
  badge: copy(badge, badgeTr),
  title: copy(title, titleTr),
  lead: copy(lead, leadTr),
})

export const FOOD_SEEDS = [
  {
    id: 'restaurant', siteCategory: 'business', icon: '🍽️', group: 'food',
    name: copy('Restaurants & Bars', 'Restoran ve Barlar'),
    desc: copy('Dining rooms, bars and kitchens with a menu worth reading.', 'Okunmaya değer menüsü olan restoranlar, barlar ve mutfaklar.'),
    profile: profile({
      nav: [copy('Menu', 'Menü'), copy('Our kitchen', 'Mutfağımız'), copy('Book a table', 'Masa ayırt')],
      badge: copy('Seasonal kitchen · open evenings', 'Mevsimsel mutfak · akşamları açık'),
      title: copy('A table worth coming back to.', 'Yeniden gelmeye değer bir sofra.'),
      lead: copy('Seasonal plates, a short wine list and a room that makes an ordinary evening feel like an occasion.', 'Mevsimlik tabaklar, kısa bir şarap listesi ve sıradan bir akşamı özel bir güne çeviren bir salon.'),
      cta: copy('Book a table', 'Masa ayırt'),
      sectionTitle: copy('On the menu tonight', 'Bu akşam menüde'),
      sectionLead: copy('A short menu that changes with the market, cooked the same day it is written.', 'Pazara göre değişen, yazıldığı gün pişirilen kısa bir menü.'),
      items: [
        item('To start', 'Başlangıçlar', 'Bread from the morning bake, cured fish and bright seasonal salads.', 'Sabah fırınından ekmek, marine balık ve canlı mevsim salataları.'),
        item('From the fire', 'Ateşten', 'Whole fish, slow-cooked lamb and vegetables with real char on them.', 'Bütün balık, ağır ateşte kuzu ve gerçekten közlenmiş sebzeler.'),
        item('To finish', 'Kapanış', 'One chocolate dessert, one fruit dessert and a small glass of something sweet.', 'Bir çikolatalı tatlı, bir meyveli tatlı ve küçük bir kadeh tatlı içki.'),
      ],
      storyTitle: copy('Cooked by people who care', 'Özen gösteren insanların elinden'),
      story: copy('We buy from a handful of growers and fishers we know by name, and we write the menu around what they bring us.', 'Adıyla tanıdığımız birkaç üretici ve balıkçıdan alışveriş yapar, menüyü onların getirdiklerine göre yazarız.'),
      steps: [copy('Choose an evening', 'Bir akşam seçin'), copy('Tell us about the table', 'Masanızı anlatın'), copy('Arrive hungry', 'Aç gelin')],
      ctaTitle: copy('Keep an evening free for us', 'Bize bir akşam ayırın'),
      ctaCopy: copy('Tables for two to twelve. For larger groups, write to us and we will plan the evening together.', 'İki ila on iki kişilik masalar. Daha kalabalık gruplar için bize yazın, akşamı birlikte planlayalım.'),
      footer: copy('Seasonal cooking, good wine and a warm room.', 'Mevsimsel mutfak, iyi şarap ve sıcak bir salon.'),
      stats: [['2014', copy('Open since', 'Açılış yılı')], ['48', copy('Seats', 'Kişilik salon')], ['12', copy('Local suppliers', 'Yerel tedarikçi')]],
      quote: {
        text: copy('The kind of place you recommend quietly, so it does not get too busy.', 'Çok kalabalıklaşmasın diye sessizce tavsiye ettiğiniz türden bir yer.'),
        author: copy('Local food guide', 'Yerel yemek rehberi'),
      },
    }),
    variants: [
      starter('fine-dining', 'noir', 'showcase', copy('Fine Dining', 'Gurme Restoran'), hero(
        'Tasting menu · Thursday to Sunday', 'Tadım menüsü · Perşembe–Pazar',
        'Nine courses, one long evening.', 'Dokuz tabak, uzun bir akşam.',
        "A tasting menu built from the week's best produce, paired with wines from small growers.", 'Haftanın en iyi ürünleriyle hazırlanan, küçük üreticilerin şaraplarıyla eşleştirilmiş bir tadım menüsü.')),
      starter('pizzeria', 'citrus', 'bento', copy('Neighbourhood Pizzeria', 'Mahalle Pizzacısı'), hero(
        'Wood-fired · 48-hour dough', 'Odun ateşi · 48 saatlik hamur',
        'Blistered crust, simple toppings, no shortcuts.', 'Kabarmış kenar, sade malzeme, kestirme yok.',
        'Slow-proved dough and a very hot oven. Eat in, take away, or order a whole tray for the office.', 'Yavaş mayalanmış hamur ve çok sıcak bir fırın. Burada yiyin, paket alın ya da ofise bütün bir tepsi sipariş edin.')),
      starter('sushi-counter', 'ink', 'split', copy('Sushi Counter', 'Suşi Tezgâhı'), hero(
        'Eight seats at the counter', 'Tezgâhta sekiz kişilik yer',
        'Fish cut in front of you, served one piece at a time.', 'Balık önünüzde kesilir, parça parça servis edilir.',
        'An omakase counter where the chef decides the order and the sea decides the menu.', 'Sıralamaya şefin, menüye denizin karar verdiği bir omakase tezgâhı.')),
      starter('meze-tavern', 'paper', 'magazine', copy('Meze Tavern', 'Meyhane'), hero(
        'Meze, rakı and long conversations', 'Meze, rakı ve uzun sohbetler',
        'Small plates, full tables, nobody in a hurry.', 'Küçük tabaklar, dolu masalar, kimse acele etmiyor.',
        'Cold meze from the counter, hot plates from the kitchen and a table that stays yours all evening.', 'Tezgâhtan soğuk mezeler, mutfaktan sıcaklar ve bütün akşam sizin kalan bir masa.')),
      starter('burger-joint', 'lemon', 'poster', copy('Burger Joint', 'Burgerci'), hero(
        'Smash burgers · fries · shakes', 'Smash burger · patates · milkshake',
        'Two patties, and one napkin is never enough.', 'İki köfte; tek peçete asla yetmez.',
        'Beef ground every morning, soft buns from the bakery next door and fries cooked twice.', 'Her sabah çekilen dana eti, yan fırından yumuşak ekmekler ve iki kez kızartılmış patates.')),
      starter('wine-bar', 'cocoa', 'letter', copy('Wine Bar', 'Şarap Barı'), hero(
        'Natural wine · small plates', 'Doğal şarap · küçük tabaklar',
        'Open a bottle, stay for one more glass.', 'Bir şişe açın, bir kadeh daha için kalın.',
        'Forty bottles by the glass, poured by people who will happily talk you through them.', 'Size seve seve anlatacak insanların doldurduğu, kadehle sunulan kırk şişe.')),
      starter('food-truck', 'sunset', 'solo', copy('Food Truck', 'Yemek Kamyonu'), hero(
        'Find us this week', 'Bu hafta bizi bulun',
        'Street food that follows you around town.', 'Şehrin her yerinde peşinizden gelen sokak lezzeti.',
        'Join the list and we will tell you where the truck is parked before lunch.', 'Listeye katılın, kamyonun nereye park ettiğini öğle yemeğinden önce haber verelim.')),
      starter('plant-kitchen', 'mint', 'catalog', copy('Plant Kitchen', 'Bitkisel Mutfak'), hero(
        'Fully plant-based · all day', 'Tamamen bitkisel · gün boyu',
        'Vegetables, cooked like they are the main event.', 'Başrolde sebzeler, hak ettikleri gibi pişirilir.',
        'Generous bowls, grilled vegetables and desserts nobody guesses are vegan.', 'Doyurucu kaseler, ızgara sebzeler ve kimsenin vegan olduğunu tahmin edemediği tatlılar.')),
      starter('steakhouse', 'navy', 'compare', copy('Steakhouse', 'Et Lokantası'), hero(
        'Dry-aged on site', 'Kendi dolabımızda dinlendirilmiş',
        'Know your cut before it reaches the grill.', 'Izgaraya girmeden önce kesiminizi tanıyın.',
        'Three cuts, three ages, cooked over charcoal and served with honest sides.', 'Üç kesim, üç dinlenme süresi; kömür ateşinde pişirilir, sade garnitürlerle servis edilir.')),
      starter('ramen-bar', 'neon', 'directory', copy('Ramen Bar', 'Ramen Barı'), hero(
        'Broth simmered for 18 hours', '18 saat kaynayan et suyu',
        'Slurping is not just allowed, it is expected.', 'Höpürdetmek serbest; hatta bekleniyor.',
        'Rich broths, springy noodles and a late kitchen for the nights that run long.', 'Yoğun et suları, esnek erişteler ve uzayan geceler için geç kapanan bir mutfak.')),
    ],
  },
  {
    id: 'food-makers', siteCategory: 'shop', icon: '🥖', group: 'food',
    name: copy('Bakeries & Food Makers', 'Fırınlar ve Gıda Üreticileri'),
    desc: copy('Bakers, roasters, brewers and small producers who sell what they make.', 'Ürettiğini satan fırıncılar, kavurucular, bira üreticileri ve küçük üreticiler.'),
    profile: profile({
      nav: [copy('Our goods', 'Ürünlerimiz'), copy('How we make it', 'Nasıl üretiyoruz'), copy('Order', 'Sipariş ver')],
      badge: copy('Small batches · made by hand', 'Küçük partiler · el yapımı'),
      title: copy('Made slowly, by hand, in small batches.', 'Yavaşça, elde, küçük partiler hâlinde üretildi.'),
      lead: copy('Real ingredients, patient methods and a short list of things we make very well.', 'Gerçek malzemeler, sabırlı yöntemler ve çok iyi yaptığımız kısa bir ürün listesi.'),
      cta: copy('Order now', 'Şimdi sipariş ver'),
      sectionTitle: copy('This week from the workshop', 'Bu hafta atölyeden'),
      sectionLead: copy('What is fresh, what is back in stock and what is worth ordering early.', 'Taze olanlar, yeniden stoğa girenler ve erken sipariş vermeye değenler.'),
      items: [
        item('Everyday staples', 'Günlük temel ürünler', 'The things regulars pick up every week without looking at the list.', 'Müdavimlerin listeye bakmadan her hafta aldığı ürünler.'),
        item('Seasonal specials', 'Mevsimlik özel ürünler', 'Short runs made while the ingredient is at its best.', 'Malzeme en iyi hâlindeyken yapılan kısa üretimler.'),
        item('Gift boxes', 'Hediye kutuları', 'A curated box, wrapped and ready to send to someone who deserves it.', 'Hak eden birine gönderilmeye hazır, özenle seçilmiş ve paketlenmiş bir kutu.'),
      ],
      storyTitle: copy('Time is an ingredient', 'Zaman da bir malzemedir'),
      story: copy('We would rather make less and make it properly. Every batch is tasted before it leaves the workshop.', 'Daha az ama doğru üretmeyi tercih ederiz. Her parti atölyeden çıkmadan önce tadılır.'),
      steps: [copy("Choose from this week's list", 'Bu haftanın listesinden seçin'), copy('Pick a collection day', 'Teslim alma gününü seçin'), copy('Taste the difference', 'Farkı tadın')],
      ctaTitle: copy('Order before Thursday for the weekend', "Hafta sonu için Perşembe'den önce sipariş verin"),
      ctaCopy: copy('Collect from the workshop or have it delivered locally. Wholesale enquiries welcome.', 'Atölyeden teslim alın ya da yakın çevreye teslimat isteyin. Toptan taleplerinizi de bekliyoruz.'),
      footer: copy('Small-batch food, made by hand.', 'El yapımı, küçük parti gıda.'),
      stats: [['6', copy('Core products', 'Temel ürün')], ['3', copy('Makers in the team', 'Kişilik üretim ekibi')], ['0', copy('Additives', 'Katkı maddesi')]],
      quote: {
        text: copy('You can taste that nobody rushed it.', 'Kimsenin acele etmediği tadından belli.'),
        author: copy('A regular since the first week', 'İlk haftadan beri müdavim'),
      },
    }),
    variants: [
      starter('artisan-bakery', 'sand', 'catalog', copy('Artisan Bakery', 'Zanaat Fırını'), hero(
        'Sourdough · baked before sunrise', 'Ekşi maya · güneş doğmadan pişer',
        'Bread with a crust that crackles back.', 'Kabuğu çıtırdayan ekmek.',
        'Long-fermented loaves, laminated pastries and a queue that moves quickly.', 'Uzun fermente somunlar, katmerli hamur işleri ve hızla ilerleyen bir sıra.')),
      starter('coffee-roastery', 'graphite', 'directory', copy('Coffee Roastery', 'Kahve Kavurucusu'), hero(
        'Roasted every Tuesday', 'Her Salı kavrulur',
        'Single origins, roasted to taste like where they grew.', 'Yetiştiği yerin tadını taşıyacak şekilde kavrulmuş tek köken kahveler.',
        'Traceable green coffee, careful roast profiles and brewing notes with every bag.', 'İzlenebilir çiğ kahve, özenli kavurma profilleri ve her pakette demleme notları.')),
      starter('craft-brewery', 'terra', 'showcase', copy('Craft Brewery', 'Zanaat Bira Evi'), hero(
        'Taproom open Friday to Sunday', 'Tadım salonu Cuma–Pazar açık',
        'Beer brewed a few metres from where you drink it.', 'İçtiğiniz yerin birkaç metre ötesinde üretilen bira.',
        'Four beers on tap, rotating seasonals and brewery tours on Saturday afternoons.', 'Musluktan dört bira, dönemsel çeşitler ve Cumartesi öğleden sonraları üretim turları.')),
      starter('family-winery', 'olive', 'editorial', copy('Family Winery', 'Aile Bağevi'), hero(
        'Estate grown since 1987', "1987'den beri kendi bağımızdan",
        'Every bottle starts in the same five hectares.', 'Her şişe aynı beş hektarda başlar.',
        'Small-production wines from our own vines, with tastings at the cellar door.', 'Kendi asmalarımızdan az miktarda üretilen şaraplar; mahzen kapısında tadım.')),
      starter('chocolatier', 'rose', 'lookbook', copy('Chocolatier', 'Çikolatacı'), hero(
        'Bean to bar · made in house', 'Çekirdekten tablete · kendi atölyemizde',
        'Chocolate with a short ingredient list and a long finish.', 'Malzeme listesi kısa, tadı uzun süren çikolata.',
        'Bars, bonbons and seasonal boxes made from beans we roast ourselves.', 'Kendi kavurduğumuz çekirdeklerden tabletler, bonbonlar ve mevsimlik kutular.')),
      starter('olive-oil', 'forest', 'letter', copy('Olive Oil Estate', 'Zeytinyağı Çiftliği'), hero(
        'Early harvest · cold pressed', 'Erken hasat · soğuk sıkım',
        'Green, peppery and pressed within hours of picking.', 'Yeşil, hafif acı ve toplandıktan birkaç saat sonra sıkılmış.',
        'Olive oil from old Aegean groves, bottled in small runs and shipped fresh.', 'Yaşlı Ege bahçelerinden gelen zeytinyağı; küçük partiler hâlinde şişelenir, taze gönderilir.')),
      starter('tea-house', 'emerald', 'sidebar', copy('Tea House', 'Çay Evi'), hero(
        'Loose leaf · brewed properly', 'Dökme yaprak · doğru demlenir',
        'Tea worth sitting down for.', 'Oturup içmeye değer bir çay.',
        'Black, green and herbal teas from small gardens, with a quiet room to drink them in.', 'Küçük bahçelerden siyah, yeşil ve bitki çayları; içmek için sakin bir oda.')),
      starter('cheese-dairy', 'ivory', 'booking', copy('Cheese Dairy', 'Peynir Mandırası'), hero(
        'Farmhouse cheese · raw milk', 'Çiftlik peyniri · çiğ süt',
        'Cheese that tastes of a place and a season.', 'Bir yerin ve bir mevsimin tadını taşıyan peynir.',
        'Aged wheels, fresh curds and tasting visits at the dairy on weekend mornings.', 'Olgunlaştırılmış tekerlekler, taze lor ve hafta sonu sabahları mandırada tadım ziyaretleri.')),
      starter('honey-farm', 'citrus', 'stack', copy('Honey Farm', 'Bal Çiftliği'), hero(
        'Raw honey from our own hives', 'Kendi kovanlarımızdan ham bal',
        'Honey that changes with every flowering.', 'Her çiçeklenmeyle değişen bal.',
        'Pine, chestnut and wildflower honey, harvested gently and never heated.', 'Nazikçe hasat edilen, asla ısıtılmayan çam, kestane ve çiçek balı.')),
      starter('pastry-shop', 'lavender', 'bento', copy('Pastry Shop', 'Pastane'), hero(
        'Cakes to order · counter every day', 'Siparişe pasta · her gün vitrin',
        'Celebration cakes and everyday treats.', 'Kutlama pastaları ve her günün tatlıları.',
        'Order a cake for the big day, or pick a slice from the counter on any other.', 'Büyük gün için pasta sipariş edin, diğer günler vitrinden bir dilim seçin.')),
    ],
  },
  {
    id: 'delivery', siteCategory: 'business', icon: '🥡', group: 'food',
    name: copy('Delivery & Meal Kits', 'Teslimat ve Yemek Kutuları'),
    desc: copy('Meal prep, grocery boxes and anything that arrives at the door.', 'Hazır yemek, market kutuları ve kapıya gelen her şey.'),
    profile: profile({
      nav: [copy('Plans', 'Planlar'), copy('The process', 'Süreç'), copy('Start an order', 'Siparişe başla')],
      badge: copy('Delivered fresh · skip any week', 'Taze teslimat · istediğiniz haftayı atlayın'),
      title: copy('Good food at the door, without the weekly shop.', 'Haftalık alışveriş derdi olmadan kapınızda iyi yemek.'),
      lead: copy('Choose what you like, pick a delivery day and change your plan whenever life changes.', 'Sevdiklerinizi seçin, teslimat gününü belirleyin ve hayat değiştikçe planınızı değiştirin.'),
      cta: copy('Choose a plan', 'Plan seç'),
      sectionTitle: copy('Plans that fit the week', 'Haftanıza uyan planlar'),
      sectionLead: copy('Start small, pause when you travel and cancel without a phone call.', 'Küçük başlayın, seyahatte ara verin, telefon açmadan iptal edin.'),
      items: [
        item('For one or two', 'Bir iki kişilik', 'Three meals a week, portioned so nothing goes to waste.', 'Hiçbir şey israf olmayacak şekilde porsiyonlanmış haftada üç öğün.'),
        item('For the family', 'Aile için', 'Bigger boxes, simple recipes and flavours children actually eat.', 'Daha büyük kutular, basit tarifler ve çocukların gerçekten yediği lezzetler.'),
        item('For the office', 'Ofis için', 'Team lunches delivered together, with labels for every diet.', 'Her beslenme tercihine etiketli, birlikte teslim edilen ekip öğle yemekleri.'),
      ],
      storyTitle: copy('Fresh, local and on time', 'Taze, yerel ve zamanında'),
      story: copy('We cook and pack the day before delivery, source from nearby farms and use packaging you can recycle at home.', 'Teslimattan bir gün önce pişirip paketliyor, yakın çiftliklerden tedarik ediyor ve evde geri dönüştürebileceğiniz ambalaj kullanıyoruz.'),
      steps: [copy('Pick your plan', 'Planınızı seçin'), copy("Choose this week's meals", 'Bu haftanın yemeklerini seçin'), copy('Open the door', 'Kapıyı açın')],
      ctaTitle: copy('Try your first week', 'İlk haftanızı deneyin'),
      ctaCopy: copy('No commitment: keep going only if it makes life easier.', 'Taahhüt yok: yalnızca hayatınızı kolaylaştırıyorsa devam edin.'),
      footer: copy('Fresh food, delivered on your schedule.', 'Programınıza göre teslim edilen taze yemek.'),
      stats: [['20+', copy('New dishes a month', 'Ayda yeni tarif')], ['2', copy('Delivery days a week', 'Haftalık teslimat günü')], [copy('100%', '%100'), copy('Recyclable packaging', 'Geri dönüştürülebilir ambalaj')]],
      quote: {
        text: copy('I stopped wondering what to cook on Tuesdays.', 'Salı akşamları ne pişireceğimi düşünmeyi bıraktım.'),
        author: copy('Subscriber for a year', 'Bir yıllık abone'),
      },
    }),
    variants: [
      starter('meal-prep', 'mint', 'compare', copy('Meal Prep', 'Hazır Öğün'), hero(
        'Balanced macros · ready in 3 minutes', 'Dengeli makrolar · 3 dakikada hazır',
        'A week of lunches, sorted on Sunday.', 'Bir haftalık öğle yemeği, Pazar günü hazır.',
        'Chef-cooked meals with the nutrition on the label, delivered chilled twice a week.', 'Besin değerleri etiketinde, şef elinden çıkmış yemekler; haftada iki kez soğuk zincirle teslim.')),
      starter('grocery-box', 'forest', 'catalog', copy('Grocery Box', 'Market Kutusu'), hero(
        'Farm to door in 24 hours', 'Çiftlikten kapıya 24 saatte',
        'Your weekly shop, picked by people who know produce.', 'Haftalık alışverişiniz, ürünü iyi tanıyan ellerden.',
        'Fruit, vegetables, eggs and bread from local growers, packed the morning it arrives.', 'Yerel üreticilerden meyve, sebze, yumurta ve ekmek; geldiği sabah paketlenir.')),
      starter('meal-kit', 'sunset', 'stack', copy('Meal Kit', 'Tarif Kutusu'), hero(
        'Recipes in 30 minutes', '30 dakikalık tarifler',
        'Cook something new tonight, without the planning.', 'Planlama derdi olmadan bu akşam yeni bir şey pişirin.',
        'Pre-measured ingredients and step-by-step cards that make weeknight cooking fun again.', 'Ölçülmüş malzemeler ve adım adım kartlarla hafta içi yemek yapmak yeniden keyifli.')),
      starter('juice-delivery', 'citrus', 'bento', copy('Juice Delivery', 'Taze Meyve Suyu'), hero(
        'Cold pressed this morning', 'Bu sabah soğuk sıkıldı',
        'Bright, cold-pressed and on your doorstep by eight.', 'Canlı, soğuk sıkım ve sabah sekizde kapınızda.',
        'Juices and smoothies pressed daily from whole fruit and vegetables, nothing added.', 'Bütün meyve ve sebzelerden her gün sıkılan, katkısız meyve suları ve smoothieler.')),
      starter('office-lunch', 'steel', 'appshell', copy('Office Lunch', 'Ofis Yemeği'), hero(
        'Team lunches, one invoice', 'Ekip yemekleri, tek fatura',
        'Lunch for the whole team, without the spreadsheet.', 'Tablo tutmadan bütün ekibe öğle yemeği.',
        'Everyone picks their own meal, we deliver together and send one clear invoice each month.', 'Herkes kendi yemeğini seçer, biz birlikte teslim eder ve her ay tek net fatura göndeririz.')),
      starter('bread-subscription', 'sand', 'solo', copy('Bread Subscription', 'Ekmek Aboneliği'), hero(
        'Fresh loaves, twice a week', 'Haftada iki kez taze ekmek',
        'Warm bread on the doorstep before breakfast.', 'Kahvaltıdan önce kapınızda sıcak ekmek.',
        'Pick your loaves once and wake up to them every Tuesday and Friday.', 'Ekmeklerinizi bir kez seçin, her Salı ve Cuma sabahı kapınızda bulun.')),
      starter('organic-box', 'olive', 'editorial', copy('Organic Veg Box', 'Organik Sebze Kutusu'), hero(
        'Certified organic · seasonal only', 'Sertifikalı organik · yalnızca mevsiminde',
        'Whatever the field gave us this week.', 'Tarla bu hafta ne verdiyse o.',
        'A mixed box of organic vegetables, with recipes for the ones you have never cooked.', 'Karışık organik sebze kutusu; hiç pişirmediğiniz sebzeler için tarif kartlarıyla.')),
      starter('fresh-pet-food', 'bubble', 'onepage', copy('Fresh Pet Food', 'Taze Mama Aboneliği'), hero(
        'Portioned for your pet', 'Evcil dostunuza göre porsiyon',
        'Real food for dogs and cats, delivered monthly.', 'Köpek ve kediler için gerçek mama, her ay kapınızda.',
        "Recipes made with vets, portioned to your pet's weight and delivered frozen.", 'Veterinerlerle hazırlanan tarifler; evcil dostunuzun kilosuna göre porsiyonlanır, donuk teslim edilir.')),
      starter('flower-delivery', 'rose', 'lookbook', copy('Flower Delivery', 'Çiçek Teslimatı'), hero(
        'Same-day delivery in the city', 'Şehir içi aynı gün teslimat',
        'Seasonal flowers, arranged this morning.', 'Bu sabah hazırlanan mevsim çiçekleri.',
        'Hand-tied bouquets and weekly subscriptions from a florist who buys at dawn.', 'Şafakta alışveriş yapan bir çiçekçiden elde bağlanmış buketler ve haftalık abonelikler.')),
      starter('night-kitchen', 'midnight', 'poster', copy('Late-Night Kitchen', 'Gece Mutfağı'), hero(
        'Delivering until 3 am', "Gece 3'e kadar teslimat",
        'Hungry after midnight? We are still cooking.', 'Gece yarısından sonra acıktınız mı? Biz hâlâ pişiriyoruz.',
        'Comfort food cooked to order and delivered hot, long after other kitchens close.', 'Diğer mutfaklar kapandıktan çok sonra siparişe göre pişirilip sıcak teslim edilen doyurucu yemekler.')),
    ],
  },
  {
    id: 'farm', siteCategory: 'business', icon: '🌾', group: 'food',
    name: copy('Farms & Gardens', 'Çiftlik ve Bahçeler'),
    desc: copy('Farms, nurseries, orchards and growers who sell direct.', 'Doğrudan satış yapan çiftlikler, fidanlıklar, meyve bahçeleri ve üreticiler.'),
    profile: profile({
      nav: [copy('From the farm', 'Çiftlikten'), copy('How we grow', 'Nasıl yetiştiriyoruz'), copy('Visit us', 'Bizi ziyaret edin')],
      badge: copy('Grown without shortcuts', 'Kestirme yollara başvurmadan yetiştirildi'),
      title: copy('Food and plants grown with patience.', 'Sabırla yetiştirilen gıda ve bitkiler.'),
      lead: copy('Healthy soil, honest seasons and a farm gate that is open to visitors most weekends.', 'Sağlıklı toprak, dürüst mevsimler ve çoğu hafta sonu ziyaretçilere açık bir çiftlik kapısı.'),
      cta: copy('See what is ready', 'Neyin hazır olduğunu görün'),
      sectionTitle: copy('Ready this season', 'Bu mevsim hazır'),
      sectionLead: copy('What is being picked, potted or packed right now.', 'Şu anda toplanan, saksılanan ya da paketlenenler.'),
      items: [
        item('Harvest boxes', 'Hasat kutuları', 'A weekly share of whatever is ripe, straight from the field.', 'Tarladan doğrudan, olgunlaşan ne varsa haftalık bir pay.'),
        item('Farm shop', 'Çiftlik dükkânı', 'Eggs, preserves, flour and plants, sold at the gate.', 'Kapıda satılan yumurta, reçel, un ve bitkiler.'),
        item('Farm days', 'Çiftlik günleri', 'Pick-your-own mornings, workshops and a long-table lunch.', 'Kendin topla sabahları, atölyeler ve uzun masada öğle yemekleri.'),
      ],
      storyTitle: copy('Soil first, everything else follows', 'Önce toprak, gerisi arkasından gelir'),
      story: copy('We rotate crops, compost everything we can and let the land rest when it needs to. The taste is the result.', 'Ürünleri dönüşümlü eker, elimizden gelen her şeyi kompost yapar ve toprak ihtiyaç duyduğunda dinlenmesine izin veririz. Lezzet bunun sonucudur.'),
      steps: [copy('See what is in season', 'Mevsiminde olanı görün'), copy('Order or plan a visit', 'Sipariş verin ya da ziyaret planlayın'), copy('Taste the difference', 'Farkı tadın')],
      ctaTitle: copy('Come and see the farm', 'Gelin, çiftliği görün'),
      ctaCopy: copy('The gate is open on Saturdays. Write ahead if you are bringing a group.', 'Kapımız Cumartesi günleri açık. Grupla geliyorsanız önceden yazın.'),
      footer: copy('A working farm, open to visitors.', 'Ziyaretçilere açık, üretim yapan bir çiftlik.'),
      stats: [['40', copy('Hectares', 'Hektar')], ['60+', copy('Crops a year', 'Yıllık ürün çeşidi')], ['3', copy('Generations', 'Kuşak')]],
      quote: {
        text: copy('The tomatoes taste the way I remember them from childhood.', 'Domatesler çocukluğumdan hatırladığım tadı taşıyor.'),
        author: copy('Harvest box member', 'Hasat kutusu üyesi'),
      },
    }),
    variants: [
      starter('organic-farm', 'forest', 'editorial', copy('Organic Farm', 'Organik Çiftlik'), hero(
        'Certified organic since 2009', "2009'dan beri sertifikalı organik",
        'Vegetables grown in living soil.', 'Canlı toprakta yetişen sebzeler.',
        'Forty crops a year, grown without synthetic sprays and sold within a day of picking.', 'Sentetik ilaç kullanılmadan yetiştirilen, toplandıktan sonraki bir gün içinde satılan yılda kırk çeşit ürün.')),
      starter('harvest-share', 'olive', 'compare', copy('Harvest Share', 'Hasat Ortaklığı'), hero(
        'Community supported agriculture', 'Topluluk destekli tarım',
        'Share the season with the people who grow it.', 'Mevsimi, onu yetiştirenlerle paylaşın.',
        'Pay for the season upfront and collect a box of the harvest every week.', 'Sezonun bedelini baştan ödeyin, her hafta bir kutu hasat alın.')),
      starter('garden-centre', 'mint', 'directory', copy('Garden Centre', 'Fidanlık'), hero(
        'Plants grown on site', 'Bitkiler kendi fidanlığımızda',
        'Plants that already know your climate.', 'İklimini zaten tanıyan bitkiler.',
        'Perennials, fruit trees and herbs raised here, plus advice on where to put them.', 'Burada yetiştirilen çok yıllıklar, meyve ağaçları ve aromatik bitkiler; nereye dikileceklerine dair tavsiyeyle.')),
      starter('vineyard-estate', 'cocoa', 'showcase', copy('Vineyard Estate', 'Bağ Evi'), hero(
        'Harvest visits in September', 'Eylülde hasat ziyaretleri',
        'Walk the rows, then taste the vintage.', 'Asma sıraları arasında yürüyün, sonra rekolteyi tadın.',
        'Guided vineyard walks, cellar tastings and a harvest week you can join.', 'Rehberli bağ yürüyüşleri, mahzen tadımları ve katılabileceğiniz bir hasat haftası.')),
      starter('beekeeper', 'citrus', 'letter', copy('Beekeeper', 'Arıcı'), hero(
        'Forty hives on the hillside', 'Yamaçta kırk kovan',
        'Notes from a year with the bees.', 'Arılarla geçen bir yıldan notlar.',
        'Honey, beeswax and hive visits from a small apiary that works with the seasons.', 'Mevsimlerle çalışan küçük bir arılıktan bal, balmumu ve kovan ziyaretleri.')),
      starter('flower-farm', 'rose', 'lookbook', copy('Flower Farm', 'Çiçek Çiftliği'), hero(
        'Cut flowers, grown here, not flown in', 'Uçakla gelmeyen, burada yetişen kesme çiçekler',
        'Buckets of flowers, cut this morning.', 'Bu sabah kesilmiş kova kova çiçek.',
        'Seasonal stems for florists, weddings and anyone who wants the real thing.', 'Çiçekçiler, düğünler ve gerçeğini isteyen herkes için mevsim çiçekleri.')),
      starter('farm-stay', 'sand', 'booking', copy('Farm Stay', 'Çiftlik Evi Konaklaması'), hero(
        'Three rooms · breakfast from the farm', 'Üç oda · çiftlikten kahvaltı',
        'Wake up to roosters instead of traffic.', 'Trafik yerine horoz sesiyle uyanın.',
        'Stay on a working farm, help with the morning rounds and eat what grows outside.', 'Üretim yapan bir çiftlikte kalın, sabah işlerine yardım edin ve dışarıda yetişeni yiyin.')),
      starter('orchard', 'terra', 'bento', copy('Orchard', 'Meyve Bahçesi'), hero(
        'Pick your own · June to October', 'Kendin topla · Haziran–Ekim',
        'Cherries, apples and a ladder waiting for you.', 'Kirazlar, elmalar ve sizi bekleyen bir merdiven.',
        'Old varieties, pick-your-own weekends and fresh juice pressed in the barn.', 'Eski çeşitler, kendin topla hafta sonları ve ahırda sıkılan taze meyve suyu.')),
      starter('microgreens', 'lemon', 'solo', copy('Microgreens', 'Mikro Filiz'), hero(
        'Grown indoors · harvested to order', 'İç mekânda yetişir · siparişe göre hasat',
        'Tiny greens with a lot of flavour.', 'Küçücük ama lezzet dolu yeşillikler.',
        'Pea shoots, radish and sunflower greens for chefs and home cooks, cut the day they ship.', 'Şefler ve evde yemek yapanlar için bezelye, turp ve ayçiçeği filizleri; gönderildiği gün kesilir.')),
      starter('smart-farming', 'arctic', 'appshell', copy('Smart Farming', 'Akıllı Tarım'), hero(
        'Sensors · irrigation · yield data', 'Sensörler · sulama · verim verisi',
        'Know what every field needs before it asks.', 'Her tarlanın neye ihtiyacı olduğunu o sormadan bilin.',
        'Soil sensors and simple dashboards that help growers water less and harvest more.', 'Üreticilerin daha az sulayıp daha çok hasat etmesine yardım eden toprak sensörleri ve sade paneller.')),
    ],
  },
  {
    id: 'outdoor', siteCategory: 'business', icon: '🧗', group: 'food',
    name: copy('Tours & Adventures', 'Turlar ve Macera'),
    desc: copy('Guided tours, outdoor activities and small-group adventures.', 'Rehberli turlar, açık hava aktiviteleri ve küçük grup maceraları.'),
    profile: profile({
      nav: [copy('Trips', 'Turlar'), copy('Safety first', 'Önce güvenlik'), copy('Book a trip', 'Tur ayırt')],
      badge: copy('Small groups · certified guides', 'Küçük gruplar · sertifikalı rehberler'),
      title: copy('Get outside with people who know the way.', 'Yolu bilen insanlarla dışarı çıkın.'),
      lead: copy('Guided days and weekends outdoors, planned so you can focus on the view instead of the logistics.', 'Lojistik yerine manzaraya odaklanabilmeniz için planlanmış rehberli günler ve hafta sonları.'),
      cta: copy('Find a trip', 'Tur bul'),
      sectionTitle: copy('Choose your adventure', 'Maceranızı seçin'),
      sectionLead: copy('From an easy first outing to a full weekend in the wild.', 'Kolay bir ilk çıkıştan doğada geçen koca bir hafta sonuna kadar.'),
      items: [
        item('Half-day outings', 'Yarım günlük çıkışlar', 'A gentle introduction with all the gear included.', 'Tüm ekipmanın dahil olduğu nazik bir başlangıç.'),
        item('Full-day trips', 'Tam günlük turlar', 'A longer route, a packed lunch and a proper sense of achievement.', 'Daha uzun bir rota, yanınıza alınan öğle yemeği ve gerçek bir başarı duygusu.'),
        item('Weekend expeditions', 'Hafta sonu keşifleri', 'Two days outdoors with camp, meals and guiding sorted.', 'Kamp, yemek ve rehberliği ayarlanmış, doğada iki gün.'),
      ],
      storyTitle: copy('Adventure, carefully planned', 'Özenle planlanmış macera'),
      story: copy('Our guides are certified, our equipment is checked before every trip and we always have a plan B for the weather.', 'Rehberlerimiz sertifikalıdır, ekipmanımız her turdan önce kontrol edilir ve hava için her zaman bir B planımız vardır.'),
      steps: [copy('Pick a date and level', 'Tarih ve seviye seçin'), copy('Get your kit list', 'Ekipman listenizi alın'), copy('Meet your guide', 'Rehberinizle buluşun')],
      ctaTitle: copy('Your next weekend could look like this', 'Bir sonraki hafta sonunuz böyle olabilir'),
      ctaCopy: copy('Tell us your dates and experience and we will suggest the right trip.', 'Tarihlerinizi ve deneyiminizi söyleyin; size uygun turu önerelim.'),
      footer: copy('Guided outdoor adventures for every level.', 'Her seviyeye uygun rehberli açık hava maceraları.'),
      stats: [['12', copy('Years guiding', 'Yıllık rehberlik')], ['8', copy('Guests per group, at most', 'Grup başına en fazla misafir')], ['4.9', copy('Average review', 'Ortalama yorum puanı')]],
      quote: {
        text: copy('I came for the view and left with a new hobby.', 'Manzara için geldim, yeni bir hobiyle ayrıldım.'),
        author: copy('Guest on a weekend trip', 'Hafta sonu turu misafiri'),
      },
    }),
    variants: [
      starter('hiking-tours', 'forest', 'chronicle', copy('Hiking Tours', 'Doğa Yürüyüşü Turları'), hero(
        'Lycian Way · guided sections', 'Likya Yolu · rehberli etaplar',
        'Walk the ancient coast, one bay at a time.', 'Kadim kıyıyı koy koy yürüyün.',
        'Day walks and multi-day treks with luggage transfer and village guesthouses.', 'Bagaj transferli günübirlik ve çok günlük yürüyüşler; köy pansiyonlarında konaklama.')),
      starter('diving-centre', 'ocean', 'catalog', copy('Diving Centre', 'Dalış Merkezi'), hero(
        'PADI courses · daily boat dives', 'PADI kursları · her gün tekne dalışı',
        'Clear water, calm instructors and a reef worth the early start.', 'Berrak su, sakin eğitmenler ve erken kalkmaya değer bir resif.',
        'Try a first dive, earn your certificate or join the morning boat as a certified diver.', 'İlk dalışınızı deneyin, sertifikanızı alın ya da sertifikalı dalgıç olarak sabah teknesine katılın.')),
      starter('paragliding', 'sky', 'poster', copy('Paragliding', 'Yamaç Paraşütü'), hero(
        'Tandem flights over the lagoon', 'Lagün üzerinde tandem uçuş',
        'Run, lift, and look down at the sea.', 'Koşun, havalanın ve denize yukarıdan bakın.',
        'Tandem flights with experienced pilots, photos included and no experience needed.', 'Deneyimli pilotlarla tandem uçuşlar; fotoğraflar dahil, deneyim gerekmez.')),
      starter('river-rafting', 'teal', 'stack', copy('River Rafting', 'Rafting'), hero(
        'Grade 2 to 4 rapids', '2. ile 4. derece akıntılar',
        'Paddle hard, laugh harder, get soaked.', 'Sıkı kürek çekin, daha çok gülün, sırılsıklam olun.',
        'Half-day and full-day river trips with safety briefings, wetsuits and a riverside lunch.', 'Güvenlik brifingi, dalış kıyafeti ve nehir kenarında öğle yemeğiyle yarım ve tam gün turlar.')),
      starter('balloon-rides', 'sunset', 'showcase', copy('Balloon Rides', 'Balon Turu'), hero(
        'Sunrise flights over the valleys', 'Vadiler üzerinde gün doğumu uçuşu',
        'Watch the sun come up from a thousand metres.', 'Güneşin doğuşunu bin metreden izleyin.',
        'Hotel pick-up before dawn, an hour in the air and a celebration when you land.', 'Şafaktan önce otelden alış, havada bir saat ve inişte küçük bir kutlama.')),
      starter('yacht-charter', 'navy', 'compare', copy('Yacht Charter', 'Yat Kiralama'), hero(
        'Private blue cruises', 'Özel mavi yolculuklar',
        'Your own boat, your own bays, your own pace.', 'Kendi tekneniz, kendi koylarınız, kendi temponuz.',
        'Crewed gulets and sailing yachts for families and friends, from one day to a full week.', 'Aileler ve arkadaş grupları için mürettebatlı gulet ve yelkenliler; bir günden bir haftaya.')),
      starter('bike-tours', 'lemon', 'bento', copy('Bike Tours', 'Bisiklet Turları'), hero(
        'E-bikes available', 'Elektrikli bisiklet seçeneği',
        'See more of the region on two wheels.', 'Bölgeyi iki teker üzerinde daha çok görün.',
        'Guided rides through villages and vineyards, with a support van for the uphill bits.', 'Köyler ve bağlar arasından rehberli sürüşler; yokuşlar için destek aracıyla.')),
      starter('kayak-rental', 'arctic', 'solo', copy('Kayak Rental', 'Kano Kiralama'), hero(
        'Book online, paddle in minutes', 'Online ayırtın, dakikalar içinde kürek çekin',
        'Grab a paddle and explore the coast at your own pace.', 'Bir kürek kapın, kıyıyı kendi temponuzda keşfedin.',
        'Single and double kayaks by the hour, with life jackets and a map of hidden coves.', 'Saatlik tek ve çift kişilik kanolar; can yeleği ve gizli koyların haritasıyla.')),
      starter('horse-riding', 'cocoa', 'letter', copy('Horse Riding', 'Atlı Doğa Turu'), hero(
        'Trail rides for every level', 'Her seviyeye patika sürüşleri',
        'An afternoon in the saddle, far from the road.', 'Yoldan uzakta, eyer üzerinde bir öğleden sonra.',
        'Calm horses, patient guides and forest trails that feel a world away from the city.', 'Sakin atlar, sabırlı rehberler ve şehirden bambaşka bir dünyadaymış gibi hissettiren orman patikaları.')),
      starter('ski-school', 'ink', 'onepage', copy('Ski & Snowboard School', 'Kayak ve Snowboard Okulu'), hero(
        'Lessons for kids and adults', 'Çocuk ve yetişkin dersleri',
        'From first turns to fresh powder.', 'İlk dönüşlerden taze toza kadar.',
        'Small classes, private lessons and equipment hire at the foot of the slopes.', 'Pistlerin eteğinde küçük sınıflar, özel dersler ve ekipman kiralama.')),
    ],
  },
]
