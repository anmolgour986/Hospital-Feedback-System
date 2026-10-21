// Automatic complaint categorisation + urgency detection (keyword scoring, English + Hindi)
const KEYWORDS = {
  'Doctor Behavior': ['doctor', 'physician', 'surgeon', 'consultant', 'dr ', 'dr.', 'diagnosis', 'did not examine', 'डॉक्टर', 'चिकित्सक', 'dactar'],
  'Staff Behavior': ['nurse', 'staff', 'rude', 'behaviour', 'behavior', 'attitude', 'ignored', 'misbehave', 'receptionist', 'ward boy', 'security guard', 'बदतमीज़ी', 'बदतमीजी', 'स्टाफ', 'नर्स', 'व्यवहार', 'badtameezi'],
  'Cleanliness & Hygiene': ['dirty', 'clean', 'hygiene', 'unhygienic', 'toilet', 'washroom', 'bathroom', 'smell', 'garbage', 'dust', 'mosquito', 'cockroach', 'bedsheet', 'gandagi', 'ganda', 'गंदगी', 'गंदा', 'सफाई', 'शौचालय', 'बदबू'],
  'Billing & Payments': ['bill', 'billing', 'charge', 'overcharged', 'payment', 'refund', 'insurance', 'cashless', 'invoice', 'expensive', 'money', 'fees', 'बिल', 'भुगतान', 'पैसे', 'शुल्क', 'महंगा', 'बीमा', 'mehnga'],
  'Waiting Time': ['wait', 'waiting', 'delay', 'delayed', 'queue', 'long time', 'hours', 'late', 'slow', 'appointment', 'इंतज़ार', 'इंतजार', 'देरी', 'लाइन', 'intezaar', 'der '],
  'Food & Nutrition': ['food', 'meal', 'diet', 'canteen', 'breakfast', 'lunch', 'dinner', 'cold food', 'tasteless', 'खाना', 'भोजन', 'नाश्ता', 'कैंटीन'],
  'Facilities & Infrastructure': ['bed', 'room', 'ac ', 'fan', 'lift', 'elevator', 'wifi', 'parking', 'wheelchair', 'equipment', 'power', 'water supply', 'light', 'broken', 'कमरा', 'बिस्तर', 'लिफ्ट', 'पार्किंग', 'पंखा', 'पानी'],
  'Treatment & Medical Care': ['treatment', 'surgery', 'operation', 'medical care', 'pain', 'wrong', 'infection', 'recovery', 'negligence', 'misdiagnosis', 'complication', 'इलाज', 'ऑपरेशन', 'दर्द', 'लापरवाही', 'laparwahi'],
  'Pharmacy & Medication': ['pharmacy', 'medicine', 'medication', 'tablet', 'injection', 'drug', 'prescription', 'out of stock', 'expired', 'दवा', 'दवाई', 'फार्मेसी', 'इंजेक्शन'],
  'Emergency Services': ['emergency', 'ambulance', 'icu', 'casualty', 'trauma', 'critical', 'accident', 'आपातकाल', 'इमरजेंसी', 'एम्बुलेंस', 'आईसीयू', 'दुर्घटना'],
};

const URGENT_STRONG = ['life threatening', 'life-threatening', 'not breathing', 'cardiac arrest', 'unconscious', 'heavy bleeding', 'severe bleeding', 'collapsed', 'सांस नहीं', 'बेहोश', 'जान का खतरा'];
const URGENT_MILD = ['emergency', 'urgent', 'critical', 'immediately', 'dying', 'serious', 'danger', 'ambulance', 'icu', 'अत्यंत', 'तुरंत', 'गंभीर', 'इमरजेंसी', 'आपातकाल'];

function categorize(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  let best = 'Other';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let s = 0;
    for (const w of words) if (t.includes(w)) s += w.length > 4 ? 2 : 1;
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return best;
}

// 0 = none, 1 = at least High, 2 = Urgent
function detectUrgency(text) {
  const t = String(text || '').toLowerCase();
  if (URGENT_STRONG.some((w) => t.includes(w))) return 2;
  if (URGENT_MILD.some((w) => t.includes(w))) return 1;
  return 0;
}

module.exports = { categorize, detectUrgency };
