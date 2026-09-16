import Link from 'next/link';
import { Calendar, Users, BarChart3, LogOut, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { logout } from '@/app/actions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = cookies().get('mock_role')?.value || 'manager';
  
  const personaMap: Record<string, { name: string, initial: string, color: string }> = {
    admin: { name: 'System Admin', initial: 'A', color: 'bg-red-100 text-red-600' },
    manager: { name: 'East Manager', initial: 'M', color: 'bg-blue-100 text-blue-600' },
    staff: { name: 'John Doe', initial: 'J', color: 'bg-slate-100 text-slate-600' }
  };
  
  const persona = personaMap[role] || personaMap.manager;
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <div>
            <div className="font-bold text-lg tracking-tight text-blue-700">Coastal Eats</div>
            <div className="text-xs text-slate-400 tracking-wide">Shift Manager</div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {role !== 'staff' && (
            <Link href="/manager/schedule">
              <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Calendar className="mr-3 h-5 w-5" /> Schedule
              </Button>
            </Link>
          )}
          {role !== 'staff' && (
            <Link href="/manager/assignments">
              <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Users className="mr-3 h-5 w-5" /> Assignments
              </Button>
            </Link>
          )}
          {(role === 'admin' || role === 'manager') && (
            <Link href="/manager/analytics">
              <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <BarChart3 className="mr-3 h-5 w-5" /> Analytics
              </Button>
            </Link>
          )}
          <Link href="/manager/assist">
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <MessageSquare className="mr-3 h-5 w-5" /> Smart Assist
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar>
              <AvatarFallback className={persona.color}>{persona.initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{persona.name}</span>
              <span className="text-xs text-slate-500 capitalize">{role}</span>
            </div>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="w-full justify-start mt-2 text-slate-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="mr-3 h-5 w-5" /> Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="font-semibold text-lg text-slate-800">Dashboard</h2>
          {/* Notifications can go here */}
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
