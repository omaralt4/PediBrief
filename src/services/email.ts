import { generateDeidentifiedId } from "@/utils/patientId";
import type { PediatricSummary } from "@/components/SummaryDisplay";

interface QuizAnswer {
  questionId: string;
  selectedOptionIndexes: number[];
  scoreFraction: number;
}

interface EmailQuizData {
  question: string;
  options: string[];
  correctOptions: number[];
  patientSelected: number[];
  isCorrect: boolean;
  explanation?: string;
}

export interface SendEmailRequest {
  doctorEmail: string;
  quizScore: number;
  quizData: EmailQuizData[];
  summary: PediatricSummary;
  patientId: string;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  patientId?: string;
}

/**
 * Sends quiz results to doctor via email
 */
export async function sendQuizResultsToDoctor(
  doctorEmail: string,
  quizScore: number,
  quizAnswers: QuizAnswer[],
  summary: PediatricSummary
): Promise<SendEmailResponse> {
  // Generate deidentified patient ID
  const patientId = generateDeidentifiedId();

  // Map quiz answers to email format
  const quizData: EmailQuizData[] = [];
  
  if (summary.quizQuestions && quizAnswers.length > 0) {
    for (const question of summary.quizQuestions) {
      const answer = quizAnswers.find((a) => a.questionId === question.id);
      if (!answer) continue; // Skip if no answer for this question
      
      const patientSelected = answer.selectedOptionIndexes || [];
      const correctSet = new Set(question.correctOptionIndexes);
      const selectedSet = new Set(patientSelected);
      
      // Check if all correct options were selected and no incorrect ones
      const isCorrect = 
        question.correctOptionIndexes.length > 0 &&
        question.correctOptionIndexes.every(idx => selectedSet.has(idx)) &&
        patientSelected.every(idx => correctSet.has(idx)) &&
        patientSelected.length === question.correctOptionIndexes.length;

      quizData.push({
        question: question.question,
        options: question.options,
        correctOptions: question.correctOptionIndexes,
        patientSelected,
        isCorrect,
        explanation: question.explanation,
      });
    }
  }

  const requestData: SendEmailRequest = {
    doctorEmail,
    quizScore,
    quizData,
    summary,
    patientId,
  };

  try {
    // Determine API endpoint based on environment
    // In production, use the deployed Vercel function URL
    // In local dev, use the local API server (if running) or Vercel dev
    const apiUrl = import.meta.env.VITE_API_URL || 
                   (import.meta.env.DEV ? 'http://localhost:3000/api/send-doctor-email' : '/api/send-doctor-email');
    
    console.log('Sending email request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Error response:', errorData);
      } catch (e) {
        const text = await response.text().catch(() => '');
        console.error('Error response text:', text);
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return {
      success: true,
      message: result.message || 'Email sent successfully',
      patientId,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to send email';
    
    // Check if it's a network error (API endpoint not found)
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        success: false,
        message: 'Cannot connect to email service. Make sure you are running on Vercel or have set up a local API server.',
        patientId,
      };
    }
    
    return {
      success: false,
      message: errorMessage,
      patientId,
    };
  }
}

