/**
 * Deterministic Composite Scoring Function (lib/scoring.ts)
 *
 * Combines rule-based signals and verified model outputs with a transparent,
 * documented scoring formula rather than relying purely on LLM subjective text.
 *
 * Scoring Scale:
 * - 0 to 29:   Likely genuine (Green, Urgency: Low)
 * - 30 to 64:  Suspicious     (Amber, Urgency: Medium)
 * - 65 to 100: Likely scam    (Red,   Urgency: High)
 *
 * Hard Overrides (Automatic Scam Flags):
 * - UPI / Crypto payment demand (tax/customs/fines never accept personal UPI) -> Min 95
 * - Lookalike domain / typosquatting detected -> Min 95
 * - Free email provider claimed by government agency -> Min 90
 */

import { SignalEngineResult } from "./signals";
import { GroundedFlag } from "./grounding";

export type Verdict = "likely_genuine" | "suspicious" | "likely_scam";
export type Urgency = "low" | "medium" | "high";

export interface ScoringInput {
  ruleSignals: SignalEngineResult;
  groundedFlags: GroundedFlag[];
  modelVerdict?: Verdict;
  modelConfidence?: number;
}

export interface ScoringResult {
  score: number; // 0 to 100
  verdict: Verdict;
  confidenceLevel: "high" | "medium" | "low";
  verifyBeforeActing: boolean;
  urgencyLevel: Urgency;
  oneSentenceReason: {
    en: string;
    ta: string;
    hi: string;
  };
  breakdown: Array<{ factor: string; points: number }>;
}

