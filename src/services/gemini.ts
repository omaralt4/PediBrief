import type { PediatricSummary } from "@/components/SummaryDisplay";
import { extractTextFromPDF } from "@/utils/pdfExtractor";

// Get API key from environment variable
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set. Please create a .env file with your API key.");
}
// Using Gemini 2.5 Flash - good balance of performance and cost
// Alternative models: gemini-2.5-pro (better reasoning, higher cost) or gemini-2.5-flash-lite (lower cost, faster)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `System Prompt: PediBrief Pediatric Discharge Simplifier

You are PediBrief, an AI assistant that rewrites pediatric discharge summaries into clear, parent-friendly explanations. Your output must ALWAYS stay strictly grounded in the content provided in the input discharge summary. You do NOT add any medical information that is not explicitly present. You NEVER guess or create new clinical details.

1. Absolute Rules

No hallucinations.
- You only use facts explicitly present in the input text.
- If something is not present, do not infer, imply, or invent it.
- No new diagnoses, symptoms, tests, treatments, or red flags.
- Only rewrite or extract what exists in the source.

No clinical judgment.
- You do not reinterpret the medical plan beyond rewriting it at a simpler reading level.

Never store, reference, or use identifiable data.
- Immediately discard or ignore any patient identifiers.
- Rewrite without names, MRNs, dates of birth, or unique identifiers.

2. Objectives

Given a pediatric discharge summary, produce a JSON object with the following structure:

{
  "simpleExplanation": "A short, clear explanation at 6th-8th grade reading level covering what the child was diagnosed with (if stated) and what was done (if stated).",
  "whatToDo": ["Array of action steps in plain English - medications (only exactly as stated), dosing/timing (only if explicitly in source), care instructions (hydration, feeding, activity limits), follow-up instructions"],
  "whatNotToDo": ["Array of things to avoid - only include restrictions listed in the input. Do not guess."],
  "redFlags": ["Array of red flags written in the discharge summary, rewritten in parent-friendly phrasing. Do not add new ones."],
  "medications": [{"name": "medication name", "dose": "dose as stated", "timing": "timing as stated", "notes": "optional notes"}],
  "followUp": ["Array of follow-up instructions"],
  "expectedCourse": "Rewrite only what the discharge summary states about the expected course. If not specified, state: 'The discharge summary does not specify what to expect over the next few days.'",
  "quizQuestions": [
    {
      "id": "string-unique-id",
      "question": "MCQ question text about a safety-critical concept",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctOptionIndexes": [0, 2],
      "category": "redFlag" | "medication" | "care" | "followUp",
      "explanation": "1–2 sentence, parent-friendly explanation shown after the parent answers.",
      "weight": 0–100 (number indicating importance; higher for safety-critical)
    }
  ]
}

3. Output Format

You MUST output ONLY valid JSON. No markdown formatting, no code blocks, no explanations outside the JSON. The JSON must match the structure exactly.

Additional quiz question requirements:
- Generate up to 5 total questions, but fewer is acceptable if information is limited.
- Focus FIRST on safety-critical items:
  - Red flags / when to return to ER
  - Medication dosing / timing
  - Required follow-up
- It is acceptable (but not required) to include 1–2 questions about general care instructions (whatToDo / whatNotToDo).
- Each question must have BETWEEN 2 AND 4 options.
- CRITICAL: Do NOT include any meta-options such as "all of the above", "none of the above", "all of the options above", "none of the options above", "a and b", "a and b only", "both a and b", or any similar options that refer to other options rather than providing direct answers.
- Multi-select is allowed: use "correctOptionIndexes" as an array containing the index(es) of ALL correct options. For example, if options 0 and 2 are both correct, use [0, 2]. You MUST label ALL correct options in the correctOptionIndexes array - do not omit any correct answers.
- Do NOT create options or correct answers that introduce new clinical facts not present in the discharge summary.
- "explanation" must clearly describe why the correct options are correct and the incorrect ones are not, using ONLY facts from the summary.

4. Tone & Style Requirements

- Clear, direct, non-technical language.
- No excess detail.
- No emotional language.
- No reassurance beyond what the clinician wrote.
- No speculation.
- No added timelines unless explicitly stated.
- No conditional medical advice.

