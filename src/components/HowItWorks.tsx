import { Card, CardContent } from "@/components/ui/card";
import { ClipboardPaste, Sparkles, CheckCircle, Download } from "lucide-react";

const steps = [
  {
    icon: ClipboardPaste,
    title: "Paste Summary",
    description: "Copy and paste your child's discharge summary. We strip any identifiers automatically.",
    color: "primary",
  },
  {
    icon: Sparkles,
    title: "Get Clear Guidance",
    description: "Receive a parent-friendly breakdown: what to do, danger signs, medications, and what to expect.",
    color: "accent",
  },
  {
    icon: CheckCircle,
    title: "Take the Quiz",
    description: "Confirm understanding with a short quiz. We'll re-explain anything you miss.",
    color: "success",
  },
  {
    icon: Download,
    title: "Export PDF",
    description: "Download everything as a clean PDF to reference at home or share with caregivers.",
    color: "primary",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-cream">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            How PediBrief Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform confusing medical jargon into clear, 
            actionable instructions you can actually follow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <Card 
              key={step.title} 
              variant="elevated" 
              className="relative overflow-hidden group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Step number */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
              </div>
              
              <CardContent className="pt-8 pb-6">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 ${
                  step.color === 'primary' ? 'bg-teal-light' :
                  step.color === 'accent' ? 'bg-coral-light' :
                  'bg-success/10'
                }`}>
                  <step.icon className={`w-7 h-7 ${
                    step.color === 'primary' ? 'text-primary' :
                    step.color === 'accent' ? 'text-accent' :
                    'text-success'
                  }`} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
