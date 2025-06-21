# Railway Deployment Guide for ExamGuard

This guide walks you through deploying the ExamGuard AI proctoring system to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Database**: You'll need a MongoDB service (Railway provides this)

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository has the following configuration files:

```
examguard/
├── backend/
│   ├── railway.json          # Backend service config
│   ├── Procfile              # Gunicorn startup command
│   ├── config.py             # Environment-based configuration
│   └── .env.production       # Production environment template
├── frontend/
│   ├── railway.json          # Frontend service config
│   └── .env.production       # Frontend environment template
└── railway.json              # Root project config
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your ExamGuard repository

### 3. Set Up MongoDB Service

1. In your Railway project dashboard, click "New Service"
2. Select "Database" → "MongoDB"
3. Note the connection string provided (MONGO_PRIVATE_URL)

### 4. Configure Backend Service

Railway will automatically detect your backend service from `backend/railway.json`.

**Required Environment Variables:**
```bash
# JWT Security
JWT_SECRET_KEY=your-super-secure-jwt-secret-key-here

# MongoDB (Railway provides this automatically)
MONGO_PRIVATE_URL=mongodb://mongo:27017/ai_proctor_db

# Flask Configuration
FLASK_ENV=production
PORT=8080

# CORS Configuration (set after frontend is deployed)
FRONTEND_URL=https://your-frontend-service.railway.app

# Logging
LOG_LEVEL=INFO

# File Upload Limits
MAX_CONTENT_LENGTH=16777216
```

**To set environment variables:**
1. Click on your backend service
2. Go to "Variables" tab
3. Add each variable above with appropriate values

### 5. Configure Frontend Service

Railway will automatically detect your frontend service from `frontend/railway.json`.

**Required Environment Variables:**
```bash
# Backend API URL (set after backend is deployed)
REACT_APP_API_URL=https://your-backend-service.railway.app

# WebSocket URL (usually same as API URL)
REACT_APP_WS_URL=https://your-backend-service.railway.app
```

### 6. Deploy Services

1. **Deploy Backend First:**
   - Railway will automatically build and deploy the backend
   - Wait for deployment to complete
   - Note the backend URL (e.g., `https://examguard-backend-production.railway.app`)

2. **Update Frontend Environment:**
   - Set `REACT_APP_API_URL` to your backend URL
   - Set `REACT_APP_WS_URL` to your backend URL

3. **Deploy Frontend:**
   - Railway will automatically build and deploy the frontend
   - Wait for deployment to complete
   - Note the frontend URL

4. **Update Backend CORS:**
   - Set `FRONTEND_URL` in backend environment to your frontend URL
   - Redeploy backend if necessary

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT tokens | `your-super-secure-secret` |
| `MONGO_PRIVATE_URL` | MongoDB connection string | `mongodb://mongo:27017/ai_proctor_db` |
| `FLASK_ENV` | Flask environment | `production` |
| `PORT` | Port for backend service | `8080` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://yourapp.railway.app` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://backend.railway.app` |
| `REACT_APP_WS_URL` | WebSocket URL | `https://backend.railway.app` |

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` in backend matches your frontend domain exactly
   - Check that both services are deployed and accessible

2. **Database Connection Issues**
   - Verify `MONGO_PRIVATE_URL` is set correctly
   - Ensure MongoDB service is running in Railway

3. **Build Failures**
   - Check build logs in Railway dashboard
   - Ensure all dependencies are listed in `package.json` or `requirements.txt`

4. **Environment Variables Not Loading**
   - Verify variables are set in Railway dashboard
   - Check variable names match exactly (case-sensitive)
   - Redeploy after adding new variables

### Debugging Steps

1. **Check Service Logs:**
   - Go to Railway dashboard
   - Click on your service
   - View "Logs" tab for error messages

2. **Test API Endpoints:**
   - Try accessing `https://your-backend.railway.app/api/health`
   - Should return `{"status": "healthy", "timestamp": "..."}`

3. **Verify Environment Variables:**
   - In Railway dashboard, check Variables tab
   - Ensure all required variables are set

## Production Considerations

### Security

1. **Generate Strong JWT Secret:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Use HTTPS Only:**
   - Railway provides HTTPS automatically
   - Ensure all environment URLs use `https://`

3. **Database Security:**
   - Use Railway's managed MongoDB
   - Ensure connection strings are kept secure

### Performance

1. **Backend Scaling:**
   - Railway auto-scales based on traffic
   - Monitor resource usage in dashboard

2. **Frontend Optimization:**
   - React build is automatically optimized
   - Static assets are served efficiently

### Monitoring

1. **Health Checks:**
   - Backend includes `/api/health` endpoint
   - Railway monitors this automatically

2. **Logs:**
   - Monitor logs in Railway dashboard
   - Set up alerts for critical errors

## Post-Deployment Testing

1. **Access your frontend URL**
2. **Test user registration and login**
3. **Start a proctoring session**
4. **Verify admin dashboard functionality**
5. **Check WebSocket connections work**
6. **Test file upload and image analysis**

## Support

If you encounter issues:

1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review application logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Test individual services using their health check endpoints