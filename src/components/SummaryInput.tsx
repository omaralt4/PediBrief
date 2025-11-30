import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Sparkles, AlertCircle } from "lucide-react";

interface SummaryInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export function SummaryInput({ onSubmit, isLoading }: SummaryInputProps) {
  const [inputText, setInputText] = useState("");

  const handleSubmit = () => {
    if (inputText.trim().length < 50) return;
    onSubmit(inputText);
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
              <Textarea
                placeholder="Paste the discharge summary text here...

Example: Patient is a 4-year-old male who presented with acute otitis media. Treatment includes amoxicillin 250mg three times daily for 10 days. Return if fever persists beyond 48 hours, ear drainage develops, or symptoms worsen..."
                className="min-h-[250px] text-base leading-relaxed resize-none border-2 focus:border-primary/50 transition-colors"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

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
              {inputText.length > 0 && inputText.length < 50 && (
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
                disabled={inputText.trim().length < 50 || isLoading}
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
