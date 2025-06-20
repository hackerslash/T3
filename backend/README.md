# Insightful-Compatible Time Tracking Backend

A Node.js backend API that provides Insightful-compatible endpoints for time tracking, employee management, and screenshot monitoring.

## Features

- **Employee Management**: Create, activate, deactivate employees
- **Project Management**: Create projects and assign employees
- **Time Tracking**: Start/stop time logs with metadata collection
- **Screenshot Management**: Upload, store, and retrieve screenshots
- **Authentication**: JWT tokens for web app, API tokens for desktop app
- **Email Notifications**: Employee onboarding and verification
- **Security**: Rate limiting, input validation, secure file uploads

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**
   ```bash
   npm run init-db
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/generate-api-token` - Generate API token for desktop app

### Employees (Admin only)
- `POST /api/employees` - Create new employee
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `POST /api/employees/:id/activate` - Activate employee
- `POST /api/employees/:id/deactivate` - Deactivate employee
- `POST /api/employees/verify` - Verify employee email (public)

### Projects
- `POST /api/projects` - Create project (admin)
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project (admin)
- `DELETE /api/projects/:id` - Delete project (admin)
- `POST /api/projects/:id/assign` - Assign employee to project (admin)
- `DELETE /api/projects/:id/employees/:employee_id` - Remove employee from project (admin)
- `GET /api/projects/my-projects` - Get projects assigned to current user (API token)

### Time Tracking
- `POST /api/time-tracking/start` - Start time tracking (API token)
- `POST /api/time-tracking/:id/stop` - Stop time tracking (API token)
- `GET /api/time-tracking/current` - Get current active time log (API token)
- `GET /api/time-tracking` - List time logs
- `GET /api/time-tracking/:id` - Get time log details
- `PUT /api/time-tracking/:id` - Update time log description

### Screenshots
- `POST /api/screenshots/upload` - Upload screenshot (API token)
- `GET /api/screenshots` - List screenshots
- `GET /api/screenshots/:id` - Get screenshot details
- `GET /api/screenshots/:id/download` - Download screenshot file
- `DELETE /api/screenshots/:id` - Delete screenshot
- `GET /api/screenshots/stats` - Get screenshot statistics

## Authentication

### JWT Tokens (Web App)
Include in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### API Tokens (Desktop App)
Include in Authorization header:
```
Authorization: Bearer <api_token>
```

## Database Schema

The system uses SQLite with the following main tables:
- `users` - Employee information and authentication
- `projects` - Project definitions
- `tasks` - Tasks within projects (each project has one default task)
- `project_assignments` - Employee-project assignments
- `time_logs` - Time tracking records
- `screenshots` - Screenshot metadata and files
- `api_tokens` - API tokens for desktop app authentication

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- API token authentication for desktop apps
- Rate limiting
- Input validation and sanitization
- Secure file uploads with compression
- CORS protection
- Helmet security headers

## Email Configuration

Configure SMTP settings in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@mercor.com
FROM_NAME=Mercor Time Tracker
```

## File Storage

Screenshots are stored locally in the `uploads/screenshots/` directory, organized by user UUID. Files are automatically compressed to JPEG format.

## Default Admin Account

After running `npm run init-db`, a default admin account is created:
- Email: `admin@mercor.com`
- Password: `Admin123!`

**Important**: Change this password immediately after first login.

## Environment Variables

See `.env.example` for all available configuration options.

## Development

```bash
# Install dependencies
npm install

# Start in development mode with auto-reload
npm run dev

# Initialize/reset database
npm run init-db
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure secure JWT secret
3. Set up proper SMTP credentials
4. Configure allowed CORS origins
5. Set up reverse proxy (nginx/Apache)
6. Enable HTTPS
7. Set up file backup for screenshots

## API Compatibility

This backend is designed to be compatible with Insightful's API structure, making it easy to integrate with existing Insightful-compatible tools and workflows.