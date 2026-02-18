/**
 * Apply phone_verification_tokens migration via Supabase REST API.
 * Run: node scripts/apply-verification-tokens.mjs
 * 
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sql = readFileSync('supabase/migrations/verification_tokens.sql', 'utf-8');

const pgRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!pgRes.ok) {
  console.log('⚠️  Автоматичне застосування не вдалось.');
  console.log('');
  console.log('Виконай SQL вручну в Supabase Dashboard → SQL Editor:');
  console.log('');
  console.log(sql);
  console.log('');
  console.log('URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
  process.exit(0);
}

console.log('✅ Міграція застосована: phone_verification_tokens');
