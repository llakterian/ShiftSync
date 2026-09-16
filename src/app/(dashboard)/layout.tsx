import Link from 'next/link';
import { Calendar, Users, BarChart3, Settings, LogOut, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
          <Link href="/manager/schedule">
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <Calendar className="mr-3 h-5 w-5" /> Schedule
            </Button>
          </Link>
          <Link href="/manager/assignments">
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <Users className="mr-3 h-5 w-5" /> Assignments
            </Button>
          </Link>
          <Link href="/manager/analytics">
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <BarChart3 className="mr-3 h-5 w-5" /> Analytics
            </Button>
          </Link>
          <Link href="/manager/assist">
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <MessageSquare className="mr-3 h-5 w-5" /> Smart Assist
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">East Manager</span>
              <span className="text-xs text-slate-500">manager</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start mt-2 text-slate-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="mr-3 h-5 w-5" /> Sign Out
          </Button>
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
