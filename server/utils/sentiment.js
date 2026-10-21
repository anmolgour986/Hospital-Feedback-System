// NLP sentiment analysis: AFINN-based lexicon (English) extended with Hindi / Hinglish
// hospital-feedback vocabulary, blended with the star rating when one is given.
const Sentiment = require('sentiment');

const analyzer = new Sentiment();

const extras = {
  // Hinglish positive
  accha: 3, achha: 3, acha: 3, badhiya: 3, badiya: 3, behtareen: 4, shandar: 4, shaandaar: 4,
  mast: 2, shukriya: 2, dhanyavaad: 2, dhanyavad: 2, madadgar: 3, sahi: 1, saaf: 2,
  // Hinglish negative
  bura: -3, kharab: -3, ganda: -3, gandagi: -3, bekar: -3, bakwaas: -3, laparwahi: -4, dhokha: -4,
  mehnga: -2, mehngi: -2, der: -2, intezaar: -1, pareshan: -3, pareshani: -3, gussa: -3,
  badtameezi: -4, ghatiya: -4, sharmnak: -3,
  // Devanagari positive
  'अच्छा': 3, 'अच्छी': 3, 'बढ़िया': 3, 'बेहतरीन': 4, 'शानदार': 4, 'धन्यवाद': 2, 'शुक्रिया': 2, 'साफ': 2, 'मददगार': 3,
  // Devanagari negative
  'बुरा': -3, 'बुरी': -3, 'खराब': -3, 'गंदा': -3, 'गंदी': -3, 'गंदगी': -3, 'बेकार': -3, 'बकवास': -3,
  'लापरवाही': -4, 'धोखा': -4, 'महंगा': -2, 'महंगी': -2, 'देरी': -2, 'इंतज़ार': -1, 'इंतजार': -1,
  'परेशान': -3, 'परेशानी': -3, 'गुस्सा': -3, 'बदतमीज़ी': -4, 'बदतमीजी': -4, 'घटिया': -4,
  // Hospital specific English
  delay: -2, delayed: -2, rude: -3, dirty: -3, unhygienic: -3, overcharged: -3, negligence: -4, ignored: -3,
  neglected: -4, caring: 3, helpful: 3, polite: 2, clean: 2, professional: 3,
};

const PUNCT = /[।॥|?!,.;:()"“”‘’\-–—\/\\\[\]{}]/g;

function analyzeSentiment(text, rating) {
  const clean = String(text || '').replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
  let score = 0;
  if (clean) {
    const r = analyzer.analyze(clean, { extras });
    score = Math.max(-1, Math.min(1, r.comparative / 2));
  }
  if (typeof rating === 'number' && !Number.isNaN(rating)) {
    const rs = (rating - 3) / 2; // 1★ => -1, 5★ => +1
    score = clean ? 0.6 * score + 0.4 * rs : rs;
  }
  const label = score > 0.15 ? 'positive' : score < -0.15 ? 'negative' : 'neutral';
  return { score: Math.round(score * 1000) / 1000, label };
}

module.exports = { analyzeSentiment };
