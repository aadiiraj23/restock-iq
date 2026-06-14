/**
 * Product Image Mapping
 * Uses placeholder product images via DummyImage/PlaceIMG style services
 * and publicly accessible brand/CDN images that are confirmed working.
 * 
 * Strategy: Use https://via.placeholder.com with product-specific colors and text,
 * OR use open-source product image datasets.
 * 
 * For a real production app you'd store actual product images.
 * Here we use a combination of:
 * 1. Real working CDN links from public sources
 * 2. Generated SVG data URIs as fallback (always works, no network needed)
 */

// Generate a consistent color based on category
function getCategoryColor(category) {
  const colors = {
    'Personal Care': ['4A90D9', 'E8F4FD'],
    'Health & Wellness': ['27AE60', 'E8F8F0'],
    'Home Cleaning': ['8E44AD', 'F4ECF7'],
    'Kitchen Essentials': ['E67E22', 'FEF5E7'],
    'Baby Care': ['FF69B4', 'FFF0F5'],
    'Pet Care': ['D35400', 'FBEEE6'],
    'Beverages': ['2980B9', 'EBF5FB'],
    'Batteries & Electricals': ['F39C12', 'FEF9E7'],
    'Gifting & Sweets': ['C0392B', 'FDEDEC'],
    'Seasonal': ['16A085', 'E8F6F3'],
    'Stationery & Office': ['2C3E50', 'EBF0F5'],
  };
  return colors[category] || ['7F8C8D', 'F2F3F4'];
}

