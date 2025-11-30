import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  AlertTriangle, 
  Pill, 
  Calendar, 
  Clock, 
  ChevronRight,
  CheckCircle,
  XCircle
} from "lucide-react";

export interface PediatricSummary {
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

interface SummaryDisplayProps {
  summary: PediatricSummary;
  onStartQuiz: () => void;
}

export function SummaryDisplay({ summary, onStartQuiz }: SummaryDisplayProps) {
  return (
    <section className="py-12 bg-background">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success mb-4">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Summary Generated</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              Your Child's Care Instructions
            </h2>
          </div>

          {/* Simple Explanation */}
          <Card variant="gradient" className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                What Happened
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed text-lg">
                {summary.simpleExplanation}
              </p>
            </CardContent>
          </Card>

          {/* Red Flags - Most Important */}
          <Card variant="coral" className="border-2 border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ Return to ER Immediately If...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    </div>
                    <span className="text-foreground font-medium">{flag}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* What To Do / Not Do Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* What To Do */}
            <Card variant="soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-success">
                  <CheckCircle className="w-5 h-5" />
                  What To Do
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {summary.whatToDo.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* What Not To Do */}
            <Card variant="outline" className="border-destructive/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
                  <XCircle className="w-5 h-5" />
                  What To Avoid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {summary.whatNotToDo.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Medications */}
          {summary.medications.length > 0 && (
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Pill className="w-5 h-5 text-primary" />
                  Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.medications.map((med, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-xl bg-secondary border border-border"
                    >
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        <span className="font-bold text-foreground text-lg">{med.name}</span>
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {med.dose}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span>{med.timing}</span>
                      </div>
                      {med.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Note: {med.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up */}
          <Card variant="elevated">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Follow-Up Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.followUp.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Expected Course */}
          <Card variant="gradient">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                What to Expect Over the Next 24-72 Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">
                {summary.expectedCourse}
              </p>
            </CardContent>
          </Card>

          {/* CTA to Quiz */}
          <div className="text-center pt-8">
            <p className="text-muted-foreground mb-4">
              Ready to confirm you understood the key points?
            </p>
            <Button variant="hero" size="xl" onClick={onStartQuiz}>
              <CheckCircle className="w-5 h-5 mr-2" />
              Take Understanding Quiz
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
