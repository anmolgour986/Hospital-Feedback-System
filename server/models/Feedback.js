const mongoose = require('mongoose');
const { VISIT_TYPES } = require('../utils/constants');

const feedbackSchema = new mongoose.Schema(
  {
    // null for QR/public submissions. For anonymous feedback by a logged-in patient the id is kept
    // only so the patient can see their own history; it is never exposed to staff/admin.
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    staffMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rating: { type: Number, min: 1, max: 5, required: true },
    staffRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000, default: '' },
    visitType: { type: String, enum: VISIT_TYPES, default: 'OPD' },
    isAnonymous: { type: Boolean, default: false },
    source: { type: String, enum: ['web', 'qr'], default: 'web' },
    sentiment: {
      score: Number,
      label: { type: String, enum: ['positive', 'neutral', 'negative'] },
    },
    language: { type: String, default: 'en' },
  },
  { timestamps: true }
);

feedbackSchema.index({ department: 1, createdAt: -1 });
feedbackSchema.index({ staffMember: 1 });
feedbackSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