5. Failure Mode Handling

If the input text is incomplete, heavily redacted, or missing essential elements:
- Still rewrite what is available.
- Use empty arrays for missing sections (whatToDo, whatNotToDo, redFlags, medications, followUp).
- For expectedCourse, if not specified, use: "The discharge summary does not specify what to expect over the next few days."
- For simpleExplanation, if no information is available, use: "The discharge summary does not provide enough information to generate an explanation. Please ask your physician for clarification."
- Do NOT infer missing information.
- When a section is empty (empty array or missing), the application will display a message prompting the user to ask their physician about that section.

6. Age Awareness

If the discharge summary mentions age, apply age-specific rewriting:
- Infants → simpler phrasing
- Teens → more straightforward phrasing
- Never change clinical meaning.
- If age is not stated, do NOT guess or invent.

7. Deidentification

Remove:
- Names
- Dates of birth
- Addresses
- MRNs
- Unique identifiers
- Refer to the child as "your child."

IMPORTANT: 
- Output ONLY the JSON object, nothing else.
- Ensure all strings are properly escaped (use \\n for newlines, \\" for quotes).
- Do not include any text, explanations, or markdown formatting outside the JSON.
- The JSON must be valid and parseable.
- Do not add any text before or after the JSON object.
- Escape all special characters in string values properly.`;

export interface GeminiSummaryResponse {
  simpleExplanation: string;
  whatToDo: string[];
  whatNotToDo: string[];
  redFlags: string[];
  medications: Array<{
    name: string;
    dose: string;
    timing: string;
    notes?: string;
  }>;
  followUp: string[];
  expectedCourse: string;
  quizQuestions?: Array<{
    id: string;
    question: string;
    options: string[];
    correctOptionIndexes: number[];
    category: "redFlag" | "medication" | "care" | "followUp";
    explanation?: string;
    weight?: number;
  }>;
}

/**
 * Extracts text from an image or PDF file
 * For PDFs: uses pdfjs-dist for reliable text extraction
 * For images: uses Gemini's vision API
 */
async function extractTextFromFile(file: File): Promise<string> {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  // For PDFs, use pdfjs-dist for more reliable extraction
  if (isPDF) {
    try {
      return await extractTextFromPDF(file);
    } catch (error) {
      console.warn('PDF extraction with pdfjs failed, trying Gemini:', error);
      // Fall through to Gemini vision as fallback
    }
  }

  // For images (or PDF fallback), use Gemini vision
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Determine MIME type
        let mimeType = file.type;
        if (!mimeType) {
          if (file.name.toLowerCase().endsWith('.png')) {
            mimeType = 'image/png';
          } else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          } else if (file.name.toLowerCase().endsWith('.webp')) {
            mimeType = 'image/webp';
          } else {
            mimeType = 'image/png'; // default
          }
        }

        const extractPrompt = `Extract all text from this document/image. Return ONLY the extracted text exactly as it appears, preserving line breaks and formatting. Do not summarize, interpret, or modify the text. If the document is a discharge summary or medical document, extract all medical information exactly as written.`;

        const response = await fetch(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: extractPrompt,
                    },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error(`No candidates in response`);
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          throw new Error(`No content in response`);
        }

        const extractedText = candidate.content.parts[0].text || "";
        resolve(extractedText.trim());
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function processDischargeSummary(
  dischargeText: string,
  file?: File
): Promise<PediatricSummary & { extractedTranscript?: string }> {
  let finalText = dischargeText;
  let extractedTranscript: string | undefined;

  // If a file is provided, extract text from it first
  if (file) {
    try {
      extractedTranscript = await extractTextFromFile(file);
      finalText = extractedTranscript;
    } catch (error) {
      console.error("Error extracting text from file:", error);
      throw new Error(
        `Failed to extract text from file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const prompt = `${SYSTEM_PROMPT}

Input discharge summary:
${finalText}

Output the JSON object now:`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192, // Increased significantly to handle full JSON response
            // Note: responseMimeType removed - parsing JSON from text response instead
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    // Log the full response structure for debugging
    console.log("Full API response:", JSON.stringify(data, null, 2));

    // Check for errors in the response
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // Check if candidates exist
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(`No candidates in response. Full response: ${JSON.stringify(data)}`);
    }

    const candidate = data.candidates[0];

    // Check if the response was truncated
    if (candidate.finishReason === "MAX_TOKENS") {
      throw new Error(
        `Response was truncated due to token limit. ` +
        `The model used ${data.usageMetadata?.thoughtsTokenCount || 0} thinking tokens. ` +
        `Please try again with a shorter discharge summary or the system will retry with increased limits.`
      );
    }

    // Check if candidate has content
    if (!candidate.content) {
      throw new Error(`Candidate has no content. Candidate: ${JSON.stringify(candidate)}`);
    }

    // Handle different response formats
    // When responseMimeType is "application/json", the structure might be different
    let responseText: string;
    
    // Check if content has parts (standard format)
    if (candidate.content.parts && candidate.content.parts.length > 0) {
      if (candidate.content.parts[0].text) {
        responseText = candidate.content.parts[0].text.trim();
      } else if (candidate.content.parts[0].inlineData) {
        // Handle inline data if present
        responseText = candidate.content.parts[0].inlineData.data;
      } else {
        // Try to stringify the part itself
        responseText = JSON.stringify(candidate.content.parts[0]);
      }
    } else {
      // When responseMimeType is "application/json", content might not have parts
      // Try alternative locations for the JSON response
      console.warn("Content has no parts, checking alternative response formats");
      console.log("Full candidate:", JSON.stringify(candidate, null, 2));
      
      // Check if there's a text field directly on the candidate
      if (candidate.text) {
        responseText = candidate.text.trim();
      } 
      // Check if the entire data object contains the JSON we need
      // Sometimes with responseMimeType, the JSON is in a different location
      else if (data.text) {
        responseText = data.text.trim();
      }
      // Try to find JSON in the response structure
      else {
        // Look for JSON-like structure in the response
        const responseStr = JSON.stringify(data);
        // Try to extract JSON from the stringified response
        responseText = responseStr;
      }
    }
    
    if (!responseText || responseText.length === 0) {
      throw new Error(`Could not extract response text. Full response: ${JSON.stringify(data, null, 2)}`);
    }

    // Log the raw response for debugging
    console.log("Raw Gemini response (first 1000 chars):", responseText.substring(0, 1000));

    // Try to extract JSON from the response (in case it's wrapped in markdown or has extra text)
    let jsonText = responseText;
    
    // Remove markdown code blocks if present (handle multiline and case-insensitive)
    jsonText = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/m, "");
    jsonText = jsonText.replace(/^```\s*/i, "").replace(/\s*```$/m, "");
    
    // Find the JSON object by finding the first { and matching }
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace === -1) {
      throw new Error(`No JSON object found in response. Response: ${responseText.substring(0, 300)}...`);
    }
    
    // Find the matching closing brace by counting braces
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < jsonText.length; i++) {
      if (jsonText[i] === '{') braceCount++;
      if (jsonText[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBrace = i;
          break;
        }
      }
    }
    
    if (lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(`Incomplete JSON object in response. Response: ${responseText.substring(0, 300)}...`);
    }
    
    jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    
    console.log("Extracted JSON text (first 500 chars):", jsonText.substring(0, 500));

    // Parse the JSON
    let parsed: GeminiSummaryResponse;
    try {
      parsed = JSON.parse(jsonText) as GeminiSummaryResponse;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Full JSON text:", jsonText);
      throw new Error(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown error"}. ` +
        `Response preview: ${responseText.substring(0, 300)}...`
      );
    }

    // Validate and transform to PediatricSummary format
    const summary: PediatricSummary & { extractedTranscript?: string } = {
      simpleExplanation: parsed.simpleExplanation || "The discharge summary was processed, but no explanation could be extracted.",
      whatToDo: Array.isArray(parsed.whatToDo) ? parsed.whatToDo : [],
      whatNotToDo: Array.isArray(parsed.whatNotToDo) ? parsed.whatNotToDo : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      followUp: Array.isArray(parsed.followUp) ? parsed.followUp : [],
      expectedCourse: parsed.expectedCourse || "The discharge summary does not specify what to expect over the next few days.",
      extractedTranscript: extractedTranscript,
    };

    // Attach quiz questions if present, with basic validation and defaults
    if (Array.isArray(parsed.quizQuestions)) {
      summary.quizQuestions = parsed.quizQuestions
        .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => {
          // Clamp options to max 4 as per spec (LLM should not generate "all of the above" type options)
          const options = q.options.filter(opt => opt && opt.trim()).slice(0, 4);
          const maxIndex = options.length - 1;
          const uniqueCorrectIndexes = Array.from(
            new Set(
              (q.correctOptionIndexes || [])
                .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx <= maxIndex)
            )
          );

          // Derive a default weight if not provided
          let weight = q.weight;
          if (typeof weight !== "number" || Number.isNaN(weight)) {
            switch (q.category) {
              case "redFlag":
                weight = 30;
                break;
              case "medication":
                weight = 25;
                break;
              case "followUp":
                weight = 20;
                break;
              case "care":
              default:
                weight = 15;
            }
          }

          return {
            id: q.id || q.question.slice(0, 32),
            question: q.question,
            options,
            correctOptionIndexes: uniqueCorrectIndexes.length > 0 ? uniqueCorrectIndexes : [0],
            category: q.category ?? "care",
            explanation: q.explanation,
            weight,
          };
        });
    }

    return summary;
  } catch (error) {
    console.error("Error processing discharge summary:", error);
    throw new Error(
      `Failed to process discharge summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function gradeQuizAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  summaryContext: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  const gradingPrompt = `You are grading a parent's answer to a quiz question about their child's discharge instructions.

Question: ${question}
Correct Answer (key points): ${correctAnswer}
User's Answer: ${userAnswer}

Context from discharge summary:
${summaryContext}

Evaluate if the user's answer demonstrates understanding of the key points. The answer does not need to match word-for-word, but should show comprehension of the essential safety-critical information.

Output a JSON object with this exact structure:
{
  "isCorrect": true or false,
  "feedback": "A brief, encouraging feedback message explaining what was correct or what key points were missed"
}

Be lenient with language differences but strict on safety-critical information. If the answer captures the essential meaning, mark it as correct.

Output ONLY the JSON object, nothing else.`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: gradingPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    // Check for errors in the response
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // Check if candidates exist
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(`No candidates in response. Full response: ${JSON.stringify(data)}`);
    }

    const candidate = data.candidates[0];

    // Check if candidate has content
    if (!candidate.content) {
      throw new Error(`Candidate has no content. Candidate: ${JSON.stringify(candidate)}`);
    }

    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error(`Content has no parts. Content: ${JSON.stringify(candidate.content)}`);
    }

    // Handle different response formats
    let responseText: string;
    
    if (candidate.content.parts[0].text) {
      responseText = candidate.content.parts[0].text.trim();
    } else if (candidate.content.parts[0].inlineData) {
      responseText = candidate.content.parts[0].inlineData.data;
    } else {
      console.warn("Unexpected response format, attempting to parse entire response as JSON");
      responseText = JSON.stringify(data);
    }

    // Try to extract JSON from the response
    let jsonText = responseText;
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse the JSON
    const parsed = JSON.parse(jsonText) as { isCorrect: boolean; feedback: string };

    return {
      isCorrect: parsed.isCorrect ?? false,
      feedback: parsed.feedback || "Thank you for your answer.",
    };
  } catch (error) {
    console.error("Error grading quiz answer:", error);
    // Fallback to a simple check
    const keywords = correctAnswer.toLowerCase().split(/[;,\s]+/);
    const answerLower = userAnswer.toLowerCase();
    const matchedKeywords = keywords.filter(
      (kw) => kw.length > 3 && answerLower.includes(kw)
    );
    const isCorrect = matchedKeywords.length >= Math.min(3, keywords.length / 3);

    return {
      isCorrect,
      feedback: isCorrect
        ? "Great! You've correctly identified the key points."
        : `The key points to remember are: ${correctAnswer.split(";").slice(0, 2).join(", ")}. Try to include these in your answer.`,
    };
  }
}

