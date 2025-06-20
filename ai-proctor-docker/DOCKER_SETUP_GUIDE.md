# ExamGuard Docker Setup Guide

This guide will help you run the ExamGuard AI proctoring system locally using Docker.

## Prerequisites

1. **Docker Desktop** installed and running
   - Download from: https://www.docker.com/products/docker-desktop/
   - Ensure Docker Compose is included (it comes with Docker Desktop)

2. **System Requirements**
   - At least 4GB RAM available for containers
   - 5GB free disk space for images
   - Camera and microphone access permissions

## Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd ai-proctor-docker
   ```

2. **Build and start all services:**
   ```bash
   docker compose up --build -d
   ```
   
   Note: First build takes 10-15 minutes as it downloads ML models and dependencies.

3. **Wait for services to be ready** (check with):
   ```bash
   docker compose logs
   ```

4. **Create an admin user** (required for first login):
   ```bash
   curl -X POST http://localhost:5000/register \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123", "role": "admin"}'
   ```

5. **Access the application:**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:5000
   - Login with: username `admin`, password `admin123`

## Service Details

### Frontend (React + Nginx)
- **URL**: http://localhost:3002
- **Container**: ai-proctor-frontend
- Features: Student monitoring dashboard, admin controls

### Backend (Flask + ML)
- **URL**: http://localhost:5000
- **Container**: ai-proctor-backend
- Features: Face detection, eye tracking, audio analysis, JWT auth

### Database (MongoDB)
- **URL**: mongodb://localhost:27017
- **Container**: ai-proctor-mongodb
- Database: ai_proctor_db

## Usage Instructions

### For Students:
1. Navigate to http://localhost:3002
2. **Register a new account** with role "student" or use existing credentials:
   - Test accounts: `student1` / `student2` (password: `student123`)
3. Login to access the student dashboard
4. Click "Start Monitoring" to begin exam session
5. Allow camera and microphone permissions when prompted
6. Stay focused on screen during monitoring (face detection active)
7. Your session will appear in the admin dashboard immediately

### For Administrators:
1. Login with admin credentials
2. View active monitoring sessions on dashboard
3. Click on student cards to see detailed session info
4. Review alerts and event logs
5. Take manual snapshots if needed

## Docker Commands Reference

### Basic Operations
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs

# Rebuild specific service
docker compose build backend
docker compose up -d backend

# View running containers
docker ps
```

### Development Commands
```bash
# Follow logs in real-time
docker compose logs -f

# Access backend container shell
docker exec -it ai-proctor-backend bash

# Access frontend container shell
docker exec -it ai-proctor-frontend sh

# Access MongoDB shell
docker exec -it ai-proctor-mongodb mongosh
```

### Troubleshooting
```bash
# Remove all containers and volumes (fresh start)
docker compose down -v

# Clean up Docker system
docker system prune -a

# Check service health
docker compose ps
```

## Troubleshooting

### Common Issues:

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :3002
   lsof -i :5000
   lsof -i :27017
   ```

2. **Camera/microphone not working:**
   - Ensure browser permissions are granted
   - Use HTTPS in production (cameras require secure context)
   - Check browser console for errors

3. **MongoDB connection issues:**
   ```bash
   # Check MongoDB logs
   docker logs ai-proctor-mongodb
   
   # Test MongoDB connection
   docker exec ai-proctor-mongodb mongosh --eval "db.runCommand('ping')"
   ```

4. **Backend ML model issues:**
   ```bash
   # Check backend logs for model loading errors
   docker logs ai-proctor-backend
   
   # Rebuild backend if models are corrupted
   docker compose build --no-cache backend
   ```

5. **Frontend build issues:**
   ```bash
   # Rebuild frontend
   docker compose build --no-cache frontend
   ```

### Performance Optimization:

1. **Increase Docker resources:**
   - Docker Desktop → Preferences → Resources
   - Allocate at least 4GB RAM and 2 CPU cores

2. **Free up space:**
   ```bash
   docker system prune -a --volumes
   ```

## Environment Configuration

The `.env` file contains important configuration:

```env
JWT_SECRET_KEY=<secure-random-key>
MONGO_URI=mongodb://mongodb:27017/ai_proctor_db
FLASK_ENV=development
```

For production deployment, update these values appropriately.

## Next Steps

1. **Test the student workflow:**
   - Go to http://localhost:3002
   - Login as `student1` / `student123` or create new student account
   - Start monitoring session and test webcam access
   - Check admin dashboard to see active session

2. **Test the admin workflow:**
   - Login as `admin` / `admin123`
   - View active student sessions in real-time
   - Click on student cards for detailed views
   - Review alert logs and monitoring events

3. **Additional testing:**
   - Test face detection with multiple faces or looking away
   - Test audio monitoring with background noise
   - Test session persistence across page refresh
   - Check alert generation and logging

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker and application logs
3. Ensure all prerequisites are met
4. Try a fresh Docker build with `--no-cache` flag