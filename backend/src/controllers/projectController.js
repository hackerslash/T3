const database = require('../models/database');
const AuthUtils = require('../utils/auth');

class ProjectController {
  // Create new project
  async createProject(req, res) {
    try {
      const { name, description } = req.body;
      const createdBy = req.user.id;

      const uuid = AuthUtils.generateUUID();

      // Insert new project
      const result = await database.run(`
        INSERT INTO projects (uuid, name, description, created_by)
        VALUES (?, ?, ?, ?)
      `, [uuid, name, description || null, createdBy]);

      // Create default task for the project
      const taskUuid = AuthUtils.generateUUID();
      await database.run(`
        INSERT INTO tasks (uuid, name, description, project_id)
        VALUES (?, ?, ?, ?)
      `, [taskUuid, `${name} - Default Task`, `Default task for ${name}`, result.id]);

      // Get the created project with task
      const project = await database.get(`
        SELECT p.uuid as id, p.name, p.description, p.is_active, p.created_at, p.updated_at,
               t.uuid as default_task_id, t.name as default_task_name
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.uuid = ?
      `, [uuid]);

      res.status(201).json(project);

    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all projects
  async getProjects(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const projects = await database.all(`
        SELECT p.uuid as id, p.name, p.description, p.is_active, p.created_at, p.updated_at,
               COUNT(pa.user_id) as assigned_employees,
               GROUP_CONCAT(t.uuid) as task_ids,
               GROUP_CONCAT(t.name) as task_names
        FROM projects p
        LEFT JOIN project_assignments pa ON p.id = pa.project_id
        LEFT JOIN tasks t ON p.id = t.project_id AND t.is_active = 1
        GROUP BY p.id
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      // Format the response to include tasks as array
      const formattedProjects = projects.map(project => ({
        ...project,
        assigned_employees: parseInt(project.assigned_employees) || 0,
        tasks: project.task_ids ? project.task_ids.split(',').map((id, index) => ({
          id,
          name: project.task_names.split(',')[index]
        })) : []
      }));

      // Remove the concatenated fields
      formattedProjects.forEach(project => {
        delete project.task_ids;
        delete project.task_names;
      });

      const total = await database.get('SELECT COUNT(*) as count FROM projects');

      res.json({
        projects: formattedProjects,
        total: total.count,
        limit,
        offset
      });

    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get project by ID
  async getProject(req, res) {
    try {
      const { id } = req.params;

      const project = await database.get(`
        SELECT p.uuid as id, p.name, p.description, p.is_active, p.created_at, p.updated_at
        FROM projects p
        WHERE p.uuid = ?
      `, [id]);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get tasks for this project
      const tasks = await database.all(`
        SELECT uuid as id, name, description, is_active, created_at, updated_at
        FROM tasks
        WHERE project_id = (SELECT id FROM projects WHERE uuid = ?) AND is_active = 1
      `, [id]);

      // Get assigned employees
      const assignedEmployees = await database.all(`
        SELECT u.uuid as id, u.email, u.first_name, u.last_name, pa.assigned_at
        FROM users u
        JOIN project_assignments pa ON u.id = pa.user_id
        WHERE pa.project_id = (SELECT id FROM projects WHERE uuid = ?)
      `, [id]);

      project.tasks = tasks;
      project.assigned_employees = assignedEmployees;

      res.json(project);

    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update project
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      // Check if project exists
      const project = await database.get('SELECT id FROM projects WHERE uuid = ?', [id]);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await database.run(`
        UPDATE projects 
        SET ${updates.join(', ')} 
        WHERE uuid = ?
      `, values);

      // Return updated project
      const updatedProject = await database.get(`
        SELECT uuid as id, name, description, is_active, created_at, updated_at
        FROM projects 
        WHERE uuid = ?
      `, [id]);

      res.json(updatedProject);

    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete project
  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      // Check if project exists
      const project = await database.get('SELECT id FROM projects WHERE uuid = ?', [id]);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Soft delete - just mark as inactive
      await database.run(`
        UPDATE projects 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE uuid = ?
      `, [id]);

      // Also deactivate associated tasks
      await database.run(`
        UPDATE tasks 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE project_id = ?
      `, [project.id]);

      res.json({ message: 'Project deleted successfully' });

    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Assign employee to project
  async assignEmployee(req, res) {
    try {
      const { id } = req.params; // project id
      const { employee_id } = req.body;

      // Check if project exists
      const project = await database.get('SELECT id FROM projects WHERE uuid = ? AND is_active = 1', [id]);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if employee exists
      const employee = await database.get('SELECT id FROM users WHERE uuid = ? AND is_active = 1', [employee_id]);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Check if already assigned
      const existingAssignment = await database.get(
        'SELECT id FROM project_assignments WHERE user_id = ? AND project_id = ?',
        [employee.id, project.id]
      );

      if (existingAssignment) {
        return res.status(409).json({ error: 'Employee already assigned to this project' });
      }

      // Create assignment
      await database.run(`
        INSERT INTO project_assignments (user_id, project_id)
        VALUES (?, ?)
      `, [employee.id, project.id]);

      res.status(201).json({ message: 'Employee assigned to project successfully' });

    } catch (error) {
      console.error('Error assigning employee to project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Remove employee from project
  async removeEmployee(req, res) {
    try {
      const { id, employee_id } = req.params;

      // Check if project exists
      const project = await database.get('SELECT id FROM projects WHERE uuid = ?', [id]);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if employee exists
      const employee = await database.get('SELECT id FROM users WHERE uuid = ?', [employee_id]);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Remove assignment
      const result = await database.run(`
        DELETE FROM project_assignments 
        WHERE user_id = ? AND project_id = ?
      `, [employee.id, project.id]);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Employee not assigned to this project' });
      }

      res.json({ message: 'Employee removed from project successfully' });

    } catch (error) {
      console.error('Error removing employee from project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get projects assigned to current user (for desktop app)
  async getMyProjects(req, res) {
    try {
      const userId = req.user.id;

      const projects = await database.all(`
        SELECT p.uuid as id, p.name, p.description, p.is_active,
               t.uuid as default_task_id, t.name as default_task_name
        FROM projects p
        JOIN project_assignments pa ON p.id = pa.project_id
        LEFT JOIN tasks t ON p.id = t.project_id AND t.is_active = 1
        WHERE pa.user_id = ? AND p.is_active = 1
        ORDER BY p.name
      `, [userId]);

      // Group tasks by project
      const projectMap = new Map();
      
      projects.forEach(row => {
        if (!projectMap.has(row.id)) {
          projectMap.set(row.id, {
            id: row.id,
            name: row.name,
            description: row.description,
            is_active: row.is_active,
            tasks: []
          });
        }
        
        if (row.default_task_id) {
          projectMap.get(row.id).tasks.push({
            id: row.default_task_id,
            name: row.default_task_name
          });
        }
      });

      const result = Array.from(projectMap.values());

      res.json({ projects: result });

    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ProjectController();