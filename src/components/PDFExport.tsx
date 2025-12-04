import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, RefreshCw, CheckCircle, Trophy, Mail, AlertCircle } from "lucide-react";
import { jsPDF } from "jspdf";
import type { PediatricSummary } from "./SummaryDisplay";
import { sendQuizResultsToDoctor } from "@/services/email";
import { useToast } from "@/hooks/use-toast";

interface QuizAnswer {
  questionId: string;
  selectedOptionIndexes: number[];
  scoreFraction: number;
}

interface PDFExportProps {
  summary: PediatricSummary;
  quizScore: number;
  quizAnswers: QuizAnswer[];
  onStartOver: () => void;
}

export function PDFExport({ summary, quizScore, quizAnswers, onStartOver }: PDFExportProps) {
  const [doctorEmail, setDoctorEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!doctorEmail || !doctorEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid doctor email address",
        variant: "destructive",
      });
      return;
    }

    if (!consentGiven) {
      toast({
        title: "Consent required",
        description: "Please confirm that you consent to share quiz results with your doctor",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    const result = await sendQuizResultsToDoctor(
      doctorEmail,
      quizScore,
      quizAnswers,
      summary
    );

    setIsSendingEmail(false);

    if (result.success) {
      setEmailSent(true);
      setPatientId(result.patientId || null);
      toast({
        title: "Email sent successfully",
        description: `Quiz results sent to ${doctorEmail}. Patient ID: ${result.patientId}`,
      });
    } else {
      toast({
        title: "Failed to send email",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Helper function for text wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 11) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(45, 127, 120); // Primary teal color
    doc.text("PediBrief", margin, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Your Child's Care Summary", margin, yPos);
    yPos += 15;

    // Score badge
    doc.setFillColor(quizScore >= 70 ? 34 : 245, quizScore >= 70 ? 197 : 158, quizScore >= 70 ? 94 : 11);
    doc.roundedRect(margin, yPos, 50, 15, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Quiz Score: ${quizScore}/100`, margin + 5, yPos + 10);
    yPos += 25;

    // Reset text color
    doc.setTextColor(50, 50, 50);

    // Simple Explanation
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("What Happened", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    yPos = addWrappedText(summary.simpleExplanation, margin, yPos, contentWidth);
    yPos += 10;

    // Red Flags
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69); // Red
    doc.text("Return to ER Immediately If:", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    summary.redFlags.forEach((flag) => {
      yPos = addWrappedText(`• ${flag}`, margin + 5, yPos, contentWidth - 10);
      yPos += 3;
    });
    yPos += 7;

    // What To Do
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94); // Green
    doc.text("What To Do", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    summary.whatToDo.forEach((item) => {
      yPos = addWrappedText(`• ${item}`, margin + 5, yPos, contentWidth - 10);
      yPos += 3;
    });
    yPos += 7;

    // What Not To Do
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("What To Avoid", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    summary.whatNotToDo.forEach((item) => {
      yPos = addWrappedText(`• ${item}`, margin + 5, yPos, contentWidth - 10);
      yPos += 3;
    });
    yPos += 7;

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Medications
    if (summary.medications.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(45, 127, 120);
      doc.text("Medications", margin, yPos);
      yPos += 8;
      doc.setTextColor(50, 50, 50);
      summary.medications.forEach((med) => {
        doc.setFont("helvetica", "bold");
        yPos = addWrappedText(`${med.name} - ${med.dose}`, margin + 5, yPos, contentWidth - 10);
        doc.setFont("helvetica", "normal");
        yPos = addWrappedText(`Timing: ${med.timing}`, margin + 5, yPos, contentWidth - 10);
        if (med.notes) {
          yPos = addWrappedText(`Note: ${med.notes}`, margin + 5, yPos, contentWidth - 10, 10);
        }
        yPos += 5;
      });
      yPos += 5;
    }

    // Follow-up
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Follow-Up Tasks", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    summary.followUp.forEach((item) => {
      yPos = addWrappedText(`• ${item}`, margin + 5, yPos, contentWidth - 10);
      yPos += 3;
    });
    yPos += 7;

    // Expected Course
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("What to Expect", margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    yPos = addWrappedText(summary.expectedCourse, margin, yPos, contentWidth);

    // Footer
    const today = new Date().toLocaleDateString();
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated by PediBrief on ${today} • For reference only - always consult your healthcare provider`, margin, 290);

    // Save the PDF
    doc.save("pedibrief-summary.pdf");
  };

  return (
    <section className="py-12 bg-background">
      <div className="container px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="py-12">
              <div className="w-20 h-20 rounded-full bg-success/10 mx-auto mb-6 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-success" />
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-4">
                All Done!
              </h2>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-lg text-muted-foreground">
                  Quiz Score: <span className="font-bold text-foreground">{quizScore}/100</span>
                </span>
              </div>

              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Download your personalized care summary as a PDF. 
                Keep it handy for reference or share it with other caregivers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" onClick={generatePDF}>
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF Summary
                </Button>
                <Button variant="outline" size="xl" onClick={onStartOver}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Process Another Summary
                </Button>
              </div>

              {/* Email to Doctor Section */}
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Share Results with Your Doctor
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Optionally send your quiz results to your child's doctor for monitoring. 
                  A deidentified patient ID will be included so your doctor can track progress.
                </p>

                {!emailSent ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="doctor-email" className="text-sm font-medium">
                        Doctor's Email Address
                      </Label>
                      <Input
                        id="doctor-email"
                        type="email"
                        placeholder="doctor@example.com"
                        value={doctorEmail}
                        onChange={(e) => setDoctorEmail(e.target.value)}
                        className="mt-2"
                        disabled={isSendingEmail}
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent"
                        checked={consentGiven}
                        onCheckedChange={(checked) => setConsentGiven(checked === true)}
                        disabled={isSendingEmail}
                      />
                      <Label
                        htmlFor="consent"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        I consent to share my child's quiz results with the doctor at the email address above. 
                        I understand that a deidentified patient ID will be included, but no protected health information will be shared.
                      </Label>
                    </div>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleSendEmail}
                      disabled={!doctorEmail || !consentGiven || isSendingEmail}
                      className="w-full sm:w-auto"
                    >
                      {isSendingEmail ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send to Doctor
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-success mb-1">
                          Email sent successfully!
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Quiz results have been sent to <strong>{doctorEmail}</strong>
                        </p>
                        {patientId && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Patient ID:</strong> {patientId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy reminder */}
              <p className="text-xs text-muted-foreground mt-8">
                Remember: No data from this session has been stored. 
                Your child's information is completely private.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
