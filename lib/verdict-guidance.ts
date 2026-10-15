import type { AnalysisResponse, LocalizedText } from "./schema";
import type { Verdict } from "./scoring";

export interface SafeVerdictGuidance {
  summary: AnalysisResponse["summary"];
  checklist: AnalysisResponse["checklist"];
  neutralReply: LocalizedText;
}

const scamGuidance: SafeVerdictGuidance = {
  summary: {
    whatThisIs: {
      en: "This notice has strong scam indicators. This automated result is a warning, not a legal determination.",
      ta: "இந்த அறிவிப்பில் மோசடியைக் குறிக்கும் வலுவான அறிகுறிகள் உள்ளன. இது தானியங்கி எச்சரிக்கை மட்டுமே; சட்டரீதியான தீர்ப்பு அல்ல.",
      hi: "इस नोटिस में धोखाधड़ी के मजबूत संकेत हैं। यह स्वचालित चेतावनी है, कानूनी निर्णय नहीं।",
    },
    whatItDemands: {
      en: "Treat requests for payment, credentials, downloads, or link visits as unverified.",
      ta: "பணம், கடவுச்சொற்கள், பதிவிறக்கங்கள் அல்லது இணைப்புகளைத் திறக்கக் கோரும் கோரிக்கைகளை சரிபார்க்கப்படாததாகக் கருதுங்கள்.",
      hi: "भुगतान, पासवर्ड, डाउनलोड या लिंक खोलने के अनुरोधों को असत्यापित मानें।",
    },
    consequenceIfIgnored: {
      en: "Do not rely on threats in the notice. Verify independently with the named organization using contact details you find yourself.",
      ta: "அறிவிப்பில் உள்ள மிரட்டல்களை நம்ப வேண்டாம். அந்த நிறுவனத்தின் தொடர்பு விவரங்களை நீங்களே கண்டறிந்து தனியாகச் சரிபார்க்கவும்.",
      hi: "नोटिस में दी गई धमकियों पर भरोसा न करें। संगठन के संपर्क विवरण स्वयं खोजकर अलग से पुष्टि करें।",
    },
  },
  checklist: [
    {
      step: 1,
      action: {
        en: "Do not pay, reply, open links, or install files from this message.",
        ta: "இந்தச் செய்தியிலிருந்து பணம் செலுத்தவோ, பதிலளிக்கவோ, இணைப்புகளைத் திறக்கவோ அல்லது கோப்புகளை நிறுவவோ வேண்டாம்.",
        hi: "इस संदेश से भुगतान न करें, जवाब न दें, लिंक न खोलें और फ़ाइलें इंस्टॉल न करें।",
      },
      isOfficialChannel: false,
    },
    {
      step: 2,
      action: {
        en: "Find the organization's official website or phone number independently and verify the reference there.",
        ta: "நிறுவனத்தின் அதிகாரப்பூர்வ இணையதளம் அல்லது தொலைபேசி எண்ணை நீங்களே தேடி, அங்கு குறிப்பைச் சரிபார்க்கவும்.",
        hi: "संगठन की आधिकारिक वेबसाइट या फोन नंबर स्वयं खोजें और वहां संदर्भ की पुष्टि करें।",
      },
      isOfficialChannel: true,
    },
    {
      step: 3,
      action: {
        en: "If you already sent money or shared credentials, contact your bank promptly; in India, report cyber fraud at cybercrime.gov.in or 1930.",
        ta: "ஏற்கனவே பணம் அனுப்பியிருந்தாலோ விவரங்களைப் பகிர்ந்திருந்தாலோ, உடனே வங்கியைத் தொடர்புகொள்ளவும்; இந்தியாவில் cybercrime.gov.in அல்லது 1930 மூலம் இணையக் குற்றத்தைப் புகாரளிக்கவும்.",
        hi: "यदि आपने पैसे भेजे हैं या जानकारी साझा की है, तो तुरंत अपने बैंक से संपर्क करें; भारत में cybercrime.gov.in या 1930 पर साइबर धोखाधड़ी की रिपोर्ट करें।",
      },
      isOfficialChannel: true,
    },
  ],
  neutralReply: { en: "", ta: "", hi: "" },
};

