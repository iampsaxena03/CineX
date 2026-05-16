import crypto from 'crypto';

export interface DownloadMeta {
  u: string;   // download URL
  t: string;   // title
  q: string;   // quality label
  s: string;   // size
  p: string;   // poster URL
  x: number;   // expiry timestamp
}

// Using ADMIN_PASSWORD as a fallback secret if DOWNLOAD_TOKEN_SECRET isn't set
const SECRET = process.env.DOWNLOAD_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'cinexp-dl-fallback-secret-2024';

/**
 * Creates a signed, time-limited token encoding download metadata.
 */
export function createDownloadToken(meta: Omit<DownloadMeta, 'x'>): string {
  const payload: DownloadMeta = { 
    ...meta, 
    x: Date.now() + 10 * 60 * 1000 // 10 min expiry for more cushion
  };
  
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies a token's signature and expiry. Returns metadata if valid.
 */
export function verifyDownloadToken(token: string): DownloadMeta | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (sig !== expectedSig) return null;
    
    const data: DownloadMeta = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    
    // Check expiry
    if (data.x < Date.now()) return null;
    
    return data;
  } catch (err) {
    console.error('[Token] Verification error:', err);
    return null;
  }
}
