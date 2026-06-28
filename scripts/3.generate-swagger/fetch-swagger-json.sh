#!/bin/bash

# Script to fetch Swagger JSON from running server
# Usage: ./scripts/fetch-swagger-json.sh [PORT] [HOST]

PORT=${1:-8080}
HOST=${2:-localhost}
URL="http://${HOST}:${PORT}/docs/json"

echo "📥 Fetching Swagger JSON from ${URL}..."

# Create docs directory if it doesn't exist
mkdir -p docs

# Fetch and save the JSON
curl -s "${URL}" | jq '.' > docs/swagger.json

if [ $? -eq 0 ]; then
    echo "✅ Swagger JSON saved to docs/swagger.json"
    echo "📄 File size: $(du -h docs/swagger.json | cut -f1)"
else
    echo "❌ Failed to fetch Swagger JSON"
    echo "💡 Make sure your server is running on ${URL}"
    exit 1
fi