const cautiousGuidance: SafeVerdictGuidance = {
  summary: {
    whatThisIs: {
      en: "The available signals are mixed or incomplete, so the notice cannot be confirmed here.",
      ta: "கிடைத்த அறிகுறிகள் கலந்தோ முழுமையற்றோ உள்ளதால், இந்த அறிவிப்பை இங்கே உறுதிப்படுத்த முடியாது.",
      hi: "उपलब्ध संकेत मिले-जुले या अधूरे हैं, इसलिए यहां इस नोटिस की पुष्टि नहीं की जा सकती।",
    },
    whatItDemands: {
      en: "The notice appears to request a response or action; confirm the exact requirement with the issuing organization.",
      ta: "அறிவிப்பு பதில் அல்லது நடவடிக்கையைக் கோருவது போலத் தெரிகிறது; சரியான தேவையை வழங்கிய நிறுவனத்திடம் உறுதிப்படுத்தவும்.",
      hi: "नोटिस में जवाब या कार्रवाई मांगी गई लगती है; जारी करने वाले संगठन से सही आवश्यकता की पुष्टि करें।",
    },
    consequenceIfIgnored: {
      en: "The consequences are not established by this check. Verify promptly through a contact channel found independently.",
      ta: "இந்தச் சரிபார்ப்பால் விளைவுகளை உறுதிப்படுத்த முடியாது. நீங்களே கண்டறிந்த தொடர்பு வழியில் விரைவாகச் சரிபார்க்கவும்.",
      hi: "इस जांच से परिणाम स्थापित नहीं होते। स्वयं खोजे गए संपर्क माध्यम से शीघ्र पुष्टि करें।",
    },
  },
  checklist: [
    {
      step: 1,
      action: {
        en: "Do not use payment details or links in the notice until verified.",
        ta: "சரிபார்க்கும் வரை அறிவிப்பில் உள்ள பண விவரங்கள் அல்லது இணைப்புகளைப் பயன்படுத்த வேண்டாம்.",
        hi: "पुष्टि होने तक नोटिस में दिए भुगतान विवरण या लिंक का उपयोग न करें।",
      },
      isOfficialChannel: false,
    },
    {
      step: 2,
      action: {
        en: "Contact the organization using its independently located official website or phone number.",
        ta: "நிறுவனத்தின் அதிகாரப்பூர்வ இணையதளம் அல்லது தொலைபேசி எண்ணை தனியாகக் கண்டறிந்து தொடர்புகொள்ளவும்.",
        hi: "संगठन की आधिकारिक वेबसाइट या फोन नंबर स्वयं खोजकर संपर्क करें।",
      },
      isOfficialChannel: true,
    },
    {
      step: 3,
      action: {
        en: "Ask whether the reference is valid and whether any response is required by a particular date.",
        ta: "குறிப்பு சரியானதா, குறிப்பிட்ட தேதிக்குள் பதில் தேவையா என்று கேளுங்கள்.",
        hi: "पूछें कि संदर्भ वैध है या नहीं और क्या किसी तारीख तक जवाब देना आवश्यक है।",
      },
      isOfficialChannel: true,
    },
  ],
  neutralReply: {
    en: "To the issuing office,\n\nI received a communication referring to [NOTICE_REFERENCE]. Please confirm through an official channel whether it was issued by your organization, what action (if any) is required, and the applicable response date. I will verify the reference independently before taking action.\n\nRegards,\n[PERSON_1]",
    ta: "வழங்கிய அலுவலகத்திற்கு,\n\n[NOTICE_REFERENCE] எனக் குறிப்பிடும் தகவல் எனக்குக் கிடைத்தது. அது உங்கள் நிறுவனத்தால் வழங்கப்பட்டதா, ஏதேனும் நடவடிக்கை தேவையா, பதிலளிக்க வேண்டிய தேதி என்ன என்பவற்றை அதிகாரப்பூர்வ வழியில் உறுதிப்படுத்தவும். நடவடிக்கை எடுப்பதற்கு முன் குறிப்பைத் தனியாகச் சரிபார்ப்பேன்.\n\nநன்றி,\n[PERSON_1]",
    hi: "जारी करने वाले कार्यालय के लिए,\n\nमुझे [NOTICE_REFERENCE] का उल्लेख करने वाला संदेश मिला है। कृपया आधिकारिक माध्यम से पुष्टि करें कि यह आपके संगठन ने जारी किया है या नहीं, क्या कोई कार्रवाई आवश्यक है, और जवाब की लागू तारीख क्या है। कार्रवाई से पहले मैं संदर्भ की स्वतंत्र रूप से पुष्टि करूंगा/करूंगी।\n\nसादर,\n[PERSON_1]",
  },
};

