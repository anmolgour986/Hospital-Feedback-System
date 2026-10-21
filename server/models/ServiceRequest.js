const mongoose = require('mongoose');
const crypto = require('crypto');
const { REQUEST_TYPES, REQUEST_STATUSES, PRIORITIES } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    by: { type: ObjectId, ref: 'User' },
    byName: String,
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, index: true },
    patient: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, enum: REQUEST_TYPES, required: true },
    department: { type: ObjectId, ref: 'Department', default: null },
    location: { type: String, trim: true, maxlength: 80, default: '' }, // ward / room / bed
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'Pending' },
    assignedTo: { type: ObjectId, ref: 'User', default: null },
    completedAt: Date,
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

requestSchema.index({ patient: 1, createdAt: -1 });
requestSchema.index({ status: 1, department: 1 });
requestSchema.index({ assignedTo: 1 });

requestSchema.pre('validate', function () {
  if (!this.requestId) this.requestId = `SRQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
});

module.exports = mongoose.model('ServiceRequest', requestSchema);
