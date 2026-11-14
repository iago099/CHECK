// ============================================================================
// ARQUITETURA DE METADADOS E CAMPOS PERSONALIZADOS (100% EDITÁVEL)
// ============================================================================

export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'boolean'
  | 'percentage'
  | 'attachments'
  | 'images'
  | 'signature';

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface CustomFieldDefinition {
  id: string;
  key: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  visible: boolean;
  width?: number;
  order: number;
  options?: SelectOption[];
  defaultValue?: any;
  description?: string;
  isSystemField?: boolean; // permite editar nome, ordem, visibilidade, opções e obrigatoriedade
}

export interface StatusDefinition {
  id: string;
  name: string;
  color: string; // hex ou classe semântica (verde conclusão, laranja atenção, etc.)
  category: 'todo' | 'in_progress' | 'done' | 'blocked';
  order: number;
}

export interface PriorityDefinition {
  id: string;
  name: string;
  color: string;
  level: number; // 1 = Baixa, 2 = Média, 3 = Alta, 4 = Crítica
  order: number;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface TeamDefinition {
  id: string;
  name: string;
  leaderName: string;
  color: string;
  description?: string;
  memberIds: string[];
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface RolePermissions {
  canCreateLists: boolean;
  canDeleteLists: boolean;
  canEditSchema: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canImportExport: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

export interface UserResponsible {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  teamId?: string;
  avatarColor: string;
  active: boolean;
  permissions: RolePermissions;
}

export interface AttachmentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DynamicList {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  order: number;
  origSheetName?: string;
  autoCalculateFormula: boolean; // Replica a fórmula do Excel: Iniciada + Finalizada -> % Concluída -> Status
  fields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  code: string; // Ex: CHK-001
  listId: string;
  title: string;
  description: string;
  categoryId: string;
  statusId: string;
  priorityId: string;
  responsibleId: string;
  teamId: string;
  started: boolean; // Coluna D/E da planilha: INICIADA
  finished: boolean; // Coluna E/F da planilha: FINALIZADA
  progress: number; // 0 a 100 (CONCLUIDA EM % / %QUALIDADE)
  executionDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (Prazo)
  executionTime?: string; // HH:mm
  observations: string;
  serviceNote?: string; // Coluna NOTAS da aba CORTE (ex: 440113684)
  attachments: AttachmentItem[];
  images: AttachmentItem[];
  signatureDataUrl?: string; // Assinatura digital em Canvas
  customValues: Record<string, any>; // Valores de todos os campos personalizados criados pelo administrador
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  completedAt?: string;
  completedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  taskId?: string;
  taskCode?: string;
  taskTitle?: string;
  listId?: string;
  listName?: string;
  action: 'create' | 'update' | 'complete' | 'reopen' | 'delete' | 'duplicate' | 'bulk_update' | 'import' | 'schema_change' | 'admin_change';
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface WorkspaceSettings {
  systemName: string;
  organizationName: string;
  themeColor: string;
  completedColor: string;
  warningColor: string;
  dangerColor: string;
  defaultView: 'table' | 'kanban' | 'calendar' | 'checklist';
  enableAutoAudit: boolean;
  enableExcelFormulaLogic: boolean;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    enabled: boolean;
  };
}

export interface DatabaseState {
  lists: DynamicList[];
  tasks: TaskItem[];
  categories: CategoryDefinition[];
  statuses: StatusDefinition[];
  priorities: PriorityDefinition[];
  users: UserResponsible[];
  teams: TeamDefinition[];
  auditLogs: AuditLogEntry[];
  settings: WorkspaceSettings;
  currentUserId: string;
}
