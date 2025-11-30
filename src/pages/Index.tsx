import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { SummaryInput } from "@/components/SummaryInput";
import { SummaryDisplay, type PediatricSummary } from "@/components/SummaryDisplay";
import { Quiz } from "@/components/Quiz";
import { PDFExport } from "@/components/PDFExport";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { processDischargeSummary, gradeQuizAnswer } from "@/services/gemini";

type AppState = "landing" | "input" | "summary" | "quiz" | "export";

interface QuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
}

// Process discharge summary using Gemini API
const processSummary = async (text: string): Promise<PediatricSummary> => {
  return await processDischargeSummary(text);
};

// Grade quiz answer using Gemini API
const gradeAnswer = async (
  question: { correctAnswer: string; question: string },
  answer: string,
  summaryContext: PediatricSummary
): Promise<{ isCorrect: boolean; feedback: string }> => {
  // Create a context string from the summary for better grading
  const context = `
Summary: ${summaryContext.simpleExplanation}
What To Do: ${summaryContext.whatToDo.join("; ")}
Red Flags: ${summaryContext.redFlags.join("; ")}
Medications: ${summaryContext.medications.map(m => `${m.name} - ${m.dose}, ${m.timing}`).join("; ")}
  `.trim();
  
  return await gradeQuizAnswer(question.question, question.correctAnswer, answer, context);
};

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [summary, setSummary] = useState<PediatricSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const { toast } = useToast();

  const handleGetStarted = () => {
    setAppState("input");
    setTimeout(() => {
      document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmitSummary = async (text: string) => {
    setIsProcessing(true);
    try {
      const result = await processSummary(text);
      setSummary(result);
      setAppState("summary");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error processing summary:", error);
      toast({
        title: "Error processing summary",
        description: error instanceof Error 
          ? error.message 
          : "Please try again. If the problem persists, check that you've pasted a complete discharge summary.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartQuiz = () => {
    setAppState("quiz");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGradeAnswer = async (
    question: { correctAnswer: string; question: string },
    answer: string
  ) => {
    setIsGrading(true);
    try {
      if (!summary) {
        throw new Error("Summary not available");
      }
      return await gradeAnswer(question, answer, summary);
    } catch (error) {
      console.error("Error grading answer:", error);
      // Fallback to simple keyword matching
      const keywords = question.correctAnswer.toLowerCase().split(/[;,\s]+/);
      const answerLower = answer.toLowerCase();
      const matchedKeywords = keywords.filter(kw => kw.length > 3 && answerLower.includes(kw));
      const isCorrect = matchedKeywords.length >= Math.min(3, keywords.length / 3);
      
      return {
        isCorrect,
        feedback: isCorrect 
          ? "Great! You've correctly identified the key points."
          : `The key points to remember are: ${question.correctAnswer.split(';').slice(0, 2).join(', ')}. Try to include these in your answer.`
      };
    } finally {
      setIsGrading(false);
    }
  };

  const handleQuizComplete = (score: number, answers: QuizAnswer[]) => {
    setQuizScore(score);
    setQuizAnswers(answers);
    setAppState("export");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartOver = () => {
    setSummary(null);
    setQuizScore(0);
    setQuizAnswers([]);
    setAppState("landing");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Landing State */}
        {(appState === "landing" || appState === "input") && (
          <>
            <Hero onGetStarted={handleGetStarted} />
            <HowItWorks />
            <SummaryInput onSubmit={handleSubmitSummary} isLoading={isProcessing} />
          </>
        )}

        {/* Summary State */}
        {appState === "summary" && summary && (
          <SummaryDisplay summary={summary} onStartQuiz={handleStartQuiz} />
        )}

        {/* Quiz State */}
        {appState === "quiz" && summary && (
          <Quiz 
            summary={summary} 
            onComplete={handleQuizComplete}
            isGrading={isGrading}
            onGradeAnswer={handleGradeAnswer}
          />
        )}

        {/* Export State */}
        {appState === "export" && summary && (
          <PDFExport 
            summary={summary}
            quizScore={quizScore}
            quizAnswers={quizAnswers}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