export function calculateVerdict(input: ScoringInput): ScoringResult {
  const { ruleSignals, groundedFlags, modelVerdict, modelConfidence = 75 } = input;
  const breakdown: Array<{ factor: string; points: number }> = [];
  const hasPositiveOfficialEvidence =
    ruleSignals.hasValidGovDomain ||
    groundedFlags.some((flag) => flag.severity === "positive");
  const rulesOnlyLacksVerification =
    !modelVerdict && !hasPositiveOfficialEvidence;
  let score = 0;

  // 1. Hard Disqualifiers / Critical Overrides
  if (ruleSignals.hasUpiOrCrypto) {
    score = Math.max(score, 95);
    breakdown.push({
      factor: "Demands settlement via personal UPI ID, cryptocurrency, or gift cards",
      points: 95,
    });
  }

  if (ruleSignals.hasLookalikeDomain) {
    score = Math.max(score, 95);
    breakdown.push({
      factor: "Directs victim to a typosquatting lookalike portal imitating an official registry",
      points: 95,
    });
  }

  const hasCredentialRequest = ruleSignals.findings.some((finding) => finding.category === "sender" && finding.severity === "critical" && /\b(?:OTP|PIN|CVV|password|Aadhaar|PAN)\b/i.test(finding.quote));
  if (hasCredentialRequest) {
    score = Math.max(score, 85);
    breakdown.push({ factor: "Requests sensitive credentials or identity updates through an unverified channel", points: 85 });
  }

  if (ruleSignals.hasSenderMismatch) {
    score = Math.max(score, 90);
    breakdown.push({
      factor: "Official agency claimed, but sent from an unverified public consumer email address",
      points: 90,
    });
  }

  // 2. Incremental Risk Factors (if hard disqualifier not already maxed out)
  if (score < 90) {
    // Threat of arrest / criminal prosecution
    const hasArrestThreat = groundedFlags.some(
      (f) =>
        f.category === "threat" &&
        (f.quote.toLowerCase().includes("arrest") || f.quote.toLowerCase().includes("warrant"))
    );
    if (hasArrestThreat) {
      score += 30;
      breakdown.push({ factor: "Coercive arrest or warrant threat language", points: 30 });
    }

    // Account freeze threats
    const hasFreezeThreat = groundedFlags.some(
      (f) => f.category === "threat" && f.quote.toLowerCase().includes("freez")
    );
    if (hasFreezeThreat) {
      score += 25;
      breakdown.push({ factor: "Coercive bank account freeze threat", points: 25 });
    }

    // Extreme artificial deadline (< 24h)
    const hasExtremeUrgency = groundedFlags.some(
      (f) => f.quote.toLowerCase().includes("24 hour") || f.quote.toLowerCase().includes("2 hour")
    );
    if (hasExtremeUrgency) {
      score += 15;
      breakdown.push({ factor: "Extreme artificial deadline (< 24h) preventing verification", points: 15 });
    }

    // Non-.gov.in domain on claimed government notice
    const hasNonGovDomain = groundedFlags.some(
      (f) => f.category === "domain" && f.severity === "critical"
    );
    if (hasNonGovDomain && !ruleSignals.hasLookalikeDomain) {
      score += 35;
      breakdown.push({ factor: "Non-government domain used for official notice claim", points: 35 });
    }

    // URL Shortener
    const hasShortener = groundedFlags.some((f) => f.explanation.en.includes("shortener"));
    if (hasShortener) {
      score += 15;
      breakdown.push({ factor: "URL shortener disguising destination website", points: 15 });
    }

    // Influence of Model Verdict
    if (modelVerdict === "likely_scam") {
      const modelWeight = Math.round(modelConfidence * 0.25);
      score += modelWeight;
      breakdown.push({ factor: `Model semantic analysis (${modelConfidence}% scam confidence)`, points: modelWeight });
    } else if (modelVerdict === "suspicious") {
      score += 10;
      breakdown.push({ factor: "Model detected procedural inconsistencies", points: 10 });
    }

    // Positive signals reducing scam score
    if (!ruleSignals.hasCoercionOrPaymentDemand && !ruleSignals.hasUpiOrCrypto && !ruleSignals.hasLookalikeDomain && !ruleSignals.hasSenderMismatch && ruleSignals.hasValidGovDomain) {
      score -= 40;
      breakdown.push({ factor: "Links strictly to verified official .gov.in domain registry", points: -40 });
    }

    // Standard official statutory references (e.g. Section 143(1), valid DIN format)
    const hasOfficialDin = groundedFlags.some((f) => f.severity === "positive");
    if (!ruleSignals.hasCoercionOrPaymentDemand && !ruleSignals.hasUpiOrCrypto && !ruleSignals.hasLookalikeDomain && !ruleSignals.hasSenderMismatch && hasOfficialDin) {
      score -= 20;
      breakdown.push({ factor: "Contains valid official verification markers", points: -20 });
    }
  }

  if (
    score < 30 &&
    (rulesOnlyLacksVerification ||
      modelVerdict === "suspicious" ||
      modelVerdict === "likely_scam")
  ) {
    const safetyFloorPoints = 30 - score;
    score = 30;
    breakdown.push({
      factor: rulesOnlyLacksVerification
        ? "No AI assessment or positive official marker; require independent verification"
        : "Model signals require independent verification",
      points: safetyFloorPoints,
    });
  }

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine Final Verdict
  let verdict: Verdict;
  let urgencyLevel: Urgency;
  let reason: { en: string; ta: string; hi: string };

  if (score >= 65) {
    verdict = "likely_scam";
    urgencyLevel = "high";

    if (ruleSignals.hasUpiOrCrypto) {
      reason = {
        en: "Notice asks for direct payment to a personal UPI or cryptocurrency address, which government agencies never do.",
        ta: "அரசு அலுவலகங்கள் தனிநபர் யுபிஐ அல்லது கிரிப்டோகரன்சியில் கட்டணம் வசூலிப்பதில்லை. இது போலி மோசடி கடிதம்.",
        hi: "नोटिस व्यक्तिगत यूपीआई या क्रिप्टो पते पर भुगतान मांगता है, जो सरकारी एजेंसियां कभी नहीं करतीं।",
      };
    } else if (ruleSignals.hasLookalikeDomain) {
      reason = {
        en: "Notice directs you to a lookalike fake website designed to steal your credentials or funds.",
        ta: "அரசு வலைத்தளத்தை போல உருவாக்கப்பட்ட போலி இணையதள முகவரியை இக்கடிதம் கொண்டுள்ளது.",
        hi: "नोटिस आपको एक नकली वेबसाइट पर भेजता है जो आपकी जानकारी या पैसे चुराने के लिए बनाई गई है।",
      };
    } else if (ruleSignals.hasSenderMismatch) {
      reason = {
        en: "Notice claims to be an official department but was sent from an unverified public consumer email account.",
        ta: "அரசு துறை என கூறிக்கொண்டு பொதுவான ஜிமெயில் போன்ற இலவச முகவரியிலிருந்து அனுப்பப்பட்டுள்ளது.",
        hi: "नोटिस सरकारी विभाग होने का दावा करता है लेकिन सार्वजनिक मुफ्त ईमेल से भेजा गया है।",
      };
    } else {
      reason = {
        en: "Multiple high-risk fraud signals detected including coercive threats and unauthorized payment demands.",
        ta: "மிரட்டல் மற்றும் அங்கீகரிக்கப்படாத பணக்கோரிக்கை உள்ளிட்ட தீவிர மோசடி அறிகுறிகள் கண்டறியப்பட்டன.",
        hi: "धमकी और अनाधिकृत भुगतान मांगों सहित कई उच्च-जोखिम वाले धोखाधड़ी संकेत पाए गए हैं।",
      };
    }
  } else if (score >= 30) {
    verdict = "suspicious";
    urgencyLevel = "medium";
    reason = rulesOnlyLacksVerification
      ? {
          en: "Rules-only checks cannot confirm this notice without positive official evidence. Verify its sender and reference independently before acting.",
          ta: "அதிகாரப்பூர்வ ஆதாரம் இல்லாமல் விதி-அடிப்படையிலான சரிபார்ப்பால் இந்த அறிவிப்பை உறுதிப்படுத்த முடியாது. செயல்படுவதற்கு முன் அனுப்புநரையும் குறிப்பையும் தனியாகச் சரிபார்க்கவும்.",
          hi: "सकारात्मक आधिकारिक प्रमाण के बिना नियम-आधारित जांच इस नोटिस की पुष्टि नहीं कर सकती। कार्रवाई से पहले प्रेषक और संदर्भ की स्वतंत्र रूप से पुष्टि करें।",
        }
      : {
          en: "This notice exhibits procedural irregularities, suspicious links, or unusual urgency. Do not pay without official portal verification.",
          ta: "இக்கடிதத்தில் சந்தேகத்திற்கிடமான இணைப்புகள் மற்றும் அசாதாரண அவசரம் உள்ளது. அதிகாரப்பூர்வ தளத்தில் சரிபார்க்காமல் பணம் செலுத்தாதீர்கள்.",
          hi: "इस नोटिस में असामान्य तात्कालिकता या संदिग्ध लिंक हैं। आधिकारिक पोर्टल पर सत्यापन किए बिना कोई भुगतान न करें।",
        };
  } else {
    verdict = "likely_genuine";
    urgencyLevel = "low";
    reason = {
      en: "An allowlisted official domain was found and no high-risk signals were detected. Verify the notice on that official channel before acting.",
      ta: "அங்கீகரிக்கப்பட்ட அதிகாரப்பூர்வ இணையதளம் காணப்பட்டது; அதிக ஆபத்துள்ள அறிகுறிகள் இல்லை. செயல்படுவதற்கு முன் அந்த அதிகாரப்பூர்வ வழியில் அறிவிப்பைச் சரிபார்க்கவும்.",
      hi: "अनुमोदित आधिकारिक डोमेन मिला और कोई उच्च-जोखिम संकेत नहीं मिला। कार्रवाई से पहले उसी आधिकारिक माध्यम पर नोटिस की पुष्टि करें।",
    };
  }

  // Confidence reflects agreement between deterministic verdict and the model verdict,
  // not a fabricated probability. In rules-only mode, absence of a model keeps confidence low.
  const hardRuleSignal = ruleSignals.hasUpiOrCrypto || ruleSignals.hasLookalikeDomain || ruleSignals.hasSenderMismatch;
  const modelDisagrees = Boolean(modelVerdict && modelVerdict !== verdict);
  const groundedModelFlags = groundedFlags.filter((flag) => flag.source === "model");
  const modelFlagSupportsScam = groundedModelFlags.some((flag) => flag.severity === "critical" || flag.category === "threat_or_coercion" || flag.category === "suspicious_demand");
  const modelFlagContradictsScam = groundedModelFlags.some((flag) => flag.severity === "positive");
  const flagsDisagree = verdict === "likely_scam" ? modelFlagContradictsScam : verdict === "likely_genuine" && modelFlagSupportsScam;
  const verifyBeforeActing =
    modelDisagrees || flagsDisagree || !modelVerdict;
  const confidenceLevel: "high" | "medium" | "low" = verifyBeforeActing || !modelVerdict ? "low" : hardRuleSignal ? "high" : modelVerdict === verdict && groundedModelFlags.length > 0 ? "high" : "medium";

  return {
    score,
    verdict,
    confidenceLevel,
    verifyBeforeActing,
    urgencyLevel,
    oneSentenceReason: reason,
    breakdown,
  };
}
