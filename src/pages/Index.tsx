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
import { processDischargeSummary } from "@/services/gemini";

type AppState = "landing" | "input" | "summary" | "quiz" | "export";

interface QuizAnswer {
  questionId: string;
  // For MCQ, we store which options were selected and how correct they were
  selectedOptionIndexes: number[];
  scoreFraction: number;
}

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

  const handleSubmitSummary = async (text: string, file?: File) => {
    setIsProcessing(true);
    try {
      const result = await processDischargeSummary(text, file);
      setSummary(result);
      setAppState("summary");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error processing summary:", error);
      toast({
        title: "Error processing summary",
        description: error instanceof Error 
          ? error.message 
          : "Please try again. If the problem persists, check that you've pasted a complete discharge summary or uploaded a valid file.",
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
