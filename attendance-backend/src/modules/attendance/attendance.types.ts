export type AttendanceEventType = 'CHECK_IN' | 'LUNCH_OUT' | 'LUNCH_IN' | 'CHECK_OUT';

export interface AttendanceEvent {
  id: string;
  tenantId: string;
  userId: string;
  officeId: string;
  eventType: AttendanceEventType;
  occurredAt: Date;
  insideGeofence: boolean;
  selfieUrl: string;
  wifiBssid?: string;
}

export interface TenantPolicy {
  lunchMinutes: number;
  heartbeatMinutes: number;
  geofenceGraceHeartbeats: number;
}
