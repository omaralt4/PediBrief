// Serverless function for sending emails to doctors
// Works with Vercel, Netlify, or similar platforms

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EmailQuizData {
  question: string;
  options: string[];
  correctOptions: number[];
  patientSelected: number[];
  isCorrect: boolean;
  explanation?: string;
}

interface SendEmailRequest {
  doctorEmail: string;
  quizScore: number;
  quizData: EmailQuizData[];
  summary: any; // PediatricSummary type
  patientId: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { doctorEmail, quizScore, quizData, summary, patientId }: SendEmailRequest = req.body;

    // Validate input
    if (!doctorEmail || !doctorEmail.includes('@')) {
      return res.status(400).json({ message: 'Valid doctor email is required' });
    }

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    // Import Gmail service  
    const { sendEmailViaGmail } = await import('../src/utils/gmailService.ts');

    // Check Gmail credentials
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.error('Gmail credentials not set');
      return res.status(500).json({ 
        message: 'Email service is not configured. Please set Gmail OAuth2 credentials.' 
      });
    }

    // Create email HTML
    const emailHtml = createEmailTemplate(patientId, quizScore, quizData, summary);

    // Send email using Gmail API
    try {
      const emailId = await sendEmailViaGmail(
        doctorEmail,
        `PediBrief Quiz Results - Patient ID: ${patientId}`,
        emailHtml
      );
      
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        patientId,
        emailId,
      });
    } catch (error) {
      console.error('Gmail API error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to send email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Error in send-doctor-email:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

function createEmailTemplate(
  patientId: string,
  quizScore: number,
  quizData: EmailQuizData[],
  summary: any
): string {
  const date = new Date().toLocaleString();
  
  // Build quiz results HTML
  let quizResultsHtml = '';
  quizData.forEach((item, index) => {
    const selectedOptions = item.patientSelected.map(idx => item.options[idx]).join(', ') || 'None selected';
    const correctOptions = item.correctOptions.map(idx => item.options[idx]).join(', ');
    const statusIcon = item.isCorrect ? '✅' : '❌';
    const statusText = item.isCorrect ? 'Correct' : 'Incorrect';
    
    quizResultsHtml += `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${item.isCorrect ? '#22c55e' : '#ef4444'};">
        <h3 style="margin-top: 0; color: #1f2937;">Question ${index + 1}: ${item.question}</h3>
        <div style="margin: 15px 0;">
          <strong>Options:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            ${item.options.map((opt, optIdx) => {
              const isCorrect = item.correctOptions.includes(optIdx);
              const isSelected = item.patientSelected.includes(optIdx);
              let style = '';
              if (isCorrect && isSelected) style = 'background-color: #d1fae5; font-weight: bold;';
              else if (isCorrect) style = 'background-color: #fef3c7;';
              else if (isSelected) style = 'background-color: #fee2e2;';
              return `<li style="padding: 5px; margin: 3px 0; ${style}">${opt}</li>`;
            }).join('')}
          </ul>
        </div>
        <div style="margin: 10px 0;">
          <strong>${statusIcon} Patient Answer:</strong> ${selectedOptions} <span style="color: ${item.isCorrect ? '#22c55e' : '#ef4444'}; font-weight: bold;">(${statusText})</span>
        </div>
        <div style="margin: 10px 0;">
          <strong>Correct Answer:</strong> ${correctOptions}
        </div>
        ${item.explanation ? `<div style="margin: 10px 0; padding: 10px; background-color: #eff6ff; border-radius: 4px;"><strong>Explanation:</strong> ${item.explanation}</div>` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2d7a7a; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">PediBrief Quiz Results</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="margin-bottom: 25px; padding: 15px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #22c55e;">
            <p style="margin: 5px 0;"><strong>Patient Identifier:</strong> ${patientId}</p>
            <p style="margin: 5px 0;"><strong>Quiz Score:</strong> <span style="font-size: 20px; font-weight: bold; color: #22c55e;">${quizScore}/100</span></p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
          </div>

          <h2 style="color: #1f2937; border-bottom: 2px solid #2d7a7a; padding-bottom: 10px;">Quiz Questions and Answers</h2>
          
          ${quizResultsHtml}

          <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Note:</strong> This is a deidentified patient identifier. No protected health information (PHI) is included in this email.</p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>This email was automatically generated by PediBrief.</p>
            <p>For questions or concerns, please contact the patient's family directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

