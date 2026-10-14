import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalyzeRequestSchema, AnalysisResponseSchema, AnalysisResponse } from "@/lib/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { evaluateSignals } from "@/lib/signals";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `
You are an expert fraud prevention and administrative law analyst specializing in Indian official communications (Income Tax, GST, Transport/Challans, Customs, Banking, and Police notices).

You will receive the text of an official-looking notice. Personal details have already been masked as anonymous tokens (e.g. [PERSON_1], [PAN_1], [PHONE_1], [ACCOUNT_1]).

Your task is to analyze whether the notice is likely genuine, suspicious, or a likely scam.
CRITICAL REQUIREMENTS:
1. Every item in the "flags" array MUST include an exact verbatim "quote" copied directly from the notice text. Do not paraphrase. Any ungrounded quote will be rejected.
2. For every text field requiring translations, provide high-quality, natural translations for English ("en"), Tamil ("ta", தமிழ்), and Hindi ("hi", हिन्दी).
3. In "draftReply", draft a formal, polite reply or dispute letter suitable for submitting to the department. Retain the tokens (e.g. [PERSON_1], [PAN_1]) in the draft so the user's browser can restore their real details locally.
4. Output strictly valid JSON matching the schema provided. Do not include markdown code fences or conversational text outside the JSON.
`;

export async function POST(req: NextRequest) {
  try {
    // 1. In-memory Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimit = checkRateLimit(ip, 10, 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait before submitting another notice.",
          resetInSeconds: rateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.resetInSeconds.toString(),
          },
        }
      );
    }

    // 2. Validate Request Body (Length <= 10,000 characters)
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join("; ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { maskedText } = parseResult.data;

    // 3. Check Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    if (!apiKey) {
      // Graceful offline fallback using rule-based signals when API key is not configured
      const fallbackResponse = buildRuleBasedFallback(maskedText);
      return NextResponse.json(fallbackResponse, { status: 200 });
    }

    // 4. Initialize Google Gen AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `Analyze this notice text and output valid structured JSON matching the required schema:\n\n${maskedText}`;

    // 5. Execute model invocation with single retry on schema/JSON parse failure
    let analysis: AnalysisResponse | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !analysis) {
      attempts++;
      try {
        const result = await model.generateContent(
          attempts === 1
            ? prompt
            : `${prompt}\n\nIMPORTANT: The previous output failed schema validation. Please adhere strictly to the JSON schema without missing fields or ungrounded quotes.`
        );

        const responseText = result.response.text();
        const cleanedJson = cleanJsonString(responseText);
        const parsedJson = JSON.parse(cleanedJson);

        const validation = AnalysisResponseSchema.safeParse(parsedJson);
        if (validation.success) {
          analysis = validation.data;
        }
      } catch {
        // Retry loop continues if within maxAttempts
      }
    }

    // 6. If model failed twice, return reliable rule-based fallback
    if (!analysis) {
      analysis = buildRuleBasedFallback(maskedText);
    }

    return NextResponse.json(analysis, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Strips accidental markdown backticks (```json ... ```) from model response.
 */
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Builds a 100% reliable, grounded fallback response using the deterministic signal engine.
 * Ensures the app never breaks even if the remote AI API is unreachable or rate-limited.
 */
function buildRuleBasedFallback(text: string): AnalysisResponse {
  const signals = evaluateSignals(text);

  const isScam = signals.hasUpiOrCrypto || signals.hasLookalikeDomain || signals.hasSenderMismatch;
  const isSuspicious = !isScam && (signals.hasUrgencyThreat || signals.findings.length > 0);

  const verdict = isScam ? "likely_scam" : isSuspicious ? "suspicious" : "likely_genuine";
  const urgencyLevel = isScam ? "high" : isSuspicious ? "medium" : "low";

  const flags = signals.findings.map((f) => ({
    quote: f.quote,
    category: f.category === "threat" ? ("threat_or_coercion" as const) : ("suspicious_demand" as const),
    severity: f.severity === "positive" ? ("positive" as const) : f.severity === "critical" ? ("critical" as const) : ("warning" as const),
    explanation: f.explanation,
  }));

  return {
    noticeType: signals.isGovNoticeClaim ? "Official Administrative Notice" : "Communication Notice",
    issuingAuthorityClaimed: signals.isGovNoticeClaim ? "Government / Regulatory Department" : "Unverified Entity",
    verdict,
    confidenceScore: isScam ? 95 : isSuspicious ? 70 : 88,
    oneSentenceReason: {
      en: isScam
        ? "Notice exhibits critical fraud indicators such as unauthorized payment channels or lookalike links."
        : isSuspicious
        ? "Notice contains irregularities or pressure tactics that require direct verification."
        : "Notice adheres to standard official format and official verification references.",
      ta: isScam
        ? "அங்கீகரிக்கப்படாத கட்டண வழிகள் அல்லது போலி இணைய இணைப்புகள் போன்ற தீவிர மோசடி அறிகுறிகள் உள்ளன."
        : isSuspicious
        ? "இக்கடிதத்தில் நேரடியாக சரிபார்க்க வேண்டிய அசாதாரண அம்சங்கள் உள்ளன."
        : "கடிதம் வழக்கமான அரசு முறைப்படியும் அதிகாரப்பூர்வ வழிகாட்டல்களுடனும் பொருந்துகிறது.",
      hi: isScam
        ? "नोटिस में अनधिकृत भुगतान चैनल या नकली लिंक जैसे गंभीर धोखाधड़ी के संकेत मिले हैं।"
        : isSuspicious
        ? "नोटिस में विसंगतियां हैं जिनकी आधिकारिक पोर्टल पर पुष्टि आवश्यक है।"
        : "नोटिस मानक आधिकारिक प्रारूप और आधिकारिक सत्यापन संदर्भों का पालन करता है।",
    },
    urgencyLevel,
    summary: {
      whatThisIs: {
        en: "An official-looking communication demanding review or compliance.",
        ta: "பரிசீலனை அல்லது இணக்கத்தை கோரும் அரசு போன்ற அறிவிப்பு.",
        hi: "समीक्षा या अनुपालन की मांग करने वाला एक आधिकारिक जैसा संचार।",
      },
      whatItDemands: {
        en: isScam
          ? "Immediate monetary settlement or credential verification via unverified channels."
          : "Verification of administrative or compliance records.",
        ta: isScam
          ? "உறுதிப்படுத்தப்படாத வழிகளில் உடனடி பண பரிமாற்றம் அல்லது தகவல்களை கோருகிறது."
          : "நிர்வாக அல்லது வரி பதிவுகளை சரிபார்க்க கோருகிறது.",
        hi: isScam
          ? "असत्यापित चैनलों के माध्यम से तत्काल मौद्रिक निपटान या जानकारी की मांग।"
          : "प्रशासनिक या अनुपालन रिकॉर्ड का सत्यापन।",
      },
      consequenceIfIgnored: {
        en: isScam
          ? "Nothing legal; scammers rely on fabricated threats of arrest or account suspension."
          : "Standard administrative follow-up or statutory notices through registered post.",
        ta: isScam
          ? "சட்டரீதியான பாதிப்பு எதுவும் இல்லை; மோசடிக்காரர்கள் போலியான கைது மிரட்டல்களை விடுக்கின்றனர்."
          : "பதிவு தபால் மூலம் வழக்கமான அடுத்தகட்ட அரசு அறிவிப்புகள் வரலாம்.",
        hi: isScam
          ? "कोई कानूनी परिणाम नहीं; धोखेबाज गिरफ्तारी या खाता जब्ती की मनगढ़ंत धमकियों पर निर्भर होते हैं।"
          : "पंजीकृत डाक के माध्यम से मानक प्रशासनिक अनुवर्ती या वैधानिक नोटिस।",
      },
    },
    flags,
    checklist: [
      {
        step: 1,
        action: {
          en: "Do not pay any individual UPI ID or click unverified links.",
          ta: "எந்தவொரு தனிநபர் யுபிஐ முகவரிக்கும் பணம் அனுப்பாதீர்கள்.",
          hi: "किसी भी व्यक्तिगत यूपीआई आईडी पर भुगतान न करें और संदिग्ध लिंक पर क्लिक न करें।",
        },
        isOfficialChannel: false,
      },
      {
        step: 2,
        action: {
          en: "Verify the Document Identification Number (DIN) or notice reference directly on the official portal (e.g. incometax.gov.in).",
          ta: "கடிதத்தின் குறிப்பு எண்ணை அதிகாரப்பூர்வ அரசு இணையதளத்தில் (incometax.gov.in) சரிபார்க்கவும்.",
          hi: "आधिकारिक पोर्टल (जैसे incometax.gov.in) पर दस्तावेज़ पहचान संख्या (DIN) को सत्यापित करें।",
        },
        isOfficialChannel: true,
      },
      {
        step: 3,
        action: {
          en: "If coerced or threatened, file an official cyber fraud complaint at cybercrime.gov.in or call 1930.",
          ta: "மிரட்டல் விடுக்கப்பட்டால், cybercrime.gov.in அல்லது 1930 எண்ணில் புகார் அளிக்கவும்.",
          hi: "यदि धमकी दी गई है, तो cybercrime.gov.in पर आधिकारिक शिकायत दर्ज करें या 1930 पर कॉल करें।",
        },
        isOfficialChannel: true,
      },
    ],
    draftReply: {
      en: "To the Issuing Officer,\n\nI am in receipt of your communication regarding [PERSON_1], PAN: [PAN_1].\n\nKindly note that all statutory compliance from my end is maintained in accordance with law. Before proceeding further, please provide the official Document Identification Number (DIN) generated through the departmental portal.\n\nSincerely,\n[PERSON_1]",
      ta: "அதிகாரி அவர்களுக்கு,\n\n[PERSON_1] ஆகிய எனக்கு வரப்பெற்ற கடிதம் தொடர்பாக எழுதுகிறேன். சட்ட விதிகளின்படி எனது அனைத்து பதிவுகளும் சரியாக உள்ளன. தொடர் நடவடிக்கைக்கு முன், அதிகாரப்பூர்வ துறை இணையதளத்தின் DIN எண்ணை வழங்குமாறு கேட்டுக்கொள்கிறேன்.\n\nஇப்படிக்கு,\n[PERSON_1]",
      hi: "सेवा में अधिकारी महोदय,\n\nमुझे [PERSON_1], पैन: [PAN_1] के संदर्भ में आपका पत्र प्राप्त हुआ है।\n\nकृपया ध्यान दें कि मेरी ओर से सभी वैधानिक अनुपालन नियमानुसार किए गए हैं। आगे की कार्रवाई से पहले, कृपया विभागीय पोर्टल द्वारा जारी आधिकारिक डीआईएन (DIN) संख्या प्रदान करें।\n\nभवदीय,\n[PERSON_1]",
    },
  };
}
