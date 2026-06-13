/**
 * NLP Engine - Advanced Natural Language Understanding for Shopping Intents
 * 
 * This module provides deep intent parsing beyond simple keyword matching:
 * - Multi-slot extraction (category, urgency, quantity, occasion, brand, budget, substitution tolerance)
 * - Contextual understanding of shopping missions
 * - Budget hint extraction from natural language
 * - Temporal/urgency detection
 * - Household context inference
 */

// ─── Synonym & Taxonomy Maps ─────────────────────────────────────────────────

const CATEGORY_TAXONOMY = {
  personal_care: {
    primary: ['toothpaste', 'shampoo', 'conditioner', 'face wash', 'soap', 'lotion', 'deodorant', 'body wash', 'mouthwash', 'floss', 'razor', 'sunscreen'],
    synonyms: ['hygiene', 'grooming', 'beauty', 'skincare', 'haircare', 'oral care', 'dental'],
    related: ['bathroom', 'morning routine', 'self care']
  },
  cleaning: {
    primary: ['detergent', 'dish soap', 'disinfectant', 'bleach', 'mop', 'sponge', 'wipes', 'spray', 'cleaner'],
    synonyms: ['laundry', 'dishes', 'sanitize', 'scrub', 'polish', 'sweep'],
    related: ['house', 'kitchen', 'bathroom', 'floor', 'surface', 'stain']
  },
  household: {
    primary: ['paper towel', 'tissue', 'battery', 'trash bag', 'light bulb', 'garbage bag', 'aluminum foil', 'plastic wrap'],
    synonyms: ['essentials', 'basics', 'supplies', 'necessities'],
    related: ['home', 'run out', 'replace', 'stock up']
  },
  medicine: {
    primary: ['advil', 'tylenol', 'ibuprofen', 'acetaminophen', 'aspirin', 'thermometer', 'band aid', 'bandage', 'cough syrup', 'allergy', 'antacid'],
    synonyms: ['pharmacy', 'drug', 'medication', 'remedy', 'treatment', 'relief', 'otc'],
    related: ['pain', 'fever', 'headache', 'cold', 'flu', 'sick', 'ache', 'sore', 'stomach', 'nausea', 'injury']
  },
  snacks: {
    primary: ['chips', 'popcorn', 'cookies', 'candy', 'granola', 'crackers', 'nuts', 'pretzels', 'trail mix'],
    synonyms: ['munchies', 'nibbles', 'treats', 'bites'],
    related: ['movie', 'party', 'hungry', 'craving', 'afternoon', 'break']
  },
  pantry: {
    primary: ['coffee', 'tea', 'sugar', 'flour', 'rice', 'oil', 'cereal', 'oatmeal', 'honey', 'spice', 'salt', 'pepper'],
    synonyms: ['staples', 'basics', 'dry goods', 'breakfast'],
    related: ['morning', 'kitchen', 'cooking', 'baking']
  },
  groceries: {
    primary: ['banana', 'apple', 'vegetable', 'pasta', 'sauce', 'bread', 'milk', 'egg', 'meat', 'chicken', 'cheese', 'yogurt', 'butter', 'lettuce', 'tomato', 'onion'],
    synonyms: ['food', 'produce', 'fresh', 'ingredients', 'grocery'],
    related: ['dinner', 'cook', 'meal', 'recipe', 'lunch', 'breakfast', 'salad']
  },
  office: {
    primary: ['paper', 'printer', 'pen', 'pencil', 'stapler', 'folder', 'notebook', 'envelope', 'tape', 'marker', 'highlighter'],
    synonyms: ['stationery', 'supplies', 'desk', 'workspace'],
    related: ['work', 'meeting', 'presentation', 'school', 'study']
  },
  baby: {
    primary: ['diaper', 'wipe', 'formula', 'bottle', 'pacifier', 'bib', 'baby food', 'rash cream'],
    synonyms: ['infant', 'newborn', 'toddler', 'child'],
    related: ['nursery', 'feeding', 'changing', 'sleep', 'teething']
  },
  travel: {
    primary: ['toiletry', 'travel size', 'luggage tag', 'neck pillow', 'eye mask', 'adapter', 'portable charger'],
    synonyms: ['trip', 'vacation', 'flight', 'journey', 'getaway'],
    related: ['pack', 'airport', 'hotel', 'tsa', 'carry on', 'mini', 'portable']
  }
};

