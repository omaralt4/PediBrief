import { google } from 'googleapis';

/**
 * Creates and returns an authenticated Gmail client
 */
export async function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  );

  // Set the refresh token
  if (process.env.GMAIL_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
  } else {
    throw new Error('GMAIL_REFRESH_TOKEN is not set. Please set up Gmail OAuth2.');
  }

  // Refresh the access token if needed
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Sends an email using Gmail API
 */
export async function sendEmailViaGmail(
  to: string,
  subject: string,
  htmlBody: string,
  fromEmail?: string
): Promise<string> {
  const gmail = await getGmailClient();
  const userEmail = fromEmail || process.env.GMAIL_USER_EMAIL;

  if (!userEmail) {
    throw new Error('GMAIL_USER_EMAIL is not set');
  }

  // Create email message in RFC 2822 format
  const message = [
    `To: ${to}`,
    `From: ${userEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    htmlBody,
  ].join('\n');

  // Encode message in base64url format
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send the email
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return response.data.id || 'unknown';
}

