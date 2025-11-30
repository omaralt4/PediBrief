import { Heart, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 bg-foreground text-background">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">PediBrief</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Shield className="w-4 h-4" />
              <span>No data stored • 100% Anonymous • HIPAA-compliant processing</span>
            </div>
          </div>

          <div className="border-t border-background/20 pt-8">
            <p className="text-center text-sm opacity-60">
              PediBrief is designed to help parents understand discharge instructions. 
              It does not replace professional medical advice. Always consult your 
              healthcare provider for medical decisions.
            </p>
            <p className="text-center text-sm opacity-40 mt-4">
              © {new Date().getFullYear()} PediBrief. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
