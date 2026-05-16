import crypto from 'crypto';

interface DownloadMeta {
  u: string;   // download URL
  t: string;   // title
  q: string;   // quality label
  s: string;   // size
  p: string;   // poster URL
  x: number;   // expiry timestamp
}

const SECRET = process.env.DOWNLOAD_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'cinexp-dl-fallback';

export function createToken(meta: Omit<DownloadMeta, 'x'>): string {
  const payload: DownloadMeta = { ...meta, x: Date.now() + 5 * 60 * 1000 }; // 5 min expiry
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string): DownloadMeta | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    
    const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (sig !== expected) return null;
    
    const data: DownloadMeta = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (data.x < Date.now()) return null; // expired
    
    return data;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}
