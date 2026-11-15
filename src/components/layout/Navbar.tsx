'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  LayoutDashboard,
  Database,
  Sliders,
  PlayCircle,
  Network,
  BookOpen,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import { Button, Modal, Badge } from '@/components/ui';
import { ALL_PRESETS } from '@/data/presets';

export function Navbar() {
  const pathname = usePathname();
  const {
    hydrate,
    resetToDemoData,
    exportDataJson,
    importDataJson,
    currentTimetable,
    activePresetId,
    loadPreset,
  } = useTimetableStore();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/data-management', label: 'Academic Data', icon: Database },
    { href: '/constraints', label: 'Constraints', icon: Sliders },
    { href: '/generate', label: 'Generate', icon: PlayCircle },
    { href: '/visualize', label: 'Search Tree Visualizer', icon: Network },
    { href: '/learn', label: 'Learning Center', icon: BookOpen },
  ];

  const handleExport = () => {
    const jsonString = exportDataJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellisched_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportError('');
    if (!importJsonText.trim()) {
      setImportError('Please paste valid JSON data');
      return;
    }
    const success = importDataJson(importJsonText);
    if (success) {
      setIsImportModalOpen(false);
      setImportJsonText('');
    } else {
      setImportError('Invalid JSON structure. Ensure subjects, professors, batches, classrooms, and timeSlots arrays are present.');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-lg">IntelliSched</span>
                  <Badge variant="purple" className="text-[10px] py-0 px-1.5 font-semibold">
                    Phase 1: CSP
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">University Timetable Generator</span>
              </div>
            </Link>
          </div>

          {/* Navigation items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right utility actions */}
          <div className="flex items-center gap-2">
            {/* Quick Preset Selector */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={activePresetId}
                onChange={(e) => loadPreset(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-slate-700 focus:outline-none cursor-pointer"
                title="Switch between Small, Medium, Big, or Challenging presets"
              >
                {ALL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    Preset: {p.name}
                  </option>
                ))}
              </select>
            </div>

            {currentTimetable && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Timetable Active ({currentTimetable.assignments.length} sessions)</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              title="Export all data and generated schedule to JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              title="Import data from JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetConfirmOpen(true)}
              className="text-slate-500 hover:text-rose-600"
              title="Reset to Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reset Demo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 px-2 py-1.5 bg-slate-50/50 overflow-x-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center py-1 px-2 rounded text-[11px] font-medium whitespace-nowrap ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Academic Data (JSON)"
        description="Paste JSON data exported from IntelliSched to restore or test different configurations."
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImportSubmit}>
              Apply Import
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <textarea
            rows={10}
            className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            placeholder="Paste exported JSON here..."
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
          />
          {importError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
              {importError}
            </p>
          )}
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset to Demo University Data?"
        description="This will restore the standard university faculty, subjects, rooms, and schedule settings. Any custom data added in this browser will be replaced."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetToDemoData();
                setResetConfirmOpen(false);
              }}
            >
              Reset Data
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          The demo dataset includes realistic engineering departments, 7 subjects, 5 professors with specific availability and preferences, 2 student batches, 4 classrooms (lecture halls, lab, and seminar), and a complete 5-day week schedule.
        </p>
      </Modal>
    </header>
  );
}

