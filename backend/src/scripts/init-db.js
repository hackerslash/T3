require('dotenv').config();
const database = require('../models/database');
const AuthUtils = require('../utils/auth');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await database.connect();
    
    console.log('Creating admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await database.get(
      'SELECT id FROM users WHERE email = ?',
      ['admin@mercor.com']
    );

    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create admin user
      const adminUuid = AuthUtils.generateUUID();
      const adminPassword = 'Admin123!'; // Change this in production
      const passwordHash = await AuthUtils.hashPassword(adminPassword);

      await database.run(`
        INSERT INTO users (uuid, email, password_hash, first_name, last_name, is_active, is_verified, role)
        VALUES (?, ?, ?, ?, ?, 1, 1, ?)
      `, [adminUuid, 'admin@mercor.com', passwordHash, 'Admin', 'User', 'admin']);

      console.log('Admin user created successfully');
      console.log('Email: admin@mercor.com');
      console.log('Password: Admin123!');
      console.log('Please change the password after first login');
    }

    console.log('Creating sample project...');
    
    // Check if sample project exists
    const existingProject = await database.get(
      'SELECT id FROM projects WHERE name = ?',
      ['Sample Project']
    );

    if (existingProject) {
      console.log('Sample project already exists');
    } else {
      // Create sample project
      const projectUuid = AuthUtils.generateUUID();
      const adminUser = await database.get('SELECT id FROM users WHERE email = ?', ['admin@mercor.com']);
      
      const projectResult = await database.run(`
        INSERT INTO projects (uuid, name, description, created_by)
        VALUES (?, ?, ?, ?)
      `, [projectUuid, 'Sample Project', 'A sample project for testing time tracking', adminUser.id]);

      // Create default task for the project
      const taskUuid = AuthUtils.generateUUID();
      await database.run(`
        INSERT INTO tasks (uuid, name, description, project_id)
        VALUES (?, ?, ?, ?)
      `, [taskUuid, 'Sample Project - Default Task', 'Default task for Sample Project', projectResult.id]);

      console.log('Sample project created successfully');
    }

    console.log('Database initialization completed successfully');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;