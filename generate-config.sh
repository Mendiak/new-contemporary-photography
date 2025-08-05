#!/bin/bash
echo "Generating config.js from Vercel environment variables..."

# Create the config.js file using a "here document" for better readability.
cat > public/config.js << EOF
window.ENV = {
  NEXT_PUBLIC_FLICKR_API_KEY: '$NEXT_PUBLIC_FLICKR_API_KEY',
  NEXT_PUBLIC_FLICKR_GROUP_ID: '$NEXT_PUBLIC_FLICKR_GROUP_ID'
};
EOF

echo "✅ config.js generated successfully."