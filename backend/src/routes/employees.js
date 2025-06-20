const express = require('express');
const router = express.Router();

const EmployeeController = require('../controllers/employeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { 
  validateCreateEmployee, 
  validateUpdateEmployee, 
  validateUUID, 
  validatePagination 
} = require('../middleware/validation');

// Public route for email verification
router.post('/verify', EmployeeController.verifyEmployee);

// Protected routes - Admin only
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Employee CRUD operations
router.post('/', validateCreateEmployee, EmployeeController.createEmployee);
router.get('/', validatePagination, EmployeeController.getEmployees);
router.get('/:id', validateUUID, EmployeeController.getEmployee);
router.put('/:id', validateUpdateEmployee, EmployeeController.updateEmployee);

// Employee activation/deactivation
router.post('/:id/activate', validateUUID, EmployeeController.activateEmployee);
router.post('/:id/deactivate', validateUUID, EmployeeController.deactivateEmployee);

// Generate API token for employee
router.post('/:id/generate-token', validateUUID, EmployeeController.generateToken);

module.exports = router;