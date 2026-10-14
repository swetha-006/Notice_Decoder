/**
 * Pure TypeScript Rule-Based Fraud Signal Engine
 *
 * Runs deterministically before and alongside AI model analysis.
 * Detects:
 * - Suspicious payment methods (UPI IDs, crypto, gift cards, personal accounts)
 * - Coercive threat and urgency language ("arrest warrant", "freeze account", "within 24 hours")
 * - URL shorteners and lookalike domains (typosquatting on official allowlist)
 * - Non-.gov.in domains present in purported government notices
 * - Sender mismatches (official government body named but free email/mobile provided)
 * - Deadlines and days-remaining calculation
 */

import { checkDomainAuthenticity } from "./official-domains";

export type SignalSeverity = "critical" | "warning" | "info" | "positive";

export interface SignalFinding {
  id: string;
  category: "payment" | "threat" | "domain" | "sender" | "deadline" | "format";
  severity: SignalSeverity;
  quote: string;
  explanation: {
    en: string;
    ta: string;
    hi: string;
  };
  startIndex?: number;
  endIndex?: number;
}

export interface DeadlineInfo {
  extractedDate?: string;
  daysRemaining?: number;
  isExpired?: boolean;
  rawPhrase?: string;
}

export interface SignalEngineResult {
  findings: SignalFinding[];
  deadlineInfo?: DeadlineInfo;
  hasUpiOrCrypto: boolean;
  hasLookalikeDomain: boolean;
  hasUrgencyThreat: boolean;
  hasSenderMismatch: boolean;
  hasValidGovDomain: boolean;
  isGovNoticeClaim: boolean;
}

// Threat & Coercion Keywords
const THREAT_PATTERNS = [
  {
    regex: /\b(?:arrest warrant|warrant of arrest|immediate arrest)\b/i,
    en: "Notice threatens immediate arrest, a standard intimidation tactic used in scam letters.",
    ta: "கடிதம் உடனடி கைது அச்சுறுத்தல் விடுக்கிறது, இது போலி அறிவிப்புகளில் பயன்படுத்தப்படும் மிரட்டல் முறையாகும்.",
    hi: "नोटिस तुरंत गिरफ्तारी की धमकी देता है, जो फर्जी नोटिसों में इस्तेमाल की जाने वाली रणनीति है।",
    severity: "critical" as const,
  },
  {
    regex: /\b(?:account\s+(?:will be\s+)?frozen|freeze\s+(?:your\s+)?account|debit\s+freeze)\b/i,
    en: "Threatens bank account freezing, designed to induce panic payment.",
    ta: "வங்கிக் கணக்கு முடக்கப்படும் என மிரட்டுகிறது, இது பீதியில் பணம் செலுத்த தூண்டும் தந்திரமாகும்.",
    hi: "बैंक खाता फ्रीज करने की धमकी देता है, जिससे घबराहट में भुगतान कराया जा सके।",
    severity: "critical" as const,
  },
  {
    regex: /\b(?:within 24 hours|within 2 hours|immediate settlement|immediate warrant)\b/i,
    en: "Imposes an artificial extreme deadline (within 24 hours) to prevent independent verification.",
    ta: "சரிபார்ப்பை தவிர்க்க 24 மணி நேரத்திற்குள் செலுத்த அவசர கெடு விதிக்கப்பட்டுள்ளது.",
    hi: "सत्यापन से बचने के लिए 24 घंटे के भीतर भुगतान की अनुचित समय सीमा तय की गई है।",
    severity: "warning" as const,
  },
  {
    regex: /\b(?:non-bailable|police action|seizure of property|FIR will be lodged)\b/i,
    en: "Uses coercive criminal threats to bypass standard administrative dispute procedures.",
    ta: "வழக்கமான மேல்முறையீட்டு நடைமுறைகளை தவிர்த்து குற்றவியல் மிரட்டல்களை பயன்படுத்துகிறது.",
    hi: "प्रशासनिक प्रक्रियाओं को दरकिनार करते हुए आपराधिक पुलिस कार्रवाई की धमकी दी गई है।",
    severity: "critical" as const,
  },
];

// Free email providers commonly abused by scammers
const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "rediffmail.com",
  "proton.me",
  "icloud.com",
];

// UPI ID pattern (e.g. handle@bank or alphanumeric@vpa)
const UPI_REGEX = /\b([a-zA-Z0-9.\-_]{2,256}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|axl|upi|apl|barodampay|postbank))\b/gi;
const GENERAL_UPI_REGEX = /(?:UPI\s+ID|UPI|GPay|PhonePe|Paytm)[\s:-]*([a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9.\-_]{2,50})/gi;

