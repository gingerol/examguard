# Railway Deployment Checklist

## Pre-Deployment Validation ✅

### Repository Structure
- [ ] `backend/railway.json` exists with correct configuration
- [ ] `frontend/railway.json` exists with correct configuration  
- [ ] `railway.json` exists at root with services configuration
- [ ] `backend/Procfile` exists with gunicorn command
- [ ] `backend/config.py` has production configuration class
- [ ] Environment variable templates exist (`.env.production` files)

### Frontend Configuration
- [ ] All hardcoded `localhost:5000` URLs replaced with `${API_BASE_URL}`
- [ ] `API_BASE_URL` constant defined in all frontend files that need it:
  - [ ] `src/App.js`
  - [ ] `src/components/AdminDashboard/AdminDashboard.js`
  - [ ] `src/components/AdminAlertLog/AdminAlertLog.js`
- [ ] Socket.io connections use `API_BASE_URL`
- [ ] `.env` file exists for local development
- [ ] `.env.production` template exists for Railway

### Backend Configuration
- [ ] Flask app uses `config.py` configuration system
- [ ] Production config class handles environment variables correctly
- [ ] CORS configuration supports both development and production
- [ ] Health check endpoint `/api/health` exists
- [ ] MongoDB connection uses environment variables
- [ ] JWT configuration uses environment variables

## Local Development Test ✅

### Environment Setup
- [ ] Backend starts with local environment variables
- [ ] Frontend starts and connects to backend
- [ ] Database connection works locally
- [ ] CORS allows frontend-backend communication

### Functionality Test
- [ ] User registration works
- [ ] User login works  
- [ ] JWT authentication works
- [ ] Student can start monitoring session
- [ ] Admin dashboard shows active sessions
- [ ] WebSocket connections work
- [ ] File upload and analysis work
- [ ] Session stopping works correctly

## Railway Deployment Checklist ✅

### Project Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Railway project created

### MongoDB Service
- [ ] MongoDB service added to Railway project
- [ ] `MONGO_PRIVATE_URL` noted for backend configuration

### Backend Deployment
- [ ] Backend service detected and configured
- [ ] Environment variables set:
  - [ ] `JWT_SECRET_KEY` (strong, unique value)
  - [ ] `MONGO_PRIVATE_URL` (from Railway MongoDB)
  - [ ] `FLASK_ENV=production`
  - [ ] `PORT=8080`
  - [ ] `LOG_LEVEL=INFO`
  - [ ] `MAX_CONTENT_LENGTH=16777216`
- [ ] Backend deployment successful
- [ ] Backend health check passes: `GET /api/health`
- [ ] Backend URL noted for frontend configuration

### Frontend Deployment  
- [ ] Frontend service detected and configured
- [ ] Environment variables set:
  - [ ] `REACT_APP_API_URL` (backend URL)
  - [ ] `REACT_APP_WS_URL` (backend URL) 
- [ ] Frontend deployment successful
- [ ] Frontend URL noted for backend CORS

### Final Configuration
- [ ] Backend `FRONTEND_URL` environment variable updated
- [ ] Backend redeployed with CORS configuration
- [ ] Both services accessible via HTTPS

## Post-Deployment Testing ✅

### Basic Functionality
- [ ] Frontend loads without errors
- [ ] API health check responds: `https://backend-url/api/health`
- [ ] No CORS errors in browser console
- [ ] Database connection working (check logs)

### Authentication Flow
- [ ] User registration works
- [ ] User login works
- [ ] JWT tokens issued correctly
- [ ] Protected routes require authentication
- [ ] Token expiry handled correctly

### Core Features
- [ ] Student can start proctoring session
- [ ] Webcam access works
- [ ] Microphone access works
- [ ] Face detection analysis works
- [ ] Audio analysis works
- [ ] Session data saved to database

### Admin Features
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] Active sessions display correctly
- [ ] WebSocket updates work
- [ ] Alert log displays
- [ ] Session details accessible

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Authentication errors handled
- [ ] Invalid sessions handled
- [ ] Browser console shows no critical errors

## Performance & Monitoring ✅

### Response Times
- [ ] API responses < 2 seconds
- [ ] Frontend loads < 5 seconds
- [ ] WebSocket connections establish quickly
- [ ] File uploads complete successfully

### Logging & Monitoring
- [ ] Backend logs accessible in Railway
- [ ] No critical errors in logs
- [ ] Health checks passing
- [ ] Resource usage within limits

## Security Validation ✅

### Environment Variables
- [ ] No hardcoded secrets in repository
- [ ] JWT secret is strong and unique
- [ ] Database credentials secure
- [ ] CORS restricted to frontend domain

### HTTPS & Communication
- [ ] All endpoints use HTTPS
- [ ] API calls use HTTPS
- [ ] WebSocket connections use WSS
- [ ] No mixed content warnings

## Troubleshooting Reference 🔧

### Common Issues & Solutions

**CORS Errors:**
- Check `FRONTEND_URL` matches frontend domain exactly
- Ensure no trailing slashes in URLs
- Verify backend redeployed after CORS config change

**Database Connection Fails:**
- Verify `MONGO_PRIVATE_URL` is correct
- Check MongoDB service is running
- Review connection string format

**Environment Variables Not Loading:**
- Verify variable names are exact (case-sensitive)
- Check Railway dashboard Variables tab
- Redeploy after adding new variables

**Build Failures:**
- Check build logs in Railway
- Verify all dependencies in package.json/requirements.txt
- Check for syntax errors

**WebSocket Connection Issues:**
- Ensure `REACT_APP_WS_URL` is set correctly
- Check for firewall/proxy blocking WebSockets
- Verify backend WebSocket setup

## Deployment Complete! 🎉

When all items are checked:
- [ ] Document final URLs for reference
- [ ] Update repository README with deployment info
- [ ] Set up monitoring alerts if needed
- [ ] Schedule regular health checks
- [ ] Plan for backup and scaling strategies