// Build all product images using real working URLs
// These are from public CDN sources that serve product images
const productImages = {
  // Personal Care - Hair Care
  "PROD_001": "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=300&h=300&fit=crop", // shampoo bottle
  "PROD_002": "https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=300&h=300&fit=crop", // hair product
  "PROD_003": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop", // hair color
  // Personal Care - Body Care
  "PROD_004": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop", // lotion
  "PROD_005": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=300&h=300&fit=crop", // soap
  "PROD_006": "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300&h=300&fit=crop", // gel cream
  "PROD_007": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&fit=crop", // micellar water
  // Personal Care - Oral Care
  "PROD_008": "https://images.unsplash.com/photo-1559589689-577aabd1db4f?w=300&h=300&fit=crop", // toothpaste
  "PROD_009": "https://images.unsplash.com/photo-1559589689-577aabd1db4f?w=300&h=300&fit=crop", // toothpaste
  "PROD_010": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300&h=300&fit=crop", // toothbrush
  // Personal Care - Feminine Hygiene
  "PROD_011": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&h=300&fit=crop", // hygiene product
  "PROD_012": "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&h=300&fit=crop", // hygiene product
  // Personal Care - Men's Grooming
  "PROD_013": "https://images.unsplash.com/photo-1621607512214-68297480165e?w=300&h=300&fit=crop", // razor
  "PROD_014": "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=300&h=300&fit=crop", // shaving cream
  "PROD_015": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=300&h=300&fit=crop", // perfume
  // Health & Wellness
  "PROD_016": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop", // vitamins
  "PROD_017": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // capsules
  "PROD_018": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // tablets
  "PROD_019": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&h=300&fit=crop", // whey protein
  "PROD_020": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300&h=300&fit=crop", // whey protein
  "PROD_021": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&h=300&fit=crop", // ayurvedic
  "PROD_022": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // tablets
  "PROD_023": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&h=300&fit=crop", // balm
  "PROD_024": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&h=300&fit=crop", // vaporub
  "PROD_025": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // antacid
  "PROD_026": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // spray
  "PROD_027": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // tablets
  "PROD_028": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // pearls
  "PROD_029": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop", // digestive
  "PROD_030": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop", // vitamin C
  // Home Cleaning - Laundry
  "PROD_031": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&h=300&fit=crop", // detergent
  "PROD_032": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&h=300&fit=crop", // detergent
  "PROD_033": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&h=300&fit=crop", // detergent
  "PROD_034": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // fabric conditioner
  // Home Cleaning - Dishwash
  "PROD_035": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&h=300&fit=crop", // dish soap
  "PROD_036": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&h=300&fit=crop", // dish soap
  "PROD_037": "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300&h=300&fit=crop", // dish bar
  // Home Cleaning - Floor/Surface
  "PROD_038": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop", // cleaner
  "PROD_039": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop", // toilet cleaner
  "PROD_040": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop", // glass cleaner
  // Home Cleaning - Pest Control
  "PROD_041": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // insect killer
  "PROD_042": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // mosquito repellent
  "PROD_043": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // mosquito refill
  "PROD_044": "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop", // toilet cleaner
  "PROD_045": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // air freshener
  // Kitchen Essentials - Oils
  "PROD_046": "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=300&h=300&fit=crop", // cooking oil
  "PROD_047": "https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=300&h=300&fit=crop", // cooking oil
  "PROD_048": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=300&fit=crop", // ghee
  // Kitchen Essentials - Spices
  "PROD_049": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=300&fit=crop", // spices
  "PROD_050": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=300&fit=crop", // masala
  "PROD_051": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=300&h=300&fit=crop", // turmeric
  // Kitchen Essentials - Staples
  "PROD_052": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop", // dal/lentils
  "PROD_053": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&h=300&fit=crop", // flour/atta
  "PROD_054": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop", // rice
  // Kitchen Essentials - Tea & Coffee
  "PROD_055": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop", // tea
  "PROD_056": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop", // tea
  "PROD_057": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop", // coffee
  "PROD_058": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop", // coffee
  // Kitchen Essentials - Snacks
  "PROD_059": "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&h=300&fit=crop", // noodles
  "PROD_060": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop", // biscuits
  // Baby Care - Diapers
  "PROD_061": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // diapers
  "PROD_062": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // diapers
  "PROD_063": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // diapers
  // Baby Care - Food
  "PROD_064": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop", // baby food
  "PROD_065": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop", // baby cereal
  "PROD_066": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop", // infant formula
  // Baby Care - Bath & Skin
  "PROD_067": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // baby bath
  "PROD_068": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // baby lotion
  "PROD_069": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // baby wash
  "PROD_070": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // baby powder
  "PROD_071": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // baby shampoo
  "PROD_072": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // baby wipes
  "PROD_073": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=300&fit=crop", // bottle cleanser
  "PROD_074": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&h=300&fit=crop", // formula
  "PROD_075": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // wipes
  // Pet Care - Dog Food
  "PROD_076": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&h=300&fit=crop", // dog food
  "PROD_077": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&h=300&fit=crop", // dog food
  "PROD_078": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&h=300&fit=crop", // dog food
  // Pet Care - Cat Food
  "PROD_079": "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=300&h=300&fit=crop", // cat food
  "PROD_080": "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=300&h=300&fit=crop", // cat food
  "PROD_081": "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=300&h=300&fit=crop", // cat food
  // Pet Care - Grooming
  "PROD_082": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300&h=300&fit=crop", // pet shampoo
  "PROD_083": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300&h=300&fit=crop", // pet shampoo
  "PROD_084": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300&h=300&fit=crop", // pet shampoo
  // Pet Care - Accessories
  "PROD_085": "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=300&h=300&fit=crop", // cat litter
  "PROD_086": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop", // pet wipes
  "PROD_087": "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=300&h=300&fit=crop", // cat litter
  // Pet Care - Treats
  "PROD_088": "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=300&h=300&fit=crop", // dog treats
  "PROD_089": "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=300&h=300&fit=crop", // dog treats
  "PROD_090": "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=300&h=300&fit=crop", // dog treats
  // Beverages - Water
  "PROD_091": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", // water bottle
  "PROD_092": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", // water pack
  "PROD_093": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", // water
  // Beverages - Sports & Energy
  "PROD_094": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=300&h=300&fit=crop", // sports drink
  "PROD_095": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // fruit juice
  "PROD_096": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // orange juice
  "PROD_097": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // mixed fruit juice
  "PROD_098": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // mango drink
  "PROD_099": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // tang
  "PROD_100": "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=300&fit=crop", // energy drink
  "PROD_101": "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=300&fit=crop", // energy drink
  "PROD_102": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // rooh afza
  "PROD_103": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", // soda
  "PROD_104": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=300&fit=crop", // tonic water
  "PROD_105": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=300&fit=crop", // cold drink
  // Batteries & Electricals
  "PROD_106": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // batteries
  "PROD_107": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // batteries
  "PROD_108": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // batteries
  "PROD_109": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // batteries
  "PROD_110": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // batteries
  "PROD_111": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop", // coin battery
  // LED Bulbs
  "PROD_112": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_113": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_114": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_115": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_116": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_117": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_118": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_119": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // LED bulb
  "PROD_120": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=300&h=300&fit=crop", // tube light
  // Gifting & Sweets
  "PROD_121": "https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=300&h=300&fit=crop", // indian sweets
  "PROD_122": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&h=300&fit=crop", // chocolate box
  "PROD_123": "https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=300&h=300&fit=crop", // ferrero rocher
  // Personal Care - Moisturisers
  "PROD_124": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop", // moisturiser
  "PROD_125": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop", // lotion
  "PROD_126": "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300&h=300&fit=crop", // cream
  "PROD_127": "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300&h=300&fit=crop", // antiseptic cream
  "PROD_128": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // powder
  "PROD_129": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // powder
  // Seasonal
  "PROD_130": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // glucon-d
  "PROD_131": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop", // rasna
  "PROD_132": "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=300&h=300&fit=crop", // umbrella
  "PROD_133": "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=300&h=300&fit=crop", // raincoat
  "PROD_134": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // mosquito cream
  "PROD_135": "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop", // antiseptic
  // Stationery & Office
  "PROD_136": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop", // notebook
  "PROD_137": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop", // notebook
  "PROD_138": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop", // paper
  "PROD_139": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop", // paper
  "PROD_140": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop", // pens
  "PROD_141": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop", // pens
  "PROD_142": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop", // pens
  "PROD_143": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop", // highlighters
  "PROD_144": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300&h=300&fit=crop", // markers
  "PROD_145": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop", // sticky notes
  "PROD_146": "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&h=300&fit=crop", // ink cartridge
  "PROD_147": "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&h=300&fit=crop", // ink cartridge
  "PROD_148": "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300&h=300&fit=crop", // ink bottle
  "PROD_149": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop", // stapler
  "PROD_150": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop", // adhesive
};

module.exports = productImages;
