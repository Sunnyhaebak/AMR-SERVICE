export type Role = 'ADMIN' | 'MANAGER' | 'ENGINEER';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  defaultLandingPage?: string;
  pageAccess?: string[] | null;
  managerId?: string;
  isLocked?: boolean;
  createdAt?: string;
}

export interface Site {
  id: string;
  name: string;
  customerName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AttendanceRecord {
  id: string;
  engineerId: string;
  siteId: string;
  attendanceDate: string;
  state: AttendanceState;
  checkInTime?: string;
  checkOutTime?: string;
  source: 'MANAGER_MARKED' | 'ENGINEER_CHECKIN';
  engineer?: { id: string; name: string };
  site?: { id: string; name: string };
}

export type AttendanceState =
  | 'PLANNED' | 'PRESENT' | 'ABSENT'
  | 'OVERRIDE_PENDING' | 'OVERRIDDEN' | 'MANUAL_APPROVED';

export interface Ticket {
  id: string;
  ticketNumber: number;
  state: TicketState;
  managerId: string;
  assignedEngineerId?: string;
  customerName: string;
  customerLocation: string;
  siteId: string;
  botNumber?: string;
  zendeskTicketId?: string;
  serviceType: 'REPAIR' | 'CHANGE';
  changeType: 'HARDWARE' | 'SOFTWARE';
  changeSubtype: string;
  startDate: string;
  endDate: string;
  actualCompletionDate?: string;
  rejectionHistory?: RejectionEntry[];
  images?: string[];
  engineerFormData?: Record<string, unknown>;
  notes?: string;
  daysTaken?: number;
  createdAt: string;
  assignedEngineer?: { id: string; name: string };
  site?: { id: string; name: string };
  manager?: { id: string; name: string };
}

export type TicketState = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface RejectionEntry {
  engineer_id: string;
  reason: string;
  rejected_at: string;
  re_accepted_at?: string;
}

export interface SmrRequest {
  id: string;
  state: SmrState;
  source: 'ZENDESK_ZAF' | 'MANAGER_DIRECT' | 'ENGINEER_REQUEST';
  ticketId?: string;
  requestedBy: string;
  managerId: string;
  assignedEngineerId?: string;
  items: SmrItem[];
  customerName: string;
  siteId: string;
  rejectionReason?: string;
  erpId?: string;
  erpStatus?: 'DRAFT' | 'APPROVED' | 'DELIVERED';
  createdAt: string;
  requester?: { id: string; name: string };
  site?: { id: string; name: string };
  assignedEngineer?: { id: string; name: string };
}

export type SmrState =
  | 'REQUESTED' | 'ASSIGNED_TO_ENGINEER' | 'APPROVED_BY_ENGINEER'
  | 'APPROVED_BY_MANAGER' | 'REJECTED' | 'SYNCED_TO_ERP';

export interface SmrItem {
  itemName: string;
  partNumber: string;
  quantity: number;
  unit: string;
}

export interface Bot {
  id: string;
  botNumber: string;
  siteId: string;
  model?: string;
  isActive: boolean;
  site?: Site;
}

export interface ChangeHistory {
  id: string;
  recordType: 'BOT_LEVEL' | 'CUSTOMER_LEVEL';
  siteId: string;
  botId?: string;
  ticketId: string;
  engineerId: string;
  changeType: 'HARDWARE' | 'SOFTWARE';
  serviceType: 'REPAIR' | 'CHANGE';
  changeSubtype: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  date: string;
  timeTakenDays?: number;
  zendeskTicketId?: string;
  engineer?: { id: string; name: string };
  site?: { id: string; name: string; customerName: string };
  smr?: { id: string; items: SmrItem[]; erpId?: string };
}
