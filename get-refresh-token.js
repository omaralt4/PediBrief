// Script to generate Gmail OAuth2 refresh token
// Run: node get-refresh-token.js
// Make sure to set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first

import { google } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env file');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent', // Force consent screen to get refresh token
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📧 Gmail OAuth2 Refresh Token Generator');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('STEP 1: Copy this URL and open it in your browser:\n');
console.log(authUrl);
console.log('\n');
console.log('STEP 2: You will see a Google sign-in page.');
console.log('   - Sign in with the Gmail account you want to use');
console.log('   - You may see "Google hasn\'t verified this app" - click "Advanced" then "Go to PediBrief"');
console.log('   - Click "Allow" to grant permissions');
console.log('\n');
console.log('STEP 3: After clicking Allow, you\'ll be redirected to a page that says "This site can\'t be reached"');
console.log('   - THIS IS NORMAL! Don\'t worry!');
console.log('   - Look at the URL bar in your browser');
console.log('   - You\'ll see something like: http://localhost:3000/oauth2callback?code=4/0AeanR...');
console.log('   - Copy the ENTIRE code value (everything after "code=" and before "&" if there is one)');
console.log('\n');
console.log('STEP 4: Paste the code below:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the code here: ', (code) => {
  rl.close();
  // Clean the code (remove any URL parameters or whitespace)
  const cleanCode = code.trim().split('&')[0].split('?code=').pop() || code.trim();
  
  console.log('\n⏳ Exchanging code for tokens...\n');
  
  oauth2Client.getToken(cleanCode, (err, token) => {
    if (err) {
      console.error('\n❌ Error retrieving access token:', err.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure you copied the ENTIRE code from the URL');
      console.error('   - The code should start with something like "4/0AeanR..."');
      console.error('   - Try the authorization URL again\n');
      process.exit(1);
    }
    
    if (!token || !token.refresh_token) {
      console.error('\n❌ No refresh token received.');
      console.error('\n💡 This usually means:');
      console.error('   - You already authorized this app before');
      console.error('   - Try revoking access at: https://myaccount.google.com/permissions');
      console.error('   - Then run this script again\n');
      process.exit(1);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Refresh token generated!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Add this line to your .env file:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}\n`);
    console.log('Also make sure you have this in your .env file:');
    console.log(`GMAIL_USER_EMAIL=your-email@gmail.com\n`);
    console.log('═══════════════════════════════════════════════════════════\n');
  });
});

