import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const TOKEN_TTL_MINUTES = 5;

/**
 * Створити verification token після успішної OTP верифікації.
 * Повертає RAW токен (не хеш) — передається клієнту.
 */
export async function createVerificationToken(
  phone: string,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const supabase = createAdminClient();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  // Інвалідувати попередні токени для цього номера
  await supabase
    .from('phone_verification_tokens')
    .update({ used: true })
    .eq('phone', phone)
    .eq('used', false);

  const { error } = await supabase.from('phone_verification_tokens').insert({
    phone,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ip || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error('[VerificationToken] Insert error:', error.message);
    throw new Error('Failed to create verification token');
  }

  return token;
}

/**
 * Перевірити і спожити (одноразово) verification token.
 * Повертає true якщо токен валідний, false якщо ні.
 */
export async function verifyAndConsumeToken(
  phone: string,
  token: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data, error } = await supabase
    .from('phone_verification_tokens')
    .select('id')
    .eq('phone', phone)
    .eq('token_hash', tokenHash)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) return false;

  // Одноразове використання
  await supabase
    .from('phone_verification_tokens')
    .update({ used: true })
    .eq('id', data.id);

  return true;
}
