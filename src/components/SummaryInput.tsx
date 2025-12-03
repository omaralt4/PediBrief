import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Sparkles, AlertCircle, FileText, Upload, X } from "lucide-react";

interface SummaryInputProps {
  onSubmit: (text: string, file?: File) => void;
  isLoading: boolean;
}

// Sample discharge note - replace this with your actual sample note
const SAMPLE_DISCHARGE_NOTE = `Summary

This 5-year-old girl was admitted for evaluation of vomiting and frequent loose stools that began the day prior to presentation. Her mother reported reduced oral intake and fewer wet diapers. On arrival she appeared mildly dehydrated but alert, with normal temperature and no abdominal tenderness. There was no history of recent antibiotic use, travel, or sick contacts with bloody diarrhea.

She was started on IV fluids for rehydration and monitored for urine output and clinical improvement. No laboratory abnormalities requiring intervention were noted. Her vomiting resolved within several hours, and she began tolerating small amounts of oral fluids by the next morning. No signs developed to suggest bacterial gastroenteritis or a surgical cause for symptoms. By the time of discharge she was active, drinking adequately, and maintaining hydration without IV support.

Discharge Plan

She may continue oral rehydration solution at home as needed, especially if stool output increases again. Paracetamol can be given for discomfort or fever at a dose of 15 mg/kg every 6 hours as needed.

Families should avoid offering fruit juices, sodas, or sweetened drinks for the next couple of days, as these may worsen diarrhea. Heavy or greasy meals should also be avoided early on; smaller, more frequent portions are better tolerated. Anti-diarrheal medications should not be used unless specifically directed by a clinician.

Expected Course

Some loose stools may continue for the next 2-3 days, which is typical as the gastrointestinal tract recovers. Her appetite may return gradually, and she may have periods of mild cramping or lower energy, but overall hydration and activity should steadily improve. Caregivers should seek medical reassessment if vomiting returns and prevents oral intake, stools become bloody, urine output decreases, or if she appears unusually sleepy or weak.

Follow-Up

Follow up with her primary care provider in 2-3 days, or sooner if symptoms worsen or new concerns arise.`;

export function SummaryInput({ onSubmit, isLoading }: SummaryInputProps) {
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (inputMode === "file" && selectedFile) {
      onSubmit("", selectedFile);
    } else if (inputMode === "text" && inputText.trim().length >= 50) {
      onSubmit(inputText);
    }
  };

  const handleUseSample = () => {
    setInputText(SAMPLE_DISCHARGE_NOTE);
    setInputMode("text");
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];
      const validExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (
        !validTypes.includes(file.type) &&
        !validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      ) {
        alert("Please select a PDF or image file (PNG, JPG, JPEG, or WEBP)");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setInputMode("file");
      setInputText(""); // Clear text input when file is selected
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setInputMode("text");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section id="tool" className="py-20 bg-background">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-teal-light flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Paste Discharge Summary</CardTitle>
              </div>
              <CardDescription className="text-base">
                Copy and paste your child's discharge summary below. All information 
                is processed securely and never stored.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={inputMode === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setInputMode("text");
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Paste Text
                  </Button>
                  <Button
                    type="button"
                    variant={inputMode === "file" ? "default" : "outline"}
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF/Image
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseSample}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Try with a sample note
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* File display */}
              {inputMode === "file" && selectedFile && (
                <div className="p-4 rounded-xl bg-secondary border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Text input */}
              {inputMode === "text" && (
                <Textarea
                  id="discharge-textarea"
                  placeholder="Paste the discharge summary text here...

Example: Patient is a 4-year-old male who presented with acute otitis media. Treatment includes amoxicillin 250mg three times daily for 10 days. Return if fever persists beyond 48 hours, ear drainage develops, or symptoms worsen..."
                  className="min-h-[250px] text-base leading-relaxed resize-none border-2 focus:border-primary/50 transition-colors"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              )}

              {/* Privacy notice */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-light/50 border border-primary/10">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground mb-1">Your Privacy Matters</p>
                  <p className="text-muted-foreground">
                    We automatically remove identifiable information. No data is stored 
                    after your session ends. Processing happens in real-time with immediate 
                    memory clearing.
                  </p>
                </div>
              </div>

              {/* Validation message */}
              {inputMode === "text" && inputText.length > 0 && inputText.length < 50 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Please paste a complete discharge summary (at least 50 characters)</span>
                </div>
              )}

              <Button 
                variant="hero" 
                size="xl" 
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  (inputMode === "text" && inputText.trim().length < 50) ||
                  (inputMode === "file" && !selectedFile) ||
                  isLoading
                }
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Processing Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Parent-Friendly Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
