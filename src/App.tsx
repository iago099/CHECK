import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  DatabaseState,
  DynamicList,
  TaskItem,
  CustomFieldDefinition,
  CustomFieldType,
  SelectOption,
  AttachmentItem,
  UserRole,
} from './types/schema';
import {
  loadDatabaseState,
  saveDatabaseState,
  resetDatabaseToFactoryExcel,
  createAuditEntry,
} from './services/database';
import {
  parseWorkbookToPreviews,
  ParsedSheetPreview,
  exportDatabaseToExcel,
  excelSerialToDateString,
} from './services/excelEngine';
import {
  initFirebaseClient,
  syncStateToCloudFirestore,
} from './services/firebase';
import { SignaturePad } from './components/SignaturePad';

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  number: 'Número',
  date: 'Data',
  time: 'Hora',
  datetime: 'Data e hora',
  select: 'Lista suspensa',
  multi_select: 'Seleção múltipla',
  checkbox: 'Caixa de seleção',
  boolean: 'Sim ou não',
  percentage: 'Campo de percentual (%)',
  attachments: 'Anexos',
  images: 'Imagens',
  signature: 'Assinatura digital',
};

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => loadDatabaseState());
  const [activeNav, setActiveNav] = useState<'dashboard' | 'list' | 'builder' | 'importer' | 'admin' | 'audit'>('dashboard');
  const [selectedListId, setSelectedListId] = useState<string>(() => db.lists[0]?.id || 'lst_03');
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar' | 'checklist'>('table');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    saveDatabaseState(db);
    if (db.settings.firebaseConfig?.enabled) {
      initFirebaseClient(db.settings.firebaseConfig);
      syncStateToCloudFirestore(db);
    }
  }, [db]);

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === db.currentUserId) || db.users[0],
    [db.users, db.currentUserId]
  );

  const activeList = useMemo(
    () => db.lists.find((l) => l.id === selectedListId) || db.lists[0],
    [db.lists, selectedListId]
  );

  return (
    <div className="min-h-screen bg-[#0b0d11] text-slate-100 flex">
      {/* O aplicativo completo é renderizado tanto via Vite quanto via bundle autossuficiente */}
      <div className="p-6">Carregando interface completa CheckFlow Pro...</div>
    </div>
  );
}
