/**
 * Verified Official Domains & Registry Allowlist
 * Used for deterministic domain validation and lookalike (typosquatting) detection.
 */

export interface OfficialDomainEntry {
  domain: string;
  name: string;
  category: "tax" | "transport" | "police" | "customs" | "bank" | "general_gov";
}

export const OFFICIAL_DOMAINS: OfficialDomainEntry[] = [
  // Income Tax & Revenue
  { domain: "incometax.gov.in", name: "Income Tax Department", category: "tax" },
  { domain: "eportal.incometax.gov.in", name: "Income Tax e-Filing Portal", category: "tax" },
  { domain: "incometaxindia.gov.in", name: "Income Tax India Official", category: "tax" },
  { domain: "tin-nsdl.com", name: "Protean TIN NSDL (Official PAN Service)", category: "tax" },
  { domain: "pan.utiitsl.com", name: "UTIITSL PAN Portal", category: "tax" },

  // Traffic & Transport
  { domain: "parivahan.gov.in", name: "Ministry of Road Transport and Highways (MoRTH)", category: "transport" },
  { domain: "echallan.parivahan.gov.in", name: "Official Parivahan E-Challan Portal", category: "transport" },
  { domain: "sarathi.parivahan.gov.in", name: "Sarathi Driving License Portal", category: "transport" },

  // Customs & Postal
  { domain: "indiapost.gov.in", name: "Department of Posts (India Post)", category: "customs" },
  { domain: "icegate.gov.in", name: "Indian Customs Electronic Gateway", category: "customs" },
  { domain: "cbic.gov.in", name: "Central Board of Indirect Taxes and Customs", category: "customs" },

  // National Cybercrime & Portal
  { domain: "cybercrime.gov.in", name: "National Cyber Crime Reporting Portal", category: "police" },
  { domain: "india.gov.in", name: "National Portal of India", category: "general_gov" },
  { domain: "rbi.org.in", name: "Reserve Bank of India", category: "bank" },

  // Major Public and Private Banks
  { domain: "sbi.co.in", name: "State Bank of India", category: "bank" },
  { domain: "onlinesbi.sbi", name: "State Bank of India NetBanking", category: "bank" },
  { domain: "hdfcbank.com", name: "HDFC Bank", category: "bank" },
  { domain: "icicibank.com", name: "ICICI Bank", category: "bank" },
  { domain: "axisbank.com", name: "Axis Bank", category: "bank" },
  { domain: "pnbindia.in", name: "Punjab National Bank", category: "bank" },
  { domain: "bankofbaroda.in", name: "Bank of Baroda", category: "bank" },
];

export const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "ow.ly",
  "buff.ly",
  "rb.gy",
  "shorturl.at",
  "bl.ink",
  "qr.net",
]);

/**
 * Standard Levenshtein distance for string edit distance calculation.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Checks whether a given host is or closely mimics an official domain.
 */
export function checkDomainAuthenticity(candidateDomain: string): {
  isExactOfficial: boolean;
  isLookalike: boolean;
  isShortener: boolean;
  matchedOfficial?: OfficialDomainEntry;
  editDistance?: number;
} {
  const normalized = candidateDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].split(":")[0];

  // 1. Check URL shorteners
  if (URL_SHORTENERS.has(normalized)) {
    return { isExactOfficial: false, isLookalike: false, isShortener: true };
  }

  // 2. Check exact match or valid subdomain of official domain
  for (const entry of OFFICIAL_DOMAINS) {
    if (normalized === entry.domain || normalized.endsWith("." + entry.domain)) {
      return { isExactOfficial: true, isLookalike: false, isShortener: false, matchedOfficial: entry };
    }
  }

  // 3. Check for near-miss / lookalike (typosquatting) using Levenshtein distance
  // Lookalikes include hyphens replacing dots (e.g. incometax-gov.in vs incometax.gov.in)
  for (const entry of OFFICIAL_DOMAINS) {
    const dist = levenshteinDistance(normalized, entry.domain);
    // Distance <= 3 on longer domains, or domain contains official base (e.g. "incometax" and "gov" but fake TLD)
    if (dist > 0 && dist <= 2) {
      return {
        isExactOfficial: false,
        isLookalike: true,
        isShortener: false,
        matchedOfficial: entry,
        editDistance: dist,
      };
    }

    // Heuristic: hyphens in place of dots, e.g. "incometax-gov.in" or "parivahan-gov.in"
    const hyphenated = entry.domain.replace(/\./g, "-");
    if (normalized.includes(hyphenated) || normalized === hyphenated) {
      return {
        isExactOfficial: false,
        isLookalike: true,
        isShortener: false,
        matchedOfficial: entry,
        editDistance: 1,
      };
    }
  }

  return { isExactOfficial: false, isLookalike: false, isShortener: false };
}
