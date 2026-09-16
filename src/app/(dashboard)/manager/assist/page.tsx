import React from 'react';
import { ChatPanel } from '@/components/assist/ChatPanel';

export default async function ManagerAssistPage() {
  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Smart Assist</h1>
        <p className="text-muted-foreground">Securely query your scheduling data using natural language.</p>
      </div>

      <ChatPanel />
    </div>
  );
}
