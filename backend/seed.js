require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const RestockItem = require('./models/RestockItem');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Order = require('./models/Order');
const FeedbackEvent = require('./models/FeedbackEvent');
const IntentRequest = require('./models/IntentRequest');
const { calculateDepletion } = require('./services/restockService');

// ─── Product Catalog (24 products across all categories) ─────────────────────

const products = [
  { name: 'Colgate Total Toothpaste', category: 'personal_care', brand: 'Colgate', size: '4.8 oz', price: 4.99, originalPrice: 6.49, stock: 150, deliveryETA: '15 mins', rating: 4.7, reviewCount: 12453, image: 'https://images.unsplash.com/photo-1622372738946-62e02505fe3f?w=300&h=300&fit=crop', description: 'Advanced whitening toothpaste with fluoride protection.', tags: ['toothpaste', 'personal_care', 'dental', 'whitening'], isPrime: true, avgLifespanDays: 25 },
  { name: 'Tide Original Liquid Detergent', category: 'cleaning', brand: 'Tide', size: '92 oz', price: 12.97, originalPrice: 15.99, stock: 45, deliveryETA: '30 mins', rating: 4.6, reviewCount: 8921, image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&h=300&fit=crop', description: 'HE compatible laundry detergent for all machines.', tags: ['detergent', 'cleaning', 'laundry'], isPrime: true, avgLifespanDays: 35 },
  { name: 'Bounty Select-A-Size Paper Towels', category: 'household', brand: 'Bounty', size: '6 rolls', price: 8.49, originalPrice: 10.99, stock: 80, deliveryETA: '25 mins', rating: 4.8, reviewCount: 15632, image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop', description: '2x more absorbent paper towels.', tags: ['paper', 'household', 'towels', 'kitchen'], isPrime: true, avgLifespanDays: 20 },
  { name: 'Advil Liqui-Gels 200mg', category: 'medicine', brand: 'Advil', size: '80 count', price: 9.99, originalPrice: 12.49, stock: 200, deliveryETA: '10 mins', rating: 4.5, reviewCount: 6789, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop', description: 'Fast pain relief for headaches and fever.', tags: ['medicine', 'pain', 'fever', 'headache'], isPrime: true, avgLifespanDays: 90 },
  { name: 'Doritos Nacho Cheese', category: 'snacks', brand: 'Doritos', size: '9.25 oz', price: 4.29, originalPrice: 4.99, stock: 60, deliveryETA: '20 mins', rating: 4.6, reviewCount: 23451, image: 'https://images.unsplash.com/photo-1613919113640-cb118fafea25?w=300&h=300&fit=crop', description: 'Bold nacho cheese flavored tortilla chips.', tags: ['snacks', 'chips', 'party', 'movie'], isPrime: true, avgLifespanDays: 7 },
  { name: 'Braun Digital Thermometer', category: 'medicine', brand: 'Braun', size: '1 unit', price: 14.99, originalPrice: 19.99, stock: 30, deliveryETA: '15 mins', rating: 4.4, reviewCount: 3421, image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=300&h=300&fit=crop', description: 'Fast and accurate digital thermometer.', tags: ['thermometer', 'medicine', 'baby', 'fever'], isPrime: true, avgLifespanDays: 365 },
  { name: 'Orville Redenbacher Popcorn', category: 'snacks', brand: 'Orville', size: '3 pack', price: 3.49, originalPrice: 4.29, stock: 100, deliveryETA: '20 mins', rating: 4.7, reviewCount: 9876, image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=300&h=300&fit=crop', description: 'Butter microwave popcorn for movie nights.', tags: ['popcorn', 'snacks', 'movie', 'butter'], isPrime: true, avgLifespanDays: 14 },
  { name: 'Coca-Cola 12-Pack', category: 'snacks', brand: 'Coca-Cola', size: '12 cans', price: 6.99, originalPrice: 8.49, stock: 50, deliveryETA: '20 mins', rating: 4.8, reviewCount: 45678, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&h=300&fit=crop', description: 'Classic Coca-Cola 12-pack cans.', tags: ['soda', 'snacks', 'drinks', 'party'], isPrime: true, avgLifespanDays: 10 },
  { name: 'Dawn Ultra Dish Soap', category: 'cleaning', brand: 'Dawn', size: '19.4 oz', price: 3.97, originalPrice: 4.97, stock: 120, deliveryETA: '25 mins', rating: 4.7, reviewCount: 18932, image: 'https://images.unsplash.com/photo-1563453392219-991e9b4b2b0a?w=300&h=300&fit=crop', description: 'Cuts through grease 2x faster.', tags: ['soap', 'cleaning', 'dish', 'kitchen'], isPrime: true, avgLifespanDays: 30 },
  { name: 'Kleenex Ultra Soft Tissues', category: 'household', brand: 'Kleenex', size: '4 boxes', price: 5.99, originalPrice: 7.49, stock: 90, deliveryETA: '25 mins', rating: 4.6, reviewCount: 7654, image: 'https://images.unsplash.com/photo-1585435557343-3b5930311d87?w=300&h=300&fit=crop', description: 'Ultra soft facial tissues, 4 cube boxes.', tags: ['tissues', 'household', 'soft'], isPrime: true, avgLifespanDays: 18 },
  { name: 'Duracell AA Batteries 8-Pack', category: 'household', brand: 'Duracell', size: '8 count', price: 7.49, originalPrice: 9.99, stock: 75, deliveryETA: '30 mins', rating: 4.5, reviewCount: 11234, image: 'https://images.unsplash.com/photo-1609091839311-9d67040c2f73?w=300&h=300&fit=crop', description: 'Long-lasting alkaline AA batteries.', tags: ['batteries', 'household', 'electronics'], isPrime: true, avgLifespanDays: 60 },
  { name: 'Starbucks Pike Place Roast', category: 'pantry', brand: 'Starbucks', size: '12 oz', price: 9.97, originalPrice: 11.97, stock: 55, deliveryETA: '30 mins', rating: 4.6, reviewCount: 5432, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55c?w=300&h=300&fit=crop', description: 'Medium roast ground coffee.', tags: ['coffee', 'pantry', 'breakfast', 'morning'], isPrime: true, avgLifespanDays: 21 },
  { name: 'HP Printer Paper 500 Sheets', category: 'office', brand: 'HP', size: '500 sheets', price: 6.49, originalPrice: 8.99, stock: 40, deliveryETA: '35 mins', rating: 4.4, reviewCount: 3210, image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=300&fit=crop', description: 'Premium multipurpose copy paper.', tags: ['paper', 'office', 'printer'], isPrime: true, avgLifespanDays: 45 },
  { name: 'Pampers Baby Wipes', category: 'baby', brand: 'Pampers', size: '72 count', price: 3.97, originalPrice: 4.97, stock: 85, deliveryETA: '15 mins', rating: 4.7, reviewCount: 21098, image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=300&h=300&fit=crop', description: 'Sensitive baby wipes, fragrance free.', tags: ['baby', 'wipes', 'sensitive'], isPrime: true, avgLifespanDays: 14 },
  { name: "Children's Tylenol", category: 'baby', brand: 'Tylenol', size: '4 oz', price: 8.49, originalPrice: 10.49, stock: 65, deliveryETA: '10 mins', rating: 4.6, reviewCount: 8765, image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f326?w=300&h=300&fit=crop', description: 'Pain and fever relief for children.', tags: ['baby', 'medicine', 'fever', 'pain'], isPrime: true, avgLifespanDays: 120 },
  { name: 'Nature Valley Granola Bars', category: 'snacks', brand: 'Nature Valley', size: '12 bars', price: 4.97, originalPrice: 5.97, stock: 70, deliveryETA: '25 mins', rating: 4.3, reviewCount: 6543, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?w=300&h=300&fit=crop', description: 'Oats and honey crunchy granola bars.', tags: ['snacks', 'office', 'granola', 'healthy'], isPrime: true, avgLifespanDays: 14 },
  { name: 'Lysol Disinfectant Spray', category: 'cleaning', brand: 'Lysol', size: '19 oz', price: 5.97, originalPrice: 7.49, stock: 95, deliveryETA: '25 mins', rating: 4.5, reviewCount: 14321, image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=300&h=300&fit=crop', description: 'Kills 99.9% of viruses and bacteria.', tags: ['cleaning', 'disinfectant', 'spray', 'sanitize'], isPrime: true, avgLifespanDays: 40 },
  { name: 'Neutrogena Face Wash', category: 'personal_care', brand: 'Neutrogena', size: '6 oz', price: 7.99, originalPrice: 9.99, stock: 60, deliveryETA: '20 mins', rating: 4.6, reviewCount: 9876, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop', description: 'Oil-free acne face wash.', tags: ['face wash', 'personal_care', 'skincare', 'acne'], isPrime: true, avgLifespanDays: 28 },
  { name: 'Head & Shoulders Shampoo', category: 'personal_care', brand: 'Head & Shoulders', size: '13.5 oz', price: 6.97, originalPrice: 8.49, stock: 55, deliveryETA: '25 mins', rating: 4.5, reviewCount: 11234, image: 'https://images.unsplash.com/photo-1535585209827-a93fcddd4c02?w=300&h=300&fit=crop', description: 'Classic clean anti-dandruff shampoo.', tags: ['shampoo', 'personal_care', 'hair', 'dandruff'], isPrime: true, avgLifespanDays: 30 },
  { name: 'Glad Trash Bags 45 Count', category: 'household', brand: 'Glad', size: '45 count', price: 9.97, originalPrice: 12.49, stock: 48, deliveryETA: '30 mins', rating: 4.4, reviewCount: 5432, image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0e67?w=300&h=300&fit=crop', description: 'Drawstring kitchen trash bags.', tags: ['household', 'trash', 'garbage', 'kitchen'], isPrime: true, avgLifespanDays: 25 },
  { name: 'Organic Bananas 2 lb', category: 'groceries', brand: 'Fresh', size: '2 lb', price: 1.99, originalPrice: 2.49, stock: 200, deliveryETA: '45 mins', rating: 4.3, reviewCount: 2345, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop', description: 'Fresh organic bananas.', tags: ['groceries', 'fruit', 'cooking', 'organic', 'banana'], isPrime: false, avgLifespanDays: 5 },
  { name: 'Barilla Spaghetti Pasta', category: 'groceries', brand: 'Barilla', size: '16 oz', price: 1.49, originalPrice: 1.99, stock: 150, deliveryETA: '40 mins', rating: 4.7, reviewCount: 8765, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop', description: 'Classic Italian spaghetti pasta.', tags: ['groceries', 'pasta', 'cooking', 'dinner', 'italian'], isPrime: true, avgLifespanDays: 90 },
  { name: "Rao's Homemade Marinara", category: 'groceries', brand: "Rao's", size: '24 oz', price: 7.99, originalPrice: 9.49, stock: 35, deliveryETA: '40 mins', rating: 4.8, reviewCount: 15678, image: 'https://images.unsplash.com/photo-1625944232935-1b5e3e4b5c0e?w=300&h=300&fit=crop', description: 'Premium Italian marinara sauce.', tags: ['groceries', 'sauce', 'cooking', 'dinner', 'italian', 'pasta'], isPrime: true, avgLifespanDays: 30 },
  { name: 'Travel Size Toiletry Kit', category: 'travel', brand: 'Amazon Basics', size: 'Kit', price: 12.99, originalPrice: 16.99, stock: 25, deliveryETA: '20 mins', rating: 4.2, reviewCount: 1234, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop', description: 'TSA-approved travel toiletry essentials.', tags: ['travel', 'toiletries', 'tsa', 'mini', 'portable'], isPrime: true, avgLifespanDays: 14 }
];

// ─── Synthetic Training Data Generator ───────────────────────────────────────

function generateSyntheticOrders(users, productDocs) {
  const orders = [];
  const now = Date.now();

  for (const user of users) {
    // Each user gets 5-15 past orders
    const numOrders = 5 + Math.floor(Math.random() * 11);
    for (let i = 0; i < numOrders; i++) {
      const daysAgo = Math.floor(Math.random() * 90) + 1;
      const orderDate = new Date(now - daysAgo * 86400000);
      const numItems = 1 + Math.floor(Math.random() * 4);
      const selectedProducts = shuffleArray([...productDocs]).slice(0, numItems);

      const items = selectedProducts.map(p => ({
        productId: p._id,
        name: p.name,
        quantity: 1 + Math.floor(Math.random() * 2),
        price: p.price,
        image: p.image
      }));

      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

      orders.push({
        userId: user._id,
        items,
        total,
        address: user.addresses?.[0] || { street: '123 Main St', city: 'Seattle', state: 'WA', zip: '98101' },
        deliverySlot: 'Express - Today',
        paymentMethod: 'card',
        paymentStatus: 'paid',
        fulfillmentStatus: 'delivered',
        eta: '30 mins',
        trackingSteps: [
          { label: 'Order placed', time: orderDate, completed: true },
          { label: 'Packed', time: new Date(orderDate.getTime() + 600000), completed: true },
          { label: 'Out for delivery', time: new Date(orderDate.getTime() + 1200000), completed: true },
          { label: 'Delivered', time: new Date(orderDate.getTime() + 1800000), completed: true }
        ],
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }
  }
  return orders;
}

function generateSyntheticFeedback(users, intents) {
  const feedbacks = [];
  for (const intent of intents) {
    // 70% accept rate
    feedbacks.push({
      userId: intent.userId,
      type: 'intent',
      accepted: Math.random() > 0.3,
      intentId: intent._id,
      createdAt: intent.createdAt
    });
  }
  return feedbacks;
}

function generateSyntheticIntents(users, productDocs) {
  const intents = [];
  const prompts = [
    { text: 'Movie night snacks for 4', intent: 'Movie Night Snacks', category: 'snacks', urgency: 'medium' },
    { text: 'Baby has a fever, need medicine now', intent: 'Health Emergency', category: 'medicine', urgency: 'high' },
    { text: 'Travel essentials for tomorrow', intent: 'Travel Essentials', category: 'travel', urgency: 'high' },
    { text: 'Deep cleaning the house today', intent: 'Cleaning Supplies', category: 'cleaning', urgency: 'medium' },
    { text: 'Party for 8 people tonight', intent: 'Party Supplies', category: 'snacks', urgency: 'high' },
    { text: 'Weekly grocery run', intent: 'Grocery Shopping', category: 'groceries', urgency: 'low' },
    { text: 'Need coffee urgently', intent: 'Pantry Staples', category: 'pantry', urgency: 'high' },
    { text: 'Office supplies for the week', intent: 'Office Supplies', category: 'office', urgency: 'low' },
    { text: 'Running low on toothpaste and shampoo', intent: 'Personal Care Restock', category: 'personal_care', urgency: 'medium' },
    { text: 'Dinner ingredients for pasta', intent: 'Dinner Preparation', category: 'groceries', urgency: 'medium' }
  ];

  for (const user of users) {
    const numIntents = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numIntents; i++) {
      const template = prompts[Math.floor(Math.random() * prompts.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const catProducts = productDocs.filter(p => p.category === template.category);
      const recommended = shuffleArray(catProducts).slice(0, Math.min(5, catProducts.length));

      intents.push({
        userId: user._id,
        rawText: template.text,
        parsedIntent: template.intent,
        category: template.category,
        urgency: template.urgency,
        quantity: Math.ceil(Math.random() * 4),
        confidence: 0.75 + Math.random() * 0.2,
        occasion: template.intent,
        recommendedProductIds: recommended.map(p => p._id),
        createdAt: new Date(Date.now() - daysAgo * 86400000)
      });
    }
  }
  return intents;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/amazon_now');
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    Product.deleteMany({}),
    RestockItem.deleteMany({}),
    Notification.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    FeedbackEvent.deleteMany({}),
    IntentRequest.deleteMany({})
  ]);

  // Seed Products
  const inserted = await Product.insertMany(products);
  console.log(`✓ Seeded ${inserted.length} products`);

  // Seed Users
  const adminPw = await bcrypt.hash('admin123', 10);
  const userPw = await bcrypt.hash('test123', 10);
  const users = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@amazon.com',
      password: adminPw,
      preferences: { savedBrands: ['Colgate', 'Tide', 'Starbucks', 'Doritos'], dietary: [], allergies: [], budget: 200, deliveryDefault: 'express' },
      household: { size: 4, usageLevel: 'high' },
      monthlyBudget: 200,
      addresses: [{ label: 'Home', street: '123 Admin St', city: 'Seattle', state: 'WA', zip: '98101', isDefault: true }]
    },
    {
      name: 'Test User',
      email: 'user@test.com',
      password: userPw,
      preferences: { savedBrands: ['Bounty', 'Doritos', 'Coca-Cola'], dietary: [], allergies: [], budget: 100, deliveryDefault: 'express' },
      household: { size: 2, usageLevel: 'medium' },
      monthlyBudget: 150,
      addresses: [{ label: 'Home', street: '456 User Ave', city: 'Portland', state: 'OR', zip: '97201', isDefault: true }]
    }
  ]);
  console.log('✓ Seeded users (admin@amazon.com/admin123, user@test.com/test123)');

  // Seed Restock Items (with ML predictions)
  const toothpaste = inserted.find(p => p.name.includes('Toothpaste'));
  const detergent = inserted.find(p => p.name.includes('Detergent'));
  const faceWash = inserted.find(p => p.name.includes('Face Wash'));
  const coffee = inserted.find(p => p.name.includes('Starbucks'));
  const paperTowels = inserted.find(p => p.name.includes('Paper Towels'));

  const household = { size: 4, usageLevel: 'high' };
  const restockData = [
    {
      userId: users[0]._id,
      productId: toothpaste._id,
      purchaseDate: new Date(Date.now() - 20 * 86400000),
      quantity: 1,
      category: 'personal_care',
      ...calculateDepletion(toothpaste, household, new Date(Date.now() - 20 * 86400000)),
      feedbackHistory: [
        { type: 'on_track', date: new Date(Date.now() - 10 * 86400000) }
      ]
    },
    {
      userId: users[0]._id,
      productId: detergent._id,
      purchaseDate: new Date(Date.now() - 33 * 86400000),
      quantity: 1,
      category: 'cleaning',
      ...calculateDepletion(detergent, household, new Date(Date.now() - 33 * 86400000)),
      feedbackHistory: [
        { type: 'finished_early', date: new Date(Date.now() - 5 * 86400000) }
      ]
    },
    {
      userId: users[0]._id,
      productId: faceWash._id,
      purchaseDate: new Date(Date.now() - 22 * 86400000),
      quantity: 1,
      category: 'personal_care',
      ...calculateDepletion(faceWash, household, new Date(Date.now() - 22 * 86400000)),
      feedbackHistory: []
    },
    {
      userId: users[0]._id,
      productId: coffee._id,
      purchaseDate: new Date(Date.now() - 15 * 86400000),
      quantity: 1,
      category: 'pantry',
      ...calculateDepletion(coffee, household, new Date(Date.now() - 15 * 86400000)),
      feedbackHistory: [
        { type: 'finished_early', date: new Date(Date.now() - 3 * 86400000) },
        { type: 'finished_early', date: new Date(Date.now() - 1 * 86400000) }
      ]
    },
    {
      userId: users[0]._id,
      productId: paperTowels._id,
      purchaseDate: new Date(Date.now() - 12 * 86400000),
      quantity: 1,
      category: 'household',
      ...calculateDepletion(paperTowels, household, new Date(Date.now() - 12 * 86400000)),
      feedbackHistory: [
        { type: 'still_plenty', date: new Date(Date.now() - 2 * 86400000) }
      ]
    }
  ];
  await RestockItem.insertMany(restockData);
  console.log(`✓ Seeded ${restockData.length} restock items with ML predictions`);

  // Seed Notifications
  await Notification.insertMany([
    { userId: users[0]._id, type: 'restock', title: 'Running low on Tide Detergent', message: 'Only 2 days left based on your usage pattern. Reorder now for express delivery.', triggerTime: new Date(), status: 'active' },
    { userId: users[0]._id, type: 'sale', title: 'Coffee on sale — restock now', message: 'Starbucks Pike Place is $2 off and you\'ll need it in 3 days. Perfect time to reorder.', triggerTime: new Date(), status: 'active' },
    { userId: users[0]._id, type: 'restock', title: 'Face wash finishing soon', message: 'Based on your household of 4, Neutrogena Face Wash will run out in about 6 days.', triggerTime: new Date(Date.now() + 3 * 86400000), status: 'active' }
  ]);
  console.log('✓ Seeded smart notifications');

  // Seed Synthetic Orders (for collaborative filtering & purchase history)
  const syntheticOrders = generateSyntheticOrders(users, inserted);
  await Order.insertMany(syntheticOrders);
  console.log(`✓ Seeded ${syntheticOrders.length} synthetic orders for ML training`);

  // Seed Synthetic Intents
  const syntheticIntents = generateSyntheticIntents(users, inserted);
  const insertedIntents = await IntentRequest.insertMany(syntheticIntents);
  console.log(`✓ Seeded ${insertedIntents.length} synthetic intents for learning`);

  // Seed Synthetic Feedback
  const syntheticFeedback = generateSyntheticFeedback(users, insertedIntents);
  await FeedbackEvent.insertMany(syntheticFeedback);
  console.log(`✓ Seeded ${syntheticFeedback.length} feedback events for learning`);

  console.log('\n✅ Seed complete with synthetic training data!');
  console.log('   Accounts: admin@amazon.com/admin123, user@test.com/test123');
  console.log(`   Products: ${inserted.length}`);
  console.log(`   Orders: ${syntheticOrders.length}`);
  console.log(`   Intents: ${insertedIntents.length}`);
  console.log(`   Feedback: ${syntheticFeedback.length}`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
