import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  RefreshCw,
  Trophy,
  AlertTriangle
} from "lucide-react";
import type { PediatricSummary } from "./SummaryDisplay";

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  weight: number; // Higher weight for safety-critical questions
  category: "redFlag" | "medication" | "care" | "followUp";
}

interface QuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
}

interface QuizProps {
  summary: PediatricSummary;
  onComplete: (score: number, answers: QuizAnswer[]) => void;
  isGrading: boolean;
  onGradeAnswer: (question: QuizQuestion, answer: string) => Promise<{ isCorrect: boolean; feedback: string }>;
}

function generateQuestions(summary: PediatricSummary): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  // Red flag question (highest weight)
  if (summary.redFlags.length > 0) {
    questions.push({
      id: "redFlag1",
      question: "What are the warning signs that should make you return to the ER immediately?",
      correctAnswer: summary.redFlags.join("; "),
      weight: 30,
      category: "redFlag",
    });
  }

  // Medication question
  if (summary.medications.length > 0) {
    const med = summary.medications[0];
    questions.push({
      id: "med1",
      question: `For the medication "${med.name}", what is the dose and how often should it be given?`,
      correctAnswer: `${med.dose}, ${med.timing}`,
      weight: 25,
      category: "medication",
    });
  }

  // Care question
  if (summary.whatToDo.length > 0) {
    questions.push({
      id: "care1",
      question: "Name at least two things you should do to help your child recover.",
      correctAnswer: summary.whatToDo.slice(0, 3).join("; "),
      weight: 20,
      category: "care",
    });
  }

  // What to avoid
  if (summary.whatNotToDo.length > 0) {
    questions.push({
      id: "avoid1",
      question: "What should you avoid doing while your child recovers?",
      correctAnswer: summary.whatNotToDo.join("; "),
      weight: 15,
      category: "care",
    });
  }

  // Follow-up question
  if (summary.followUp.length > 0) {
    questions.push({
      id: "followUp1",
      question: "What follow-up appointments or tasks do you need to complete?",
      correctAnswer: summary.followUp.join("; "),
      weight: 10,
      category: "followUp",
    });
  }

  return questions;
}

export function Quiz({ summary, onComplete, isGrading, onGradeAnswer }: QuizProps) {
  const [questions] = useState(() => generateQuestions(summary));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isComplete = currentIndex >= questions.length;

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !currentQuestion) return;

    const result = await onGradeAnswer(currentQuestion, currentAnswer);
    setFeedback(result);

    if (result.isCorrect || retryCount >= 1) {
      // Move to next question
      setAnswers([...answers, {
        questionId: currentQuestion.id,
        answer: currentAnswer,
        isCorrect: result.isCorrect,
        feedback: result.feedback,
      }]);
      
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setCurrentAnswer("");
        setFeedback(null);
        setRetryCount(0);
      }, 2000);
    } else {
      setRetryCount(retryCount + 1);
    }
  };

  const calculateScore = () => {
    const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);
    const earnedWeight = answers.reduce((sum, a) => {
      const q = questions.find(q => q.id === a.questionId);
      return sum + (a.isCorrect ? (q?.weight || 0) : 0);
    }, 0);
    return Math.round((earnedWeight / totalWeight) * 100);
  };

  if (isComplete) {
    const score = calculateScore();
    return (
      <section className="py-12 bg-cream">
        <div className="container px-4">
          <div className="max-w-2xl mx-auto">
            <Card variant="elevated" className="text-center">
              <CardContent className="py-12">
                <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  score >= 70 ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  {score >= 70 ? (
                    <Trophy className="w-10 h-10 text-success" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-warning" />
                  )}
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Your Score: {score}/100
                </h2>
                <p className={`text-lg mb-8 ${score >= 70 ? 'text-success' : 'text-warning'}`}>
                  {score >= 70 
                    ? "Great job! You understand the key care instructions."
                    : "Review the summary again - some key points need attention."
                  }
                </p>

                {/* Answer Summary */}
                <div className="text-left space-y-4 mb-8">
                  {answers.map((answer, index) => (
                    <div 
                      key={answer.questionId}
                      className={`p-4 rounded-xl border ${
                        answer.isCorrect 
                          ? 'bg-success/5 border-success/20' 
                          : 'bg-coral-light border-accent/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {answer.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            {questions[index]?.question}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {answer.feedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="hero" 
                  size="xl"
                  onClick={() => onComplete(score, answers)}
                >
                  Continue to PDF Export
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-cream">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                currentQuestion?.category === 'redFlag' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {currentQuestion?.category === 'redFlag' ? '⚠️ Safety Critical' : 
                 currentQuestion?.category === 'medication' ? '💊 Medication' :
                 currentQuestion?.category === 'followUp' ? '📅 Follow-up' : '🏥 Care'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-xl">{currentQuestion?.question}</CardTitle>
              <CardDescription>
                Answer in your own words based on the summary you received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your answer here..."
                className="min-h-[120px] text-base"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                disabled={isGrading}
              />

              {/* Feedback */}
              {feedback && (
                <div className={`p-4 rounded-xl animate-scale-in ${
                  feedback.isCorrect 
                    ? 'bg-success/10 border border-success/20' 
                    : 'bg-coral-light border border-accent/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {feedback.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold mb-1 ${
                        feedback.isCorrect ? 'text-success' : 'text-accent'
                      }`}>
                        {feedback.isCorrect ? "Correct!" : "Not quite right"}
                      </p>
                      <p className="text-sm text-foreground">{feedback.feedback}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {feedback && !feedback.isCorrect && retryCount < 1 ? (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1"
                    onClick={() => {
                      setCurrentAnswer("");
                      setFeedback(null);
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                ) : (
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="flex-1"
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim() || isGrading}
                  >
                    {isGrading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Checking...
                      </>
                    ) : (
                      <>
                        Submit Answer
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
