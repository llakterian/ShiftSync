'use client';
import React from 'react';
import { useChat } from '@ai-sdk/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, User } from 'lucide-react';

export function ChatPanel() {
  const { messages, sendMessage, status, error } = useChat({
    onError: (err) => console.error('chat error:', err),
  });
  const [localInput, setLocalInput] = React.useState('');
  const isBusy = status === 'submitted' || status === 'streaming';

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = localInput.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setLocalInput('');
  };

  return (
    <Card className="w-full max-w-2xl h-[600px] flex flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg flex items-center">
          <MessageCircle className="mr-2 h-5 w-5 text-primary" /> Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && !error && (
              <div className="text-center py-12 text-muted-foreground/70">
                <MessageCircle className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium text-muted-foreground">How can I help?</p>
                <p className="text-sm mt-1">Try asking: &quot;Who can cover a bartender shift tonight?&quot;</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {m.parts.map((part, i) => {
                      if (part.type === 'text') {
                        return <p key={i} className="text-sm whitespace-pre-wrap">{part.text}</p>;
                      }
                      if (part.type.startsWith('tool-')) {
                        const toolPart = part as { toolName: string; state: string };
                        return (
                          <div key={i} className="mt-2 text-xs bg-background/60 p-2 rounded border border-border text-muted-foreground">
                            {toolPart.state === 'output-available'
                              ? `Database result retrieved (${toolPart.toolName}).`
                              : `Calling database: ${toolPart.toolName}...`}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isBusy && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-lg text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
            {error && (
              <div className="text-center text-sm text-destructive">
                Something went wrong. Check the server logs and try again.
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Ask a scheduling question..."
              className="flex-1 h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" disabled={isBusy || !localInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
