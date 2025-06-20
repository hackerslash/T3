# Mercor Time Tracker System

A comprehensive time tracking system similar to Insightful, designed for Mercor's remote and hourly-based opportunities. The system consists of three main components:

## 🏗️ Architecture

```
T3/
├── backend/        # API Server (Insightful-Compatible)
├── web_app/        # Web App for Employee Onboarding  
└── desktop_app/    # Cross-platform Desktop Time Tracker
```

## 🚀 Quick Start

### 1. Backend API Server

```bash
cd backend
npm install
npm start
```

The backend server will start on `http://localhost:12000`

**Default Admin Account:**
- Email: `admin@mercor.com`
- Password: `Admin123!`

### 2. Web Application

```bash
cd web_app
npm install
npm run dev
```

The web app will start on `http://localhost:12001`

### 3. Desktop Application

```bash
cd desktop_app
npm install
npm start
```

## 📋 Features

### Backend API Server
- **Insightful-Compatible API** - Full compliance with Insightful API contract
- **Employee Management** - Add, activate, deactivate employees
- **Project & Task Management** - Create projects and assign employees
- **Time Tracking** - Record and manage time logs
- **Screenshot Management** - Handle screenshot uploads with metadata
- **Authentication** - JWT-based auth with API tokens
- **Email Integration** - Automated employee onboarding emails

### Web Application
- **Employee Onboarding** - Email verification and account activation
- **Secure Downloads** - Protected desktop app download links
- **Responsive Design** - Works on all devices
- **API Token Management** - Secure token display and copying

### Desktop Application
- **Cross-Platform** - Windows, macOS, and Linux support
- **Time Tracking** - Start/stop timers with project selection
- **Screenshot Capture** - Automatic periodic screenshots (every 10 minutes)
- **System Metadata** - Collects IP, MAC address, hostname, OS info
- **System Tray** - Unobtrusive background operation
- **Permission Handling** - Graceful handling of denied permissions

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=12000
JWT_SECRET=your-jwt-secret-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Web App (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:12000
API_URL=http://localhost:12000
```

**Desktop App:**
```env
API_URL=http://localhost:12000
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get user profile

### Employee Management
- `POST /api/employees` - Create employee
- `GET /api/employees` - List employees
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/verify` - Verify employee email

### Project Management
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/my-projects` - Get user's projects
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Time Tracking
- `POST /api/time-tracking/start` - Start time tracking
- `POST /api/time-tracking/:id/stop` - Stop time tracking
- `GET /api/time-tracking/current` - Get current active log
- `GET /api/time-tracking/logs` - Get time logs

### Screenshots
- `POST /api/screenshots/upload` - Upload screenshot
- `GET /api/screenshots` - List screenshots
- `GET /api/screenshots/:id` - Get screenshot details

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **API Rate Limiting** - Prevents abuse and DoS attacks
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Configurable cross-origin policies
- **Helmet Security** - Security headers and protections
- **Password Hashing** - bcrypt for secure password storage
- **File Upload Security** - Secure screenshot handling with compression

## 🧪 Testing

### Backend Testing
```bash
cd backend
# Test health endpoint
curl http://localhost:12000/health

# Test admin login
curl -X POST http://localhost:12000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mercor.com","password":"Admin123!"}'
```

### Employee Workflow Testing
1. Create employee via API
2. Check email for verification link
3. Visit web app to verify account
4. Download desktop app
5. Login with API token
6. Start time tracking

## 📱 Desktop App Usage

1. **First Time Setup:**
   - Launch the desktop application
   - Enter your API token (from email verification)
   - Select a project from the list

2. **Time Tracking:**
   - Click "Start Tracking" to begin
   - App runs in system tray
   - Screenshots taken every 10 minutes
   - Click "Stop Tracking" to end session

3. **System Tray:**
   - Right-click tray icon for quick actions
   - Start/stop tracking from tray menu
   - Show/hide main window

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Web App Development
```bash
cd web_app
npm run dev  # Starts Next.js dev server
```

### Desktop App Development
```bash
cd desktop_app
npm run dev  # Starts Electron in development mode
```

### Building Desktop App
```bash
cd desktop_app
npm run build      # Build for current platform
npm run build-all  # Build for all platforms
```

## 📦 Database Schema

The system uses SQLite with the following tables:
- `users` - Employee accounts
- `projects` - Project definitions
- `tasks` - Task assignments (one per project)
- `time_logs` - Time tracking records
- `screenshots` - Screenshot metadata and files
- `user_projects` - User-project assignments
- `api_tokens` - Authentication tokens

## 🚨 Troubleshooting

### Common Issues

**Desktop App Permission Errors:**
- macOS: Grant screen recording permission in System Preferences
- Windows: Run as administrator if needed
- Linux: Ensure X11 or Wayland permissions

**Screenshot Upload Failures:**
- Check network connectivity
- Verify API server is running
- Check file permissions in temp directory

**Authentication Issues:**
- Verify API token is correct
- Check token expiration
- Ensure backend server is accessible

### Logs and Debugging

**Backend Logs:**
```bash
cd backend
npm start  # Check console output
```

**Desktop App Logs:**
- Windows: `%APPDATA%\mercor-time-tracker\logs`
- macOS: `~/Library/Logs/mercor-time-tracker`
- Linux: `~/.config/mercor-time-tracker/logs`

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above