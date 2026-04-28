import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AttendanceFlowService } from './attendance-flow.service';
import { AuditService } from '../audit/audit.service';
import type { AttendanceEvent } from './attendance.types';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { EditAttendanceEventDto } from './dto/edit-attendance-event.dto';

@Injectable()
export class AttendanceService {
  // Producción: reemplazar por repository TypeORM/Prisma.
  private readonly events: AttendanceEvent[] = [];

  constructor(
    private readonly flowService: AttendanceFlowService,
    private readonly auditService: AuditService,
  ) {}

  async createEvent(tenantId: string, userId: string, dto: CreateAttendanceEventDto): Promise<AttendanceEvent> {
    const todayEvents = this.events.filter(
      (item) => item.tenantId === tenantId && item.userId === userId,
    );

    this.flowService.validateTransition(todayEvents, dto.eventType);

    const event: AttendanceEvent = {
      id: randomUUID(),
      tenantId,
      userId,
      officeId: dto.officeId,
      eventType: dto.eventType,
      occurredAt: new Date(dto.occurredAt),
      insideGeofence: true,
      selfieUrl: dto.selfieUrl,
      wifiBssid: dto.wifiBssid,
    };

    this.events.push(event);
    return event;
  }

  async editEvent(
    tenantId: string,
    actorUserId: string,
    eventId: string,
    dto: EditAttendanceEventDto,
  ): Promise<AttendanceEvent> {
    const existing = this.events.find((item) => item.id === eventId && item.tenantId === tenantId);
    if (!existing) {
      throw new Error('Attendance event not found');
    }

    const oldValue = { ...existing };
    if (dto.occurredAt) {
      existing.occurredAt = new Date(dto.occurredAt);
    }

    await this.auditService.log({
      tenantId,
      entityType: 'attendance_records',
      entityId: eventId,
      action: 'UPDATE',
      oldValue,
      newValue: { ...existing },
      actorUserId,
      reason: dto.reason,
    });

    return existing;
  }
}
