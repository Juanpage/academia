import { Injectable, Logger } from '@nestjs/common';

interface AuditPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  actorUserId: string;
  reason: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async log(payload: AuditPayload): Promise<void> {
    this.logger.log(
      `AUDIT ${payload.action} entity=${payload.entityType}:${payload.entityId} actor=${payload.actorUserId}`,
    );
    // Producción: persistir en tabla audit_log (append-only) + outbox event.
  }
}