const OCCASION_RULES = {
  party: {
    triggers: ['party', 'celebration', 'birthday', 'gathering', 'get together', 'bbq', 'barbecue', 'potluck', 'housewarming'],
    boostCategories: ['snacks', 'household', 'cleaning'],
    quantityMultiplier: 2,
    urgencyDefault: 'high'
  },
  movie_night: {
    triggers: ['movie', 'film', 'netflix', 'watch', 'binge', 'streaming', 'cinema', 'show'],
    boostCategories: ['snacks'],
    quantityMultiplier: 1,
    urgencyDefault: 'medium'
  },
  travel: {
    triggers: ['travel', 'trip', 'flight', 'vacation', 'pack', 'airport', 'road trip', 'weekend away'],
    boostCategories: ['travel', 'personal_care', 'snacks'],
    quantityMultiplier: 1,
    urgencyDefault: 'high'
  },
  dinner: {
    triggers: ['dinner', 'cook', 'cooking', 'meal', 'recipe', 'lunch', 'supper', 'meal prep'],
    boostCategories: ['groceries', 'pantry'],
    quantityMultiplier: 1,
    urgencyDefault: 'medium'
  },
  emergency: {
    triggers: ['emergency', 'urgent', 'asap', 'immediately', 'right now', 'fever', 'sick', 'injured', 'bleeding'],
    boostCategories: ['medicine', 'baby'],
    quantityMultiplier: 1,
    urgencyDefault: 'high'
  },
  guests: {
    triggers: ['guest', 'visitor', 'coming over', 'hosting', 'friend coming', 'in-laws', 'company'],
    boostCategories: ['snacks', 'household', 'cleaning', 'pantry'],
    quantityMultiplier: 2,
    urgencyDefault: 'high'
  },
  office: {
    triggers: ['office', 'work from home', 'wfh', 'desk', 'meeting', 'presentation'],
    boostCategories: ['office', 'snacks', 'pantry'],
    quantityMultiplier: 1,
    urgencyDefault: 'low'
  },
  cleaning_day: {
    triggers: ['clean', 'deep clean', 'spring clean', 'tidy', 'organize', 'declutter'],
    boostCategories: ['cleaning', 'household'],
    quantityMultiplier: 1,
    urgencyDefault: 'medium'
  },
  baby_care: {
    triggers: ['baby', 'infant', 'newborn', 'diaper', 'formula'],
    boostCategories: ['baby', 'medicine'],
    quantityMultiplier: 1,
    urgencyDefault: 'high'
  },
  weekly_restock: {
    triggers: ['restock', 'stock up', 'weekly', 'running low', 'ran out', 'need more', 'replenish'],
    boostCategories: ['household', 'personal_care', 'cleaning', 'pantry'],
    quantityMultiplier: 1,
    urgencyDefault: 'medium'
  }
};

// ─── NLP Parsing Engine ──────────────────────────────────────────────────────

/**
 * Deep parse a natural language shopping request into structured slots.
 * 
 * @param {string} text - Raw user input
 * @returns {Object} Parsed intent with all extracted slots
 */
