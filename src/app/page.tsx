import { loginAs } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserCircle, Shield, Briefcase } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-700">Coastal Eats</CardTitle>
          <CardDescription>Select a persona to test the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={async () => { 'use server'; await loginAs('admin'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg border-red-200 hover:border-red-300 hover:bg-red-50" type="submit">
              <Shield className="mr-4 h-6 w-6 text-red-500" /> System Admin
            </Button>
          </form>
          <form action={async () => { 'use server'; await loginAs('manager'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg border-blue-200 hover:border-blue-300 hover:bg-blue-50" type="submit">
              <Briefcase className="mr-4 h-6 w-6 text-blue-500" /> East Manager
            </Button>
          </form>
          <form action={async () => { 'use server'; await loginAs('staff'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg border-slate-200 hover:border-slate-300 hover:bg-slate-50" type="submit">
              <UserCircle className="mr-4 h-6 w-6 text-slate-500" /> Staff Member
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
