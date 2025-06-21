# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
# Using npm ci is generally recommended for CI/CD if package-lock.json is present for reproducible builds
# For this setup, npm install is fine.
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built static files from the builder stage to Nginx html directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the custom Nginx configuration
# This nginx.conf should be configured to serve a Single Page Application (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Add a startup script to handle Railway's PORT environment variable
RUN echo '#!/bin/sh\n\
if [ -n "$PORT" ]; then\n\
  sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf\n\
  sed -i "s/listen \\[\\:\\:\\]\\:80;/listen [\\:\\:]\\:$PORT;/g" /etc/nginx/conf.d/default.conf\n\
fi\n\
nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Start Nginx with PORT handling
CMD ["/start.sh"] 