import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Allowed values whitelist
const ALLOWED_CATEGORIES = ['Bug Report', 'Suggestion', 'Query'];
const ALLOWED_GENDERS    = ['Male', 'Female', 'Other', 'Prefer not to say'];
const EMAIL_REGEX        = /^[^\s@]{1,64}@[^\s@]{1,253}\.[a-zA-Z]{2,}$/;
const PHONE_REGEX        = /^[0-9]{10}$/;

function sanitise(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — only allow your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', 'https://bharatyatra.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { category, name, age, gender, phone, email, statement } = req.body;

    // ── VALIDATE ──────────────────────────────────────────
    if (!ALLOWED_CATEGORIES.includes(sanitise(category)))
      return res.status(400).json({ error: 'Invalid category.' });

    if (!ALLOWED_GENDERS.includes(sanitise(gender)))
      return res.status(400).json({ error: 'Invalid gender.' });

    const cleanName = sanitise(name);
    if (!cleanName || cleanName.length < 2 || cleanName.length > 100)
      return res.status(400).json({ error: 'Invalid name.' });
    if (!/^[a-zA-Z\s.\-']+$/.test(cleanName))
      return res.status(400).json({ error: 'Name contains invalid characters.' });

    const cleanAge = parseInt(age, 10);
    if (!Number.isInteger(cleanAge) || cleanAge < 1 || cleanAge > 120)
      return res.status(400).json({ error: 'Invalid age.' });

    const phoneDigits = sanitise(phone).replace(/\D/g, '');
    if (!PHONE_REGEX.test(phoneDigits))
      return res.status(400).json({ error: 'Phone must be exactly 10 digits.' });

    const cleanEmail = sanitise(email);
    if (!EMAIL_REGEX.test(cleanEmail))
      return res.status(400).json({ error: 'Invalid email address.' });

    const cleanStatement = sanitise(statement);
    if (!cleanStatement || cleanStatement.length < 10 || cleanStatement.length > 2000)
      return res.status(400).json({ error: 'Statement must be 10–2000 characters.' });

    // ── CHECK SUBMISSIONS ENABLED ─────────────────────────
    const { data: setting } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'submissions_enabled')
      .single();

    if (setting && setting.value === 'false') {
      return res.status(403).json({ error: 'Submissions are temporarily closed.' });
    }

    // ── INSERT (service role bypasses RLS entirely) ───────
    const { error } = await sb.from('contact_submissions').insert([{
      category:  sanitise(category).substring(0, 50),
      name:      cleanName.substring(0, 100),
      age:       cleanAge,
      gender:    sanitise(gender).substring(0, 30),
      phone:     phoneDigits.substring(0, 15),
      email:     cleanEmail.substring(0, 254),
      statement: cleanStatement.substring(0, 2000),
    }]);

    if (error) throw error;

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('submit-contact error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}