import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

interface CookieStore {
  [domain: string]: Cookie[];
}

let cookieCache: CookieStore | null = null;

/**
 * Load cookies from the cookie store file
 */
export function loadCookies(): CookieStore {
  if (cookieCache) return cookieCache;
  
  try {
    const newCookiePath = join(homedir(), 'openclaw', 'cookies', 'cookies-for-browser.json');
    // Backward compat: fall back to old 'clawd' path if new path does not exist
    const legacyCookiePath = join(homedir(), 'clawd', 'cookies', 'cookies-for-browser.json');
    const cookiePath = existsSync(newCookiePath) ? newCookiePath : legacyCookiePath;
    const cookieData = readFileSync(cookiePath, 'utf8');
    cookieCache = JSON.parse(cookieData) as CookieStore;
    return cookieCache!;
  } catch (error) {
    console.warn('Could not load cookies:', error);
    return {};
  }
}

/**
 * Get cookies for a specific domain
 */
export function getCookiesForDomain(domain: string): Cookie[] {
  const cookies = loadCookies();
  return cookies[domain] || [];
}

/**
 * Set cookies in browser context using Playwright format
 */
export async function setCookiesInBrowser(api: any, domain: string): Promise<void> {
  const cookies = getCookiesForDomain(domain);
  
  if (cookies.length === 0) {
    console.warn(`⚠️  No cookies found for ${domain}`);
    return;
  }
  
  // Use browser evaluate to set cookies via document.cookie
  // This is a workaround since we don't have direct cookie setting API
  for (const cookie of cookies) {
    const cookieString = formatCookieString(cookie);
    
    try {
      await api.browser({
        action: "eval",
        javaScript: `document.cookie = "${cookieString}";`
      });
    } catch (error) {
      console.warn(`⚠️  Could not set cookie ${cookie.name}:`, error);
    }
  }
  
  console.log(`✅ Loaded ${cookies.length} cookies for ${domain}`);
}

/**
 * Format cookie as document.cookie string
 * Note: HttpOnly cookies can't be set via document.cookie
 */
function formatCookieString(cookie: Cookie): string {
  const parts = [
    `${cookie.name}=${cookie.value}`,
    `path=${cookie.path}`,
    `domain=${cookie.domain}`
  ];
  
  if (cookie.expires && cookie.expires > 0) {
    const expires = new Date(cookie.expires * 1000).toUTCString();
    parts.push(`expires=${expires}`);
  }
  
  if (cookie.secure) {
    parts.push('secure');
  }
  
  if (cookie.sameSite && cookie.sameSite !== 'Unspecified') {
    parts.push(`samesite=${cookie.sameSite}`);
  }
  
  return parts.join('; ');
}
