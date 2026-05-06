import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Build from './models/Build.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('✗ MONGO_URI not set in server/.env — add it first');
  process.exit(1);
}

const USERS = [
  {
    name: 'Danish Nadeem',
    email: 'danish@patron.dev',
    password: 'patron123',
    role: 'user',
    bio: 'Deadlock enthusiast. Main: Seven.',
    avatar: '',
  },
  {
    name: 'Admin',
    email: 'admin@patron.dev',
    password: 'admin123',
    role: 'admin',
    bio: 'Platform administrator.',
    avatar: '',
  },
];

const DEMO_BUILDS = (authorId) => [
  {
    author: authorId,
    title: 'Seven Storm Build — Full Team Fight',
    hero: { id: 1, name: 'Seven', images: { portrait: '' } },
    items: [
      { id: 'i1', name: 'Kinetic Dash',    cost: 500,  slot: 'weapon',   tier: 1 },
      { id: 'i2', name: 'Basic Magazine',  cost: 500,  slot: 'weapon',   tier: 1 },
      { id: 'i3', name: 'Extra Regen',     cost: 500,  slot: 'vitality', tier: 1 },
      { id: 'i4', name: 'Mystic Reach',    cost: 500,  slot: 'spirit',   tier: 1 },
    ],
    totalCost: 2000,
    guide: {
      early: 'Focus on farming and stay safe. Grab Kinetic Dash for mobility and Basic Magazine to farm efficiently.',
      mid:   'Start rotating for objectives. Your ult becomes a strong team fight tool. Prioritize high-value targets.',
      late:  'Full team fight mode. Position at the back and rain down Storm Clouds. Peel for your carry.',
    },
    role: 'support',
    patch: '1.0',
    upvotes: [],
    downvotes: [],
  },
  {
    author: authorId,
    title: 'Bebop Carry — Max Damage Output',
    hero: { id: 2, name: 'Bebop', images: { portrait: '' } },
    items: [
      { id: 'i5', name: 'Active Reload',   cost: 500,  slot: 'weapon',   tier: 1 },
      { id: 'i6', name: 'Close Quarters',  cost: 500,  slot: 'weapon',   tier: 1 },
      { id: 'i7', name: 'Melee Lifesteal', cost: 500,  slot: 'vitality', tier: 1 },
    ],
    totalCost: 1500,
    guide: {
      early: 'Play aggressive with Hook. Land hooks on isolated targets to snowball early.',
      mid:   'Force 1v1s and use Bomb to zone enemies off objectives.',
      late:  'Your hook should one-shot squishy heroes. Focus backline.',
    },
    role: 'carry',
    patch: '1.0',
    upvotes: [],
    downvotes: [],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✓ MongoDB connected');

  // Clear existing seed accounts (by email)
  for (const u of USERS) {
    await User.deleteOne({ email: u.email });
  }

  const created = [];
  for (const u of USERS) {
    const user = await User.create(u);
    created.push(user);
    console.log(`✓ Created ${user.role}: ${user.email}  /  password: ${USERS.find(x => x.email === user.email).password}`);
  }

  // Seed 2 demo builds under the regular user
  const regularUser = created.find(u => u.role === 'user');
  await Build.deleteMany({ author: regularUser._id });
  for (const b of DEMO_BUILDS(regularUser._id)) {
    await Build.create(b);
  }
  console.log(`✓ Created ${DEMO_BUILDS(regularUser._id).length} demo builds`);

  console.log('\n── Credentials ──────────────────────────────');
  console.log('  Regular User  →  danish@patron.dev  /  patron123');
  console.log('  Admin         →  admin@patron.dev   /  admin123');
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✓ Done');
}

seed().catch(e => { console.error(e); process.exit(1); });
