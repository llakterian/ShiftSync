'use client';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';

export function AssignmentModal({ isOpen, onClose, shift, availableStaff }: any) {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [constraintResults, setConstraintResults] = useState<any[]>([]);
  
  const handleAssign = async () => {
    // API call to /api/assignments/check
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Staff to Shift</DialogTitle>
          <DialogDescription>
            {shift?.startAt} - {shift?.endAt}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {constraintResults.length > 0 && (
            <div className="p-4 bg-slate-50 border rounded-lg space-y-3">
              <h4 className="font-medium text-sm text-slate-900">Constraint Checks</h4>
              {constraintResults.map((res, i) => (
                <div key={i} className="flex items-start gap-2">
                  {res.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${res.severity === 'block' ? 'text-red-500' : 'text-amber-500'}`} />
                  )}
                  <div>
                    <p className={`text-sm ${!res.ok && res.severity === 'block' ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
                      {res.ok ? `Passed ${res.rule}` : res.message}
                    </p>
                    {!res.ok && res.suggestions && res.suggestions.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggested Alternatives</p>
                        {res.suggestions.map((s: any) => (
                          <div key={s.userId} className="flex items-center justify-between bg-white border p-2 rounded-md">
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.reason}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <UserPlus className="h-3 w-3 mr-1" /> Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedStaff || loading}>
            {loading ? 'Checking...' : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
