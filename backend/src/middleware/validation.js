const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Employee validation rules
const validateCreateEmployee = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

const validateUpdateEmployee = [
  param('id').isUUID().withMessage('Valid employee ID is required'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  handleValidationErrors
];

// Project validation rules
const validateCreateProject = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

const validateUpdateProject = [
  param('id').isUUID().withMessage('Valid project ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  handleValidationErrors
];

// Time tracking validation rules
const validateStartTimeLog = [
  body('project_id')
    .isUUID()
    .withMessage('Valid project ID is required'),
  body('task_id')
    .optional()
    .isUUID()
    .withMessage('Valid task ID is required if provided'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('ip_address')
    .optional()
    .isIP()
    .withMessage('Valid IP address required if provided'),
  body('mac_address')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Valid MAC address required if provided'),
  body('hostname')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Hostname must be less than 100 characters'),
  body('os_info')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('OS info must be less than 200 characters'),
  handleValidationErrors
];

const validateStopTimeLog = [
  param('id').isUUID().withMessage('Valid time log ID is required'),
  handleValidationErrors
];

// Screenshot validation rules
const validateScreenshotQuery = [
  query('user_id')
    .optional()
    .isUUID()
    .withMessage('Valid user ID is required if provided'),
  query('time_log_id')
    .optional()
    .isUUID()
    .withMessage('Valid time log ID is required if provided'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required if provided'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required if provided'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  handleValidationErrors
];

// Generic validation rules
const validateUUID = [
  param('id').isUUID().withMessage('Valid ID is required'),
  handleValidationErrors
];

const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreateEmployee,
  validateUpdateEmployee,
  validateCreateProject,
  validateUpdateProject,
  validateStartTimeLog,
  validateStopTimeLog,
  validateScreenshotQuery,
  validateUUID,
  validatePagination
};