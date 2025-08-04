#!/bin/bash
echo "Generating config.js from Vercel environment variables..."

# Create the config.js file and inject the environment variables
echo "window.ENV = {" > config.js
echo "  NEXT_PUBLIC_FLICKR_API_KEY: '$NEXT_PUBLIC_FLICKR_API_KEY'," >> config.js
echo "  NEXT_PUBLIC_FLICKR_GROUP_ID: '$NEXT_PUBLIC_FLICKR_GROUP_ID'" >> config.js
echo "};" >> config.js

echo "✅ config.js generated successfully."