function deepParseIntent(text) {
  const lower = (text || '').toLowerCase().trim();
  const words = lower.split(/\s+/);
  const bigrams = words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);
  const trigrams = words.slice(0, -2).map((w, i) => `${w} ${words[i + 1]} ${words[i + 2]}`);
  const allNgrams = [...trigrams, ...bigrams, ...words];

  // 1. Category Detection (multi-category support)
  const categories = detectCategories(lower, allNgrams);

  // 2. Occasion Detection
  const occasion = detectOccasion(lower, allNgrams);

  // 3. Urgency Detection  
  const urgency = detectUrgency(lower, occasion);

  // 4. Quantity Extraction
  const quantity = extractQuantity(lower);

  // 5. Budget Extraction
  const budget = extractBudget(lower);

  // 6. Brand Preferences
  const brandHints = extractBrandHints(lower);

  // 7. Substitution Tolerance
  const substitutionTolerance = detectSubstitutionTolerance(lower);

  // 8. Temporal Context
  const temporal = extractTemporal(lower);

  // 9. Generate search keywords (beyond category)
  const searchKeywords = extractSearchKeywords(lower, categories);

  // 10. Confidence calculation
  const confidence = calculateConfidence(categories, occasion, searchKeywords);

  // 11. Intent label
  const intentLabel = generateIntentLabel(occasion, categories, lower);

  return {
    parsedIntent: intentLabel,
    categories,
    primaryCategory: categories[0] || 'general',
    occasion: occasion?.name || null,
    urgency,
    quantity,
    budget,
    brandHints,
    substitutionTolerance,
    temporal,
    searchKeywords,
    confidence,
    boostedCategories: occasion?.boostCategories || [],
    quantityMultiplier: occasion?.quantityMultiplier || 1
  };
}

function detectCategories(lower, ngrams) {
  const scores = {};

  for (const [category, taxonomy] of Object.entries(CATEGORY_TAXONOMY)) {
    let score = 0;

    for (const term of taxonomy.primary) {
      if (lower.includes(term)) score += 3;
    }
    for (const syn of taxonomy.synonyms) {
      if (lower.includes(syn)) score += 2;
    }
    for (const rel of taxonomy.related) {
      if (lower.includes(rel)) score += 1;
    }

    if (score > 0) scores[category] = score;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
}

function detectOccasion(lower, ngrams) {
  for (const [name, rule] of Object.entries(OCCASION_RULES)) {
    for (const trigger of rule.triggers) {
      if (lower.includes(trigger)) {
        return { name, ...rule };
      }
    }
  }
  return null;
}

function detectUrgency(lower, occasion) {
  const highSignals = ['emergency', 'urgent', 'asap', 'immediately', 'right now', 'hurry', 'quick', 'fast', 'fever', 'sick', 'now', 'tonight', 'in 30 min', 'arriving soon'];
  const lowSignals = ['tomorrow', 'later', 'next week', 'sometime', 'whenever', 'no rush', 'eventually', 'when you can'];

  if (highSignals.some(s => lower.includes(s))) return 'high';
  if (lowSignals.some(s => lower.includes(s))) return 'low';
  if (occasion?.urgencyDefault) return occasion.urgencyDefault;
  return 'medium';
}

function extractQuantity(lower) {
  // "for 4 people" / "8 guests" / "family of 5" / "2 packs"
  const patterns = [
    /(\d+)\s*(people|person|persons|guests|friends|kids|adults)/,
    /family\s*of\s*(\d+)/,
    /(\d+)\s*(pack|packs|boxes|bottles|units|items|pieces|rolls|cans)/,
    /group\s*of\s*(\d+)/
  ];

  for (const pat of patterns) {
    const match = lower.match(pat);
    if (match) return { value: parseInt(match[1]), unit: match[2] || 'people' };
  }
  return null;
}

function extractBudget(lower) {
  // "under $20" / "budget of 50" / "cheap" / "affordable" / "premium"
  const dollarMatch = lower.match(/(?:under|below|max|budget|within|up to|less than)\s*\$?\s*(\d+)/);
  if (dollarMatch) return { max: parseInt(dollarMatch[1]), preference: 'budget' };

  const rangeMatch = lower.match(/\$(\d+)\s*(?:to|-)\s*\$(\d+)/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]), preference: 'range' };

  if (['cheap', 'affordable', 'budget', 'value', 'economical', 'inexpensive'].some(w => lower.includes(w))) {
    return { preference: 'budget' };
  }
  if (['premium', 'best', 'luxury', 'high end', 'quality', 'top tier', 'organic'].some(w => lower.includes(w))) {
    return { preference: 'premium' };
  }
  return null;
}

function extractBrandHints(lower) {
  // Common brand names that might appear in queries
  const knownBrands = [
    'colgate', 'tide', 'bounty', 'advil', 'tylenol', 'doritos', 'coca-cola', 'coke', 'pepsi',
    'dawn', 'kleenex', 'duracell', 'starbucks', 'neutrogena', 'head & shoulders', 'lysol',
    'pampers', 'huggies', 'nature valley', 'orville', 'glad', 'barilla', 'rao\'s',
    'amazon basics', 'kirkland', 'great value', 'up & up'
  ];

  return knownBrands.filter(b => lower.includes(b));
}

