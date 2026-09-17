'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';

type LocationOption = { id: string; name: string; timezone: string };
type SkillOption = { id: string; name: string };

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const emptyForm = {
  locationId: '',
  requiredSkillId: '',
  date: '',
  startTime: '',
  endTime: '',
  headcountNeeded: 1,
};

export function ShiftModal({ isOpen, onClose, onCreated }: ShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  /* Load real locations/skills when the modal opens */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) throw new Error('Failed to load locations');
        const data = await res.json();
        if (!cancelled) {
          setLocations(data.locations || []);
          setSkills(data.skills || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load options');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /* Reset form + errors each time it opens */
  useEffect(() => {
    if (isOpen) {
      setFormData(emptyForm);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create shift');
      }
      toast.add({
        type: 'success',
        title: 'Shift created',
        description: `${formData.date} · ${formData.startTime}–${formData.endTime}`,
        timeout: 4000,
      });
      onCreated?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create shift';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedLocation = locations.find((l) => l.id === formData.locationId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, locationId: val })}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.timezone.replace('America/', '')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skill">Required Skill</Label>
            <Select onValueChange={(val) => setFormData({ ...formData, requiredSkillId: val })}>
              <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
              <SelectContent>
                {skills.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="capitalize">{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              id="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start Time {selectedLocation ? `(${selectedLocation.timezone.replace('America/', '')})` : ''}</Label>
              <Input
                type="time"
                id="start"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                type="time"
                id="end"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>
          {formData.endTime && formData.startTime && formData.endTime <= formData.startTime && (
            <p className="text-xs text-muted-foreground">Ends the next day (overnight shift).</p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="headcount">Headcount Needed</Label>
            <Input
              type="number"
              min="1"
              id="headcount"
              value={formData.headcountNeeded}
              onChange={(e) =>
                setFormData({ ...formData, headcountNeeded: parseInt(e.target.value || '1', 10) })
              }
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.locationId || !formData.requiredSkillId}>
              {loading ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
