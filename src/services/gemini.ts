import type { PediatricSummary } from "@/components/SummaryDisplay";

// Get API key from environment variable or use the provided key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyC5SD6x8Fg-9nguqp7RoQk5dbsvmaPrXqE";
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
  "expectedCourse": "Rewrite only what the discharge summary states about the expected course. If not specified, state: 'The discharge summary does not specify what to expect over the next few days.'"
}

3. Output Format

You MUST output ONLY valid JSON. No markdown formatting, no code blocks, no explanations outside the JSON. The JSON must match the structure exactly.

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
- Use empty arrays for missing sections.
- For expectedCourse, if not specified, use: "The discharge summary does not specify what to expect over the next few days."
- Do NOT infer missing information.

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
}

export async function processDischargeSummary(
  dischargeText: string
): Promise<PediatricSummary> {
  const prompt = `${SYSTEM_PROMPT}

Input discharge summary:
${dischargeText}

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
    return {
      simpleExplanation: parsed.simpleExplanation || "The discharge summary was processed, but no explanation could be extracted.",
      whatToDo: Array.isArray(parsed.whatToDo) ? parsed.whatToDo : [],
      whatNotToDo: Array.isArray(parsed.whatNotToDo) ? parsed.whatNotToDo : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      followUp: Array.isArray(parsed.followUp) ? parsed.followUp : [],
      expectedCourse: parsed.expectedCourse || "The discharge summary does not specify what to expect over the next few days.",
    };
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

