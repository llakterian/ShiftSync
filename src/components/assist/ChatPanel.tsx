'use client';
import React from 'react';
import { useChat } from '@ai-sdk/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, User } from 'lucide-react';

export function ChatPanel() {
  const { messages, input = '', handleInputChange, handleSubmit, isLoading } = useChat();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!(input || '').trim()) return;
    handleSubmit(e);
  };

  return (
    <Card className="w-full max-w-2xl h-[600px] flex flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg flex items-center">
          <MessageCircle className="mr-2 h-5 w-5 text-blue-600" /> Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="hidden">
                <p>Hello! I can help you find shift coverage or check overtime risks.</p>
                <p className="text-sm mt-2">Try asking: "Who can cover a bartender shift tonight?"</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {/* Render tool invocations gracefully */}
                    {m.toolInvocations?.map((t: any) => (
                      <div key={t.toolCallId} className="mt-2 text-xs bg-white/50 p-2 rounded border border-slate-200 text-slate-600">
                        {t.state === 'call' ? `Calling database: ${t.toolName}...` : `Database result retrieved.`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm text-slate-500 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a scheduling question..."
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !(input || '').trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