// Crypto pattern (Bitcoin, Ethereum, USDT)
const CRYPTO_REGEX = /\b(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b/g;

// Gift card pattern
const GIFT_CARD_REGEX = /\b(?:Amazon|Google\s+Play|Apple|Steam)\s+(?:gift\s+card|voucher|code)\b/gi;

/**
 * Executes the rule-based signal checks on the provided notice text.
 */
export function evaluateSignals(text: string, referenceDate: Date = new Date()): SignalEngineResult {
  const findings: SignalFinding[] = [];
  let hasUpiOrCrypto = false;
  let hasLookalikeDomain = false;
  let hasUrgencyThreat = false;
  let hasSenderMismatch = false;
  let hasValidGovDomain = false;

  // Check if text claims to be an official government notice
  const isGovNoticeClaim =
    /\b(?:Income\s+Tax\s+Department|Government\s+of\s+India|Ministry\s+of\s+Finance|Parivahan|Traffic\s+Police|Customs\s+Department|India\s+Post\s+Customs|Department\s+of\s+Revenue|Court\s+Summons)\b/i.test(
      text
    );

  // 1. Payment Detection: UPI IDs
  let upiMatch: RegExpExecArray | null;
  while ((upiMatch = UPI_REGEX.exec(text)) !== null) {
    hasUpiOrCrypto = true;
    findings.push({
      id: `rule-upi-${findings.length}`,
      category: "payment",
      severity: "critical",
      quote: upiMatch[0],
      explanation: {
        en: `Demand for payment via personal UPI ID (${upiMatch[0]}). Official government bodies never accept tax or fines through personal UPI handles.`,
        ta: `தனிநபர் யுபிஐ ஐடி (${upiMatch[0]}) மூலம் பணம் செலுத்துமாறு கோருகிறது. அரசு துறைகள் தனிநபர் யுபிஐ மூலம் வரி வாங்குவதில்லை.`,
        hi: `व्यक्तिगत यूपीआई आईडी (${upiMatch[0]}) के माध्यम से भुगतान की मांग। सरकारी विभाग कभी भी व्यक्तिगत यूपीआई पर कर या जुर्माना नहीं लेते।`,
      },
    });
  }

  while ((upiMatch = GENERAL_UPI_REGEX.exec(text)) !== null) {
    const quote = upiMatch[0];
    if (!findings.some((f) => f.quote === quote)) {
      hasUpiOrCrypto = true;
      findings.push({
        id: `rule-gen-upi-${findings.length}`,
        category: "payment",
        severity: "critical",
        quote,
        explanation: {
          en: `Demands payment through UPI/wallet instead of authorized government treasury portals.`,
          ta: `அரசு கருவூல இணையதளத்திற்கு பதிலாக யுபிஐ/வாலட் மூலம் பணம் செலுத்த கோருகிறது.`,
          hi: `अधिकृत सरकारी खजाने के पोर्टल के बजाय यूपीआई/वॉलेट के माध्यम से भुगतान की मांग।`,
        },
      });
    }
  }

  // Crypto / Gift Cards
  let cryptoMatch: RegExpExecArray | null;
  while ((cryptoMatch = CRYPTO_REGEX.exec(text)) !== null) {
    hasUpiOrCrypto = true;
    findings.push({
      id: `rule-crypto-${findings.length}`,
      category: "payment",
      severity: "critical",
      quote: cryptoMatch[0],
      explanation: {
        en: `Directs payment to a cryptocurrency wallet address (${cryptoMatch[0]}). This is a definitive sign of extortion/fraud.`,
        ta: `கிரிப்டோகரன்சி முகவரிக்கு (${cryptoMatch[0]}) பணம் செலுத்துமாறு கோருகிறது. இது போலி மோசடி.`,
        hi: `क्रिप्टोकरेंसी वॉलेट (${cryptoMatch[0]}) पर भुगतान का निर्देश। यह स्पष्ट रूप से धोखाधड़ी का संकेत है।`,
      },
    });
  }

  let giftCardMatch: RegExpExecArray | null;
  while ((giftCardMatch = GIFT_CARD_REGEX.exec(text)) !== null) {
    hasUpiOrCrypto = true;
    findings.push({
      id: `rule-giftcard-${findings.length}`,
      category: "payment",
      severity: "critical",
      quote: giftCardMatch[0],
      explanation: {
        en: `Demands settlement via retail gift cards (${giftCardMatch[0]}). Government agencies never accept gift cards.`,
        ta: `பரிசு கூப்பன்கள் (${giftCardMatch[0]}) மூலம் பணம் கோருகிறது. அரசு அலுவலகங்கள் பரிசு கூப்பன்களை ஏற்பதில்லை.`,
        hi: `गिफ्ट कार्ड (${giftCardMatch[0]}) के माध्यम से निपटान की मांग। सरकारी एजेंसियां कभी गिफ्ट कार्ड स्वीकार नहीं करतीं।`,
      },
    });
  }

  // 2. Threat & Coercion Patterns
  for (const threat of THREAT_PATTERNS) {
    const match = threat.regex.exec(text);
    if (match) {
      hasUrgencyThreat = true;
      findings.push({
        id: `rule-threat-${findings.length}`,
        category: "threat",
        severity: threat.severity,
        quote: match[0],
        explanation: {
          en: threat.en,
          ta: threat.ta,
          hi: threat.hi,
        },
      });
    }
  }

  // 3. URLs and Domains (supports multi-level subdomains like eportal.incometax.gov.in)
  const urlRegex = /(?:https?:\/\/)?((?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s,)]*)?)/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const fullMatch = urlMatch[0];
    const rawDomain = urlMatch[1].split("/")[0].split(":")[0].toLowerCase();

    // Skip common benign file extensions or email fragments
    if (rawDomain.includes("@") || rawDomain.endsWith(".txt") || rawDomain.endsWith(".pdf")) {
      continue;
    }

    const domainAuth = checkDomainAuthenticity(rawDomain);

    if (domainAuth.isExactOfficial) {
      hasValidGovDomain = true;
      findings.push({
        id: `rule-official-domain-${findings.length}`,
        category: "domain",
        severity: "positive",
        quote: fullMatch,
        explanation: {
          en: `Links to the verified official portal (${domainAuth.matchedOfficial?.name}: ${domainAuth.matchedOfficial?.domain}).`,
          ta: `அங்கீகரிக்கப்பட்ட அதிகாரப்பூர்வ இணையதளத்திற்கு (${domainAuth.matchedOfficial?.name}) வழிநடத்துகிறது.`,
          hi: `सत्यापित आधिकारिक पोर्टल (${domainAuth.matchedOfficial?.name}) का लिंक प्रदान करता है।`,
        },
      });
    } else if (domainAuth.isLookalike) {
      hasLookalikeDomain = true;
      findings.push({
        id: `rule-lookalike-${findings.length}`,
        category: "domain",
        severity: "critical",
        quote: fullMatch,
        explanation: {
          en: `Lookalike fake domain detected: "${rawDomain}" mimics the official site "${domainAuth.matchedOfficial?.domain}". This is an active phishing attempt.`,
          ta: `போலி இணையதளம்: "${rawDomain}" என்ற முகவரி அதிகாரப்பூர்வ "${domainAuth.matchedOfficial?.domain}" தளத்தைப் போல் போலியாக உருவாக்கப்பட்டுள்ளது.`,
          hi: `फर्जी लुकअलाइक डोमेन: "${rawDomain}" आधिकारिक पोर्टल "${domainAuth.matchedOfficial?.domain}" की नकल करता है। यह फ़िशिंग का प्रयास है।`,
        },
      });
    } else if (domainAuth.isShortener) {
      findings.push({
        id: `rule-shortener-${findings.length}`,
        category: "domain",
        severity: "warning",
        quote: fullMatch,
        explanation: {
          en: `Uses a URL shortener (${rawDomain}) to conceal the destination address. Official notices link directly to verifiable government websites.`,
          ta: `இணையதள முகவரியை மறைக்க URL சுருக்கி (${rawDomain}) பயன்படுத்தப்பட்டுள்ளது.`,
          hi: `गंतव्य पते को छिपाने के लिए यूआरएल शॉर्टनर (${rawDomain}) का उपयोग करता है।`,
        },
      });
    } else if (isGovNoticeClaim && !rawDomain.endsWith(".gov.in") && !rawDomain.endsWith(".nic.in")) {
      findings.push({
        id: `rule-non-gov-${findings.length}`,
        category: "domain",
        severity: "critical",
        quote: fullMatch,
        explanation: {
          en: `Notice claims to be from an Indian Government department, but directs users to a non-government domain (${rawDomain}) instead of .gov.in.`,
          ta: `இந்திய அரசு அறிவிப்பு என கூறிக்கொண்டு, .gov.in அல்லாத தனியார் இணையதளத்திற்கு (${rawDomain}) வழிநடத்துகிறது.`,
          hi: `नोटिस भारत सरकार का होने का दावा करता है, लेकिन .gov.in के बजाय गैर-सरकारी डोमेन (${rawDomain}) पर भेजता है।`,
        },
      });
    }
  }

  // 4. Sender Mismatch: Government claimed, but free webmail used
  if (isGovNoticeClaim) {
    for (const freeProvider of FREE_EMAIL_PROVIDERS) {
      const emailRegex = new RegExp(`\\b[a-zA-Z0-9._%+-]+@${freeProvider}\\b`, "i");
      const match = emailRegex.exec(text);
      if (match) {
        hasSenderMismatch = true;
        findings.push({
          id: `rule-sender-mismatch-${findings.length}`,
          category: "sender",
          severity: "critical",
          quote: match[0],
          explanation: {
            en: `Sender email address (${match[0]}) uses a free consumer mail service (${freeProvider}) while claiming to be an official government department.`,
            ta: `அரசு அதிகாரி என கூறிக்கொண்டு பொதுவான இலவச மின்னஞ்சல் (${match[0]}) முகவரியை பயன்படுத்துகிறது.`,
            hi: `प्रेषक सरकारी विभाग होने का दावा करता है लेकिन मुफ्त सार्वजनिक ईमेल (${match[0]}) का उपयोग कर रहा है।`,
          },
        });
      }
    }
  }

  // 5. Deadline Calculation
  const deadlineInfo = extractDeadline(text, referenceDate);
  if (deadlineInfo && deadlineInfo.rawPhrase) {
    findings.push({
      id: `rule-deadline-${findings.length}`,
      category: "deadline",
      severity: deadlineInfo.isExpired ? "warning" : "info",
      quote: deadlineInfo.rawPhrase,
      explanation: {
        en: deadlineInfo.isExpired
          ? `Stated deadline (${deadlineInfo.extractedDate || deadlineInfo.rawPhrase}) appears to have expired.`
          : `Stated deadline allows approximately ${deadlineInfo.daysRemaining} days remaining for response.`,
        ta: deadlineInfo.isExpired
          ? `குறிப்பிட்ட காலக்கெடு முடிந்துவிட்டது.`
          : `பதிலளிக்க சுமார் ${deadlineInfo.daysRemaining} நாட்கள் எஞ்சியுள்ளன.`,
        hi: deadlineInfo.isExpired
          ? `निर्धारित समय सीमा समाप्त हो चुकी प्रतीत होती है।`
          : `जवाब देने के लिए लगभग ${deadlineInfo.daysRemaining} दिन शेष हैं।`,
      },
    });
  }

  return {
    findings,
    deadlineInfo,
    hasUpiOrCrypto,
    hasLookalikeDomain,
    hasUrgencyThreat,
    hasSenderMismatch,
    hasValidGovDomain,
    isGovNoticeClaim,
  };
}

