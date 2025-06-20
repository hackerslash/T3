const express = require('express');
const router = express.Router();

const ProjectController = require('../controllers/projectController');
const { authenticateToken, authenticateApiToken, requireRole } = require('../middleware/auth');
const { 
  validateCreateProject, 
  validateUpdateProject, 
  validateUUID, 
  validatePagination 
} = require('../middleware/validation');

// Routes accessible by API token (desktop app)
router.get('/my-projects', authenticateApiToken, ProjectController.getMyProjects);

// Protected routes - JWT required
router.use(authenticateToken);

// Project CRUD operations
router.post('/', requireRole(['admin']), validateCreateProject, ProjectController.createProject);
router.get('/', validatePagination, ProjectController.getProjects);
router.get('/:id', validateUUID, ProjectController.getProject);
router.put('/:id', requireRole(['admin']), validateUpdateProject, ProjectController.updateProject);
router.delete('/:id', requireRole(['admin']), validateUUID, ProjectController.deleteProject);

// Project assignment operations (admin only)
router.post('/:id/assign', requireRole(['admin']), validateUUID, ProjectController.assignEmployee);
router.delete('/:id/employees/:employee_id', requireRole(['admin']), ProjectController.removeEmployee);

module.exports = router;