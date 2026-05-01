// scripts/sync-knowledge-base.js
// Run: node scripts/sync-knowledge-base.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = 'https://gtpnojbbamoaznlutxap.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cG5vamJiYW1vYXpubHV0eGFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgyOTc2MywiZXhwIjoyMDg0NDA1NzYzfQ.0UeGqJVOCIw5R3vbYFtPi0B0ED1V7HKLQ_AHKjoTBmY'; // use service key, not anon
const GEMINI_API_KEY = 'AIzaSyD54GQ0wk-l02q5yuHMiYG3w699kYl-Kt8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// Rate limit: Gemini free tier = 1500 embeddings/day, ~60/min
// Add delay between batches
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function upsertChunk(content, sourceTable, sourceId, metadata) {
  const embedding = await getEmbedding(content);
  const { error } = await supabase.from('knowledge_base').upsert({
    content,
    source_table: sourceTable,
    source_id: String(sourceId),
    metadata,
    embedding,
  }, { onConflict: 'source_table,source_id' }); // add unique constraint if re-syncing
  if (error) console.error('Insert error:', error.message);
}

async function syncStates() {
  console.log('Syncing states...');
  const { data } = await supabase.from('states').select('*');
  for (const s of data) {
    const content = `State: ${s.name}. Tagline: ${s.tagline}. ${s.description} Best time to visit: ${s.best_time_to_visit}.`;
    await upsertChunk(content, 'states', s.id, { state_name: s.name, best_time: s.best_time_to_visit });
    await sleep(500);
  }
}

async function syncDistricts() {
  console.log('Syncing districts...');
  const { data } = await supabase.from('districts').select('*, states(name)');
  for (const d of data) {
    const content = `District: ${d.name} in ${d.states?.name}. ${d.description}`;
    await upsertChunk(content, 'districts', d.id, { district_name: d.name, state_name: d.states?.name });
    await sleep(500);
  }
}

async function syncAttractions() {
  console.log('Syncing attractions...');
  const { data } = await supabase.from('attractions').select('*, states(name), districts(name)');
  for (const a of data) {
    const content = [
      `Attraction: ${a.name} in ${a.city}, ${a.states?.name}.`,
      `Type: ${a.type}. Category: ${a.category}.`,
      a.short_description,
      a.description,
      `Entry fee: ${a.entry_fee === 0 ? 'Free' : '₹' + a.entry_fee}.`,
      `Estimated visit time: ${a.estimated_time_hours} hours.`,
      a.best_time_note ? `Best time: ${a.best_time_note}.` : '',
      a.guide_available ? `Guides available. Price range: ${a.guide_price_range}.` : '',
      a.is_must_visit ? 'This is a must-visit attraction.' : '',
      a.address ? `Address: ${a.address}.` : '',
    ].filter(Boolean).join(' ');
    await upsertChunk(content, 'attractions', a.id, {
      attraction_name: a.name,
      state_name: a.states?.name,
      city: a.city,
      type: a.type,
      category: a.category,
      entry_fee: a.entry_fee,
      is_must_visit: a.is_must_visit,
    });
    await sleep(500);
  }
}

async function syncAccommodations() {
  console.log('Syncing accommodations...');
  const { data } = await supabase.from('accommodations')
    .select('*, attractions(name, city, states(name))');
  for (const a of data) {
    const content = [
      `Accommodation: ${a.name}.`,
      `Type: ${a.type}. Price per night: ₹${a.price_per_night}.`,
      `Rating: ${a.rating}/5.`,
      `Distance from ${a.attractions?.name}: ${a.distance_from_attraction_km} km.`,
      `Located near ${a.attractions?.city}, ${a.attractions?.states?.name}.`,
      `Contact: ${a.contact_phone}.`,
    ].filter(Boolean).join(' ');
    await upsertChunk(content, 'accommodations', a.id, {
      accommodation_name: a.name,
      type: a.type,
      price_per_night: a.price_per_night,
      rating: a.rating,
      city: a.attractions?.city,
      state_name: a.attractions?.states?.name,
      near_attraction: a.attractions?.name,
    });
    await sleep(500);
  }
}

