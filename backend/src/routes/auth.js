const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const AuthController = require('../controllers/authController');
const { authenticateToken, authenticateApiToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordChange = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidationErrors
];

const validatePasswordResetConfirm = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

const validateProfileUpdate = [
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
  handleValidationErrors
];

// Public routes
router.post('/login', validateLogin, AuthController.login);
router.post('/employee-login', validateLogin, AuthController.employeeLogin);
router.post('/password-reset', validatePasswordReset, AuthController.requestPasswordReset);
router.post('/password-reset/confirm', validatePasswordResetConfirm, AuthController.resetPassword);

// Protected routes (JWT)
router.post('/refresh', authenticateToken, AuthController.refreshToken);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, validateProfileUpdate, AuthController.updateProfile);
router.post('/change-password', authenticateToken, validatePasswordChange, AuthController.changePassword);
router.post('/generate-api-token', authenticateToken, AuthController.generateApiToken);

// API token routes (for desktop app)
router.post('/logout', authenticateApiToken, AuthController.logout);

module.exports = router;