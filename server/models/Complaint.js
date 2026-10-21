const mongoose = require('mongoose');
const crypto = require('crypto');
const { CATEGORIES, PRIORITIES, COMPLAINT_STATUSES } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const responseSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: 'User' },
    authorName: String,
    authorRole: String,
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    internal: { type: Boolean, default: false }, // internal notes visible to staff/admin only
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const timelineSchema = new mongoose.Schema(
  {
    action: String,
    by: { type: ObjectId, ref: 'User' },
    byName: String,
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, index: true },
    patient: { type: ObjectId, ref: 'User', required: true },
    department: { type: ObjectId, ref: 'Department', required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 3000 },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    priorityRank: { type: Number, default: 1 }, // numeric copy of priority so it can be sorted in the DB
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'Open' },
    isAnonymous: { type: Boolean, default: false },
    assignedTo: { type: ObjectId, ref: 'User', default: null },
    sentiment: { score: Number, label: String },
    dueAt: Date,
    escalated: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 },
    escalatedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    resolutionTimeHours: { type: Number, default: null },
    resolutionRating: { type: Number, min: 1, max: 5 },
    resolutionFeedback: { type: String, maxlength: 500 },
    responses: [responseSchema],
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ patient: 1, createdAt: -1 });
complaintSchema.index({ dueAt: 1 });

complaintSchema.pre('validate', function () {
  this.priorityRank = Math.max(PRIORITIES.indexOf(this.priority), 0);
  if (!this.ticketId) {
    const d = new Date();
    const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.ticketId = `CMP-${ym}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