async function syncEvents() {
  console.log('Syncing events...');
  const { data } = await supabase.from('events').select('*, states(name)');
  for (const e of data) {
    const content = [
      `Event: ${e.name} in ${e.city_venue}, ${e.states?.name}.`,
      `Category: ${e.category}.`,
      `Dates: ${e.date_from} to ${e.date_to}.`,
      e.is_recurring ? 'This is a recurring annual event.' : '',
      e.description,
      `Entry fee: ${e.entry_fee ? '₹' + e.entry_fee : 'Free'}.`,
      e.website_url ? `Website: ${e.website_url}.` : '',
    ].filter(Boolean).join(' ');
    await upsertChunk(content, 'events', e.id, {
      event_name: e.name,
      state_name: e.states?.name,
      city_venue: e.city_venue,
      category: e.category,
      date_from: e.date_from,
      date_to: e.date_to,
      is_featured: e.is_featured,
    });
    await sleep(500);
  }
}

async function syncHospitals() {
  console.log('Syncing hospitals...');
  const { data } = await supabase.from('hospitals').select('*, states(name)');
  for (const h of data) {
    const content = [
      `Hospital: ${h.name} in ${h.city}, ${h.states?.name}.`,
      `Type: ${h.type}.`,
      `Rating: ${h.rating}/5.`,
      `Address: ${h.address}.`,
      `Contact: ${h.contact_phone}.`,
    ].filter(Boolean).join(' ');
    await upsertChunk(content, 'hospitals', h.id, {
      hospital_name: h.name,
      state_name: h.states?.name,
      city: h.city,
      type: h.type,
      rating: h.rating,
    });
    await sleep(500);
  }
}

async function syncStaticDocs() {
  console.log('Syncing static docs (FAQ, policies)...');

  // Add FAQ chunks manually or parse from your FAQ HTML
  const faqChunks = [
    { id: 'faq-1', content: 'BharatYatra is a free comprehensive India tourism platform helping travelers discover destinations, plan itineraries, explore cultural experiences, and learn about medical tourism across India.' },
    { id: 'faq-2', content: 'BharatYatra is completely free for all users. You can explore destinations, browse itineraries, and discover experiences without any charges.' },
    { id: 'faq-3', content: 'BharatYatra is designed for everyone — solo backpackers, families, honeymooners, adventure seekers, spiritual travelers, and international tourists.' },
    { id: 'faq-4', content: 'Destinations on BharatYatra include tropical beaches in Goa and the Andamans, Himalayan peaks of Ladakh and Himachal Pradesh, heritage cities like Varanasi and Jaipur, wildlife sanctuaries like Ranthambore and Jim Corbett, and spiritual retreats in Rishikesh and Tirupati.' },
    { id: 'faq-5', content: 'The best time to visit most of India is October to March. Summer (April–June) is perfect for hill stations. Monsoon (July–September) is stunning for Kerala and the Western Ghats.' },
    { id: 'faq-6', content: 'Most international travelers need a visa to visit India. India offers an e-Visa for citizens of over 160 countries, applicable online at least 4–7 days before travel.' },
    { id: 'faq-7', content: 'India is generally safe for tourists in popular destinations like Rajasthan, Kerala, Goa, and major cities when taking standard precautions.' },
    { id: 'faq-8', content: 'India is a top medical tourism destination offering cardiac surgery, orthopedic procedures, dental care, fertility treatments, and Ayurvedic wellness at a fraction of Western costs. Chennai, Mumbai, Delhi, Hyderabad, and Bengaluru are top medical tourism hubs. Kerala is renowned for Ayurveda.' },
    { id: 'faq-9', content: 'Travel for Life is BharatYatra\'s sustainability initiative promoting responsible tourism — respecting ecosystems, supporting local artisans, reducing plastic, and choosing eco-friendly accommodations.' },
    { id: 'faq-10', content: 'Colors of India on BharatYatra showcases the vibrant cultural tapestry — golden deserts of Rajasthan, lush backwaters of Kerala, blue city of Jodhpur, white salt flats of Rann of Kutch.' },
  ];

  for (const chunk of faqChunks) {
    await upsertChunk(chunk.content, 'faq', chunk.id, {});
    await sleep(500);
  }
}

async function main() {
  console.log('Starting knowledge base sync...\n');
  await syncStates();
  await syncDistricts();
  await syncAttractions();
  await syncAccommodations();
  await syncEvents();
  await syncHospitals();
  await syncStaticDocs();
  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
