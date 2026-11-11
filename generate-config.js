const fs = require('node:fs');
const path = require('node:path');

// Locally, environment variables are loaded by Node via --env-file-if-exists
// (see package.json). On Vercel they are provided directly by the platform.

console.log('Generating public/config.js...');

const apiKey = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
const groupId = process.env.NEXT_PUBLIC_FLICKR_GROUP_ID;

if (!apiKey || !groupId) {
  console.error(
    '🔴 Error: NEXT_PUBLIC_FLICKR_API_KEY and NEXT_PUBLIC_FLICKR_GROUP_ID must be set in .env.local (or in the environment).'
  );
  process.exit(1);
}

const escape = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const configContent = `window.ENV = {
  NEXT_PUBLIC_FLICKR_API_KEY: '${escape(apiKey)}',
  NEXT_PUBLIC_FLICKR_GROUP_ID: '${escape(groupId)}'
};
`;

fs.writeFileSync(path.join(__dirname, 'public', 'config.js'), configContent);

console.log('✅ public/config.js generated successfully.');
