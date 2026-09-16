import { loginAs } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserCircle, Shield, Briefcase, Waves } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 ocean-hero">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Waves className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Coastal Eats</CardTitle>
          <CardDescription>Select a persona to test the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={async () => { 'use server'; await loginAs('admin'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg hover:border-primary/50 hover:bg-accent" type="submit">
              <Shield className="mr-4 h-6 w-6 text-destructive" /> System Admin
            </Button>
          </form>
          <form action={async () => { 'use server'; await loginAs('manager'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg hover:border-primary/50 hover:bg-accent" type="submit">
              <Briefcase className="mr-4 h-6 w-6 text-primary" /> East Manager
            </Button>
          </form>
          <form action={async () => { 'use server'; await loginAs('staff'); }}>
            <Button variant="outline" className="w-full justify-start h-14 text-lg hover:border-primary/50 hover:bg-accent" type="submit">
              <UserCircle className="mr-4 h-6 w-6 text-muted-foreground" /> Staff Member
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
