import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'IntelliSched — CSP University Timetable Generator',
  description:
    'Academic CSP-based University Timetable Generator with Backtracking, MRV, Degree Heuristic, LCV, Forward Checking, and Interactive Search Tree Visualization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1 pb-16">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">IntelliSched</span>
              <span>— Phase 1: CSP Academic Timetable Generator</span>
            </div>
            <div className="text-slate-400">
              Algorithms: Backtracking • MRV • Degree Heuristic • LCV • Forward Checking
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
