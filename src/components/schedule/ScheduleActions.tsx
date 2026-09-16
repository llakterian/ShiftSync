'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { ShiftModal } from './ShiftModal';

export function ScheduleActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const handlePublish = () => {
    setIsPublished(true);
    setTimeout(() => setIsPublished(false), 3000);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={handlePublish} disabled={isPublished}>
          {isPublished ? (
            <><Check className="mr-2 h-4 w-4 text-emerald-500" /> Published</>
          ) : (
            'Publish Week'
          )}
        </Button>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Shift
        </Button>
      </div>

      <ShiftModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={() => setIsModalOpen(false)} 
      />
    </>
  );
}