const genuineGuidance: SafeVerdictGuidance = {
  summary: {
    whatThisIs: {
      en: "The available indicators are more consistent with a routine communication, but this automated result does not prove authenticity.",
      ta: "கிடைத்த அறிகுறிகள் வழக்கமான தகவலுடன் அதிகம் பொருந்துகின்றன; இருப்பினும் இந்த தானியங்கி முடிவு உண்மைத்தன்மையை நிரூபிக்காது.",
      hi: "उपलब्ध संकेत सामान्य संचार से अधिक मेल खाते हैं, लेकिन यह स्वचालित परिणाम प्रामाणिकता सिद्ध नहीं करता।",
    },
    whatItDemands: {
      en: "Review the stated request and verify its reference through the organization's official channel.",
      ta: "கோரிக்கையைப் பரிசீலித்து, நிறுவனத்தின் அதிகாரப்பூர்வ வழியில் குறிப்பைச் சரிபார்க்கவும்.",
      hi: "बताए गए अनुरोध की समीक्षा करें और संगठन के आधिकारिक माध्यम से संदर्भ की पुष्टि करें।",
    },
    consequenceIfIgnored: {
      en: "This check cannot determine legal or financial consequences. Ask the organization directly if a deadline or action is unclear.",
      ta: "சட்ட அல்லது நிதி விளைவுகளை இந்தச் சரிபார்ப்பு தீர்மானிக்காது. காலக்கெடு அல்லது நடவடிக்கை தெளிவில்லையெனில் நிறுவனத்திடம் நேரடியாகக் கேளுங்கள்.",
      hi: "यह जांच कानूनी या वित्तीय परिणाम निर्धारित नहीं कर सकती। समय-सीमा या कार्रवाई स्पष्ट न हो तो संगठन से सीधे पूछें।",
    },
  },
  checklist: [
    {
      step: 1,
      action: {
        en: "Verify the notice reference using the official website or contact details you find independently.",
        ta: "நீங்களே கண்டறிந்த அதிகாரப்பூர்வ இணையதளம் அல்லது தொடர்பு விவரங்கள் மூலம் அறிவிப்பு குறிப்பைச் சரிபார்க்கவும்.",
        hi: "स्वयं खोजी गई आधिकारिक वेबसाइट या संपर्क विवरण से नोटिस संदर्भ की पुष्टि करें।",
      },
      isOfficialChannel: true,
    },
    {
      step: 2,
      action: {
        en: "Check the requested action and any deadline directly with the organization before responding.",
        ta: "பதில் அளிப்பதற்கு முன் கோரப்பட்ட நடவடிக்கை மற்றும் காலக்கெடுவை நிறுவனத்திடம் நேரடியாகச் சரிபார்க்கவும்.",
        hi: "जवाब देने से पहले अनुरोधित कार्रवाई और समय-सीमा की संगठन से सीधे पुष्टि करें।",
      },
      isOfficialChannel: true,
    },
  ],
  neutralReply: cautiousGuidanceReply(),
};

function cautiousGuidanceReply(): LocalizedText {
  return {
    en: "To the issuing office,\n\nI received your communication and would appreciate confirmation of its reference and any action or response date that applies. I will verify these details through an official channel.\n\nRegards,\n[PERSON_1]",
    ta: "வழங்கிய அலுவலகத்திற்கு,\n\nஉங்கள் தகவல் கிடைத்தது. அதன் குறிப்பையும் பொருந்தும் நடவடிக்கை அல்லது பதில் தேதியையும் உறுதிப்படுத்துமாறு கேட்டுக்கொள்கிறேன். இந்த விவரங்களை அதிகாரப்பூர்வ வழியில் சரிபார்ப்பேன்.\n\nநன்றி,\n[PERSON_1]",
    hi: "जारी करने वाले कार्यालय के लिए,\n\nआपका संदेश प्राप्त हुआ। कृपया इसके संदर्भ और लागू कार्रवाई या जवाब की तारीख की पुष्टि करें। मैं इन विवरणों को आधिकारिक माध्यम से सत्यापित करूंगा/करूंगी।\n\nसादर,\n[PERSON_1]",
  };
}

export function getSafeVerdictGuidance(verdict: Verdict): SafeVerdictGuidance {
  if (verdict === "likely_scam") return scamGuidance;
  if (verdict === "suspicious") return cautiousGuidance;
  return genuineGuidance;
}
