"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  X,
  ArrowRight,
  ArrowLeft,
  Users,
  Search,
  Eye,
  Shield,
  Send,
  Heart,
  LayoutDashboard,
  Sparkles,
  ChevronUp,
} from "lucide-react";

const demoSteps = [
  {
    step: 1,
    title: "Open Command Center",
    description: "See risk-scored operations queue, SLA timers, agent assignments, and impact trend charts.",
    page: "/dashboard",
    icon: LayoutDashboard,
    action: "Observe the real-time KPIs and the risk-scored case queue.",
  },
  {
    step: 2,
    title: "Report a Missing Person",
    description: "Create a new case by uploading a photo and entering person details.",
    page: "/cases/new",
    icon: Users,
    action: "Fill in a name, age, and location. Submit the case.",
  },
  {
    step: 3,
    title: "Run AI Search",
    description: "Deploy all 6 AI agents to search across 2,100+ records simultaneously.",
    page: null, // stays on case detail
    icon: Search,
    action: "Click 'Run AI Search' on the case detail page. Watch agents activate.",
  },
  {
    step: 4,
    title: "AI Analysis",
    description: "Google Gemini provides risk assessment, match evaluation, and operational recommendations.",
    page: null,
    icon: Sparkles,
    action: "Click 'Risk Assessment' or 'Recommendation' in the AI Intelligence panel.",
  },
  {
    step: 5,
    title: "Review Matches",
    description: "See ranked match candidates with explainable scoring and evidence breakdown.",
    page: null,
    icon: Eye,
    action: "Expand a match card to see the signal chain and breakthrough explanation.",
  },
  {
    step: 6,
    title: "Verify Match",
    description: "Caseworker reviews evidence and makes a verification decision.",
    page: "/caseworker",
    icon: Shield,
    action: "Click 'AI Evidence Assist', review cards, then verify or reject.",
  },
  {
    step: 7,
    title: "TinyFish Outreach",
    description: "Generate multi-channel outreach plan and agency coordination pack.",
    page: null,
    icon: Send,
    action: "Open the TinyFish panel tabs: Outreach, Agency, Call, Closure.",
  },
  {
    step: 8,
    title: "Reunion Confirmed",
    description: "Run closure workflow, notify all parties, and record impact metrics.",
    page: null,
    icon: Heart,
    action: "Open the Closure tab and walk through the 7-step checklist.",
  },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auto-minimize on non-demo pages
  useEffect(() => {
    if (open && demoSteps[currentStep].page && pathname !== demoSteps[currentStep].page) {
      // Don't auto-navigate, just indicate
    }
  }, [pathname, open, currentStep]);

  const step = demoSteps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / demoSteps.length) * 100;

  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Play className="h-4 w-4" />
        Demo Mode
      </motion.button>
    );
  }

  if (minimized) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
        onClick={() => setMinimized(false)}
      >
        <ChevronUp className="h-3 w-3" />
        Step {currentStep + 1}/{demoSteps.length}: {step.title}
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-white/20 dark:border-white/8 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Play className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">Guided Demo</span>
            <Badge variant="secondary" className="text-[9px] h-4">
              {currentStep + 1}/{demoSteps.length}
            </Badge>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="text-primary-foreground/70 hover:text-primary-foreground p-0.5"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-primary-foreground/70 hover:text-primary-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border px-3 py-2">
            <p className="text-xs">
              <span className="font-medium">Do this: </span>
              {step.action}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs h-7"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>

            {step.page && pathname !== step.page && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7"
                onClick={() => router.push(step.page!)}
              >
                Go to page
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}

            <Button
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => {
                if (currentStep < demoSteps.length - 1) {
                  const nextStep = demoSteps[currentStep + 1];
                  setCurrentStep(currentStep + 1);
                  if (nextStep.page && pathname !== nextStep.page) {
                    router.push(nextStep.page);
                  }
                } else {
                  setOpen(false);
                }
              }}
            >
              {currentStep === demoSteps.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
