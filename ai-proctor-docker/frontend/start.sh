#!/bin/sh

echo "Starting nginx configuration..."
echo "PORT environment variable: $PORT"

# Handle Railway's dynamic PORT environment variable
if [ -n "$PORT" ]; then
  echo "Configuring nginx to listen on port $PORT"
  sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf
  sed -i "s/listen \[::]:80;/listen [::]:$PORT;/g" /etc/nginx/conf.d/default.conf
else
  echo "Using default port 80"
fi

echo "Final nginx configuration:"
cat /etc/nginx/conf.d/default.conf

echo "Testing nginx configuration..."
nginx -t

echo "Starting nginx..."
exec nginx -g "daemon off;"