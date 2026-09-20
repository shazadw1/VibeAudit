import React from "react";
import { CopilotClient } from "@/components/dashboard/copilot-client";

export const metadata = {
  title: "VibeAudit Copilot (Preview)",
  description: "AI security assistant — demo preview",
};

export default function CopilotPage() {
  return <CopilotClient />;
}
