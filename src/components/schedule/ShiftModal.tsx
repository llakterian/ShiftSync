'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ShiftModal({ isOpen, onClose, onSave }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    requiredSkillId: '',
    date: '',
    startTime: '',
    endTime: '',
    headcountNeeded: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // API call to /api/shifts
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Select onValueChange={(val) => setFormData({...formData, locationId: val})}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="loc_1">Downtown</SelectItem>
                <SelectItem value="loc_2">Westside</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="skill">Required Skill</Label>
            <Select onValueChange={(val) => setFormData({...formData, requiredSkillId: val})}>
              <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skill_1">Bartender</SelectItem>
                <SelectItem value="skill_2">Server</SelectItem>
                <SelectItem value="skill_3">Line Cook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input type="date" id="date" required onChange={(e) => setFormData({...formData, date: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start Time</Label>
              <Input type="time" id="start" required onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End Time</Label>
              <Input type="time" id="end" required onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="headcount">Headcount Needed</Label>
            <Input type="number" min="1" id="headcount" value={formData.headcountNeeded} onChange={(e) => setFormData({...formData, headcountNeeded: parseInt(e.target.value)})} />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Shift'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
