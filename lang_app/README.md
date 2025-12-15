# 🌍 Language Learning Platform

A **cloud-based web application** for language learning with task management, vocabulary building, analytics, and progress tracking. Built with Flask, SQLAlchemy, and modern web technologies.

## 📋 Project Overview

This application addresses the real-world need for an integrated language learning platform that combines:
- **Vocabulary building** with translation API integration
- **Task management** for organizing learning goals
- **Progress tracking** with data visualization
- **User authentication** with secure password hashing
- **Email notifications** for reminders and milestones

## ✨ Features

### Core Requirements ✅

1. **User Registration and Authentication**
   - Secure user account creation and login
   - Passwords hashed using Werkzeug security
   - Session management with Flask-Login

2. **Data Storage and Management (CRUD)**
   - **Tasks**: Create, read, update, and delete learning tasks
   - **Vocabulary**: Add, view, and manage vocabulary entries
   - SQLite/PostgreSQL database with SQLAlchemy ORM
   - Optional MongoDB support for scalable data storage

3. **Data Retrieval and Presentation**
   - Dashboard with comprehensive analytics
   - Interactive charts and visualizations (Chart.js)
   - Progress tracking over time
   - Task completion statistics
   - Vocabulary by language breakdown

4. **Responsive Front-End Design**
   - Modern, mobile-friendly UI
   - Responsive grid layouts
   - Beautiful gradient design
   - Works on desktop, tablet, and mobile devices

### Additional Features 🚀

1. **API Integration**
   - LibreTranslate API for word translations
   - Support for multiple target languages
   - Automatic translation on vocabulary entry

2. **Advanced Data Visualization**
   - Chart.js integration for interactive charts
   - Task completion pie chart
   - Vocabulary by language bar chart
   - Learning progress line chart (30-day history)

3. **Notification System**
   - Email notifications via SendGrid (optional)
   - Task reminder emails
   - Learning milestone celebrations
   - Welcome emails for new users

4. **Quiz System**
   - Interactive vocabulary quizzes
   - Score tracking
   - Multiple choice and translation questions

## 🛠️ Technology Stack

- **Backend**: Flask 3.0.3, Python 3.11+
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: Flask-SQLAlchemy
- **Authentication**: Flask-Login, Werkzeug Security
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Chart.js 4.4.0
- **API Integration**: LibreTranslate, SendGrid (optional)
- **Deployment**: Gunicorn, Heroku/Railway ready

## 📦 Installation & Setup

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ri64-sudo/sdet101-testing.git
   cd sdet101-testing/lang_app
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Mac/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables** (optional)
   ```bash
   # Copy example env file
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   flask --app lang_app.app:create_app init-db
   ```

6. **Run development server**
   ```bash
   flask --app lang_app.app:create_app run --debug
   ```

7. **Open in browser**
   ```
   http://127.0.0.1:5000
   ```

## ☁️ Cloud Deployment

### Heroku Deployment

1. **Install Heroku CLI** and login
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set DATABASE_URL=postgresql://...
   heroku config:set SENDGRID_API_KEY=your-key  # Optional
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Initialize database**
   ```bash
   heroku run flask --app lang_app.app:create_app init-db
   ```

### Railway Deployment

1. **Connect GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on git push

### Environment Variables

- `SECRET_KEY`: Flask secret key (required)
- `DATABASE_URL`: Database connection string (optional, defaults to SQLite)
- `MONGO_URI`: MongoDB connection string (optional)
- `SENDGRID_API_KEY`: SendGrid API key for emails (optional)
- `SENDGRID_FROM_EMAIL`: Email address for notifications (optional)
- `LIBRE_TRANSLATE_URL`: Translation API endpoint (optional)

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/me` - Get current user info

### Tasks
- `GET /api/tasks/` - List all user tasks
- `POST /api/tasks/` - Create new task
- `PATCH /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task

### Vocabulary
- `GET /api/vocab/` - List all vocabulary entries
- `POST /api/vocab/` - Add new vocabulary word
- `GET /api/vocab/quiz` - Get quiz questions

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard data and statistics

## 🎯 Business Case

**Problem**: Language learners need a centralized platform to:
- Track vocabulary learning progress
- Manage learning tasks and goals
- Visualize progress over time
- Receive reminders and motivation

**Solution**: This platform provides an all-in-one solution combining task management, vocabulary building, progress analytics, and notifications in a user-friendly, cloud-based application.

## 🔒 Security Features

- Password hashing with Werkzeug
- Secure session management
- User-specific data isolation
- SQL injection protection (SQLAlchemy ORM)
- CSRF protection ready

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers (1920px+)
- Tablets (768px - 1024px)
- Mobile devices (320px - 767px)

## 🚀 Future Enhancements

- Role-based access control (admin/user roles)
- Social features (share progress, leaderboards)
- Advanced quiz types (multiple choice, fill-in-the-blank)
- Spaced repetition algorithm
- Mobile app (React Native)
- Offline mode support

## 📝 License

This project is part of an educational assignment.

## 👤 Author

Built as part of SDET101 Cloud-Based Web Application project.

## 🙏 Acknowledgments

- LibreTranslate for translation API
- Chart.js for data visualization
- Flask community for excellent documentation
