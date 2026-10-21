const { body } = require('express-validator');
const { PRIORITIES, CATEGORIES, REQUEST_TYPES, VISIT_TYPES } = require('../utils/constants');

exports.feedbackRules = [
  body('department').isMongoId().withMessage('Please select a department'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('staffMember').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid doctor/staff selection'),
  body('staffRating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Staff rating must be between 1 and 5'),
  body('comment').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }).withMessage('Comment is too long (max 2000 characters)'),
  body('visitType').optional({ checkFalsy: true }).isIn(VISIT_TYPES).withMessage('Invalid visit type'),
];

exports.complaintRules = [
  body('department').isMongoId().withMessage('Please select a department'),
  body('title').trim().isLength({ min: 5, max: 150 }).withMessage('Title must be 5-150 characters'),
  body('description').trim().isLength({ min: 10, max: 3000 }).withMessage('Description must be 10-3000 characters'),
  body('priority').optional({ checkFalsy: true }).isIn(PRIORITIES).withMessage('Invalid priority'),
  body('category').optional({ checkFalsy: true }).isIn([...CATEGORIES, 'Auto']).withMessage('Invalid category'),
];

exports.requestRules = [
  body('type').isIn(REQUEST_TYPES).withMessage('Please choose a request type'),
  body('department').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid department'),
  body('priority').optional({ checkFalsy: true }).isIn(PRIORITIES).withMessage('Invalid priority'),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 1000 }).withMessage('Description too long (max 1000)'),
  body('location').optional({ checkFalsy: true }).isString().isLength({ max: 80 }).withMessage('Location too long'),
];
