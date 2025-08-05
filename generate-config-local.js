const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

console.log("Generating config.js for local development...");

const apiKey = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
const groupId = process.env.NEXT_PUBLIC_FLICKR_GROUP_ID;

if (!apiKey || !groupId) {
  console.error("🔴 Error: Make sure NEXT_PUBLIC_FLICKR_API_KEY and NEXT_PUBLIC_FLICKR_GROUP_ID are set in your .env.local file.");
  process.exit(1); // Exit with an error code
}

const configContent = `window.ENV = {
  NEXT_PUBLIC_FLICKR_API_KEY: '${apiKey}',
  NEXT_PUBLIC_FLICKR_GROUP_ID: '${groupId}'
};
`;

fs.writeFileSync(path.join(__dirname, 'public', 'config.js'), configContent);

console.log("✅ public/config.js generated successfully. You can now start Live Server.");