function detectSubstitutionTolerance(lower) {
  if (['only', 'specifically', 'exact', 'must be', 'has to be', 'no substitut'].some(w => lower.includes(w))) {
    return 'none'; // User wants exact product
  }
  if (['similar', 'alternative', 'or something like', 'any brand', 'whatever', 'doesn\'t matter', 'any'].some(w => lower.includes(w))) {
    return 'high'; // User is flexible
  }
  return 'medium'; // Default: some flexibility
}

function extractTemporal(lower) {
  if (['tonight', 'this evening', 'in an hour', 'in 30 min', 'right now', 'immediately'].some(t => lower.includes(t))) {
    return { window: 'immediate', hours: 1 };
  }
  if (['today', 'this afternoon', 'before dinner', 'by tonight'].some(t => lower.includes(t))) {
    return { window: 'today', hours: 6 };
  }
  if (['tomorrow', 'by tomorrow', 'next day'].some(t => lower.includes(t))) {
    return { window: 'tomorrow', hours: 24 };
  }
  if (['this week', 'next few days', 'soon'].some(t => lower.includes(t))) {
    return { window: 'week', hours: 168 };
  }
  return { window: 'standard', hours: 48 };
}

function extractSearchKeywords(lower, detectedCategories) {
  // Remove stop words and extract meaningful terms for product matching
  const stopWords = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'the', 'a', 'an', 'is', 'are', 'was', 'be', 'have', 'has', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'want', 'get', 'got', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'from', 'with', 'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then', 'than', 'that', 'this', 'it', 'its', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'such', 'only', 'also', 'just', 'very', 'really', 'quite', 'too', 'enough', 'much', 'many', 'lot', 'lots']);

  const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  // Also extract multi-word terms
  const multiWord = [];
  const text = lower;
  for (const [, taxonomy] of Object.entries(CATEGORY_TAXONOMY)) {
    for (const term of [...taxonomy.primary, ...taxonomy.synonyms]) {
      if (term.includes(' ') && text.includes(term)) {
        multiWord.push(term);
      }
    }
  }

  return [...new Set([...multiWord, ...words])];
}

function calculateConfidence(categories, occasion, keywords) {
  let conf = 0.5; // Base

  if (categories.length > 0) conf += 0.15;
  if (categories.length > 1) conf += 0.05;
  if (occasion) conf += 0.15;
  if (keywords.length >= 3) conf += 0.1;
  if (keywords.length >= 5) conf += 0.05;

  return Math.min(0.98, conf);
}

function generateIntentLabel(occasion, categories, lower) {
  if (occasion) {
    const labels = {
      party: 'Party Supplies',
      movie_night: 'Movie Night Snacks',
      travel: 'Travel Essentials',
      dinner: 'Dinner Preparation',
      emergency: 'Emergency Supplies',
      guests: 'Guest Preparation',
      office: 'Office Supplies',
      cleaning_day: 'Cleaning Supplies',
      baby_care: 'Baby Care',
      weekly_restock: 'Weekly Restock'
    };
    return labels[occasion.name] || 'Shopping Mission';
  }

  if (categories.length > 0) {
    const catLabels = {
      personal_care: 'Personal Care Shopping',
      cleaning: 'Cleaning Supplies',
      household: 'Household Essentials',
      medicine: 'Health & Medicine',
      snacks: 'Snacks & Treats',
      pantry: 'Pantry Staples',
      groceries: 'Grocery Shopping',
      office: 'Office Supplies',
      baby: 'Baby Care',
      travel: 'Travel Essentials'
    };
    return catLabels[categories[0]] || 'Category Shopping';
  }

  // Fallback: use first few meaningful words
  const meaningful = lower.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  return meaningful.length ? `Shopping: ${meaningful.join(' ')}` : 'General Shopping';
}

module.exports = { deepParseIntent, CATEGORY_TAXONOMY, OCCASION_RULES };