/**
 * Extracts deadlines and computes days remaining from notice text.
 */
export function extractDeadline(text: string, referenceDate: Date = new Date()): DeadlineInfo | undefined {
  // 1. Relative phrases: "within X days"
  const relativeMatch = /\bwithin\s+(\d{1,2})\s+days?\b/i.exec(text);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10);
    return {
      rawPhrase: relativeMatch[0],
      daysRemaining: days,
      isExpired: false,
    };
  }

  // 2. Relative phrase: "within 24 hours"
  if (/\bwithin\s+24\s+hours?\b/i.test(text)) {
    return {
      rawPhrase: "within 24 hours",
      daysRemaining: 1,
      isExpired: false,
    };
  }

  // 3. Absolute dates in format DD/MM/YYYY or DD-MM-YYYY
  const dateRegex = /\b(?:on or before|by|deadline:?|date:?)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/i;
  const dateMatch = dateRegex.exec(text);
  if (dateMatch) {
    const rawDateStr = dateMatch[1];
    const parts = rawDateStr.split(/[\/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day);
    if (!isNaN(targetDate.getTime())) {
      const diffMs = targetDate.getTime() - referenceDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        extractedDate: rawDateStr,
        rawPhrase: dateMatch[0],
        daysRemaining: diffDays,
        isExpired: diffDays < 0,
      };
    }
  }

  return undefined;
}
