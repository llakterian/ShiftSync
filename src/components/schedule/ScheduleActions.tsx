'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ShiftModal } from './ShiftModal';
import { toast } from '@/components/ui/toast';

export function ScheduleActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  /* Monday of the current week (UTC), matching /api/schedule/publish semantics */
  const currentWeekStart = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day + 6) % 7; // Monday = 0
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    return d.toISOString().slice(0, 10);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/schedule/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: currentWeekStart(), action: 'publish' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      toast.add({
        type: 'success',
        title: 'Schedule published',
        description: `${data.affected} shift${data.affected === 1 ? '' : 's'} published for this week.`,
        timeout: 4000,
      });
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Publish failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        timeout: 4000,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish Week'}
        </Button>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Shift
        </Button>
      </div>

      <ShiftModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setIsModalOpen(false)}
      />
    </>
  );
}
