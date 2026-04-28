import { BadRequestException, Injectable } from '@nestjs/common';
import type { AttendanceEvent, AttendanceEventType } from './attendance.types';

const allowedTransitions: Record<AttendanceEventType, AttendanceEventType[]> = {
  CHECK_IN: ['LUNCH_OUT', 'CHECK_OUT'],
  LUNCH_OUT: ['LUNCH_IN'],
  LUNCH_IN: ['CHECK_OUT'],
  CHECK_OUT: ['CHECK_IN'],
};

@Injectable()
export class AttendanceFlowService {
  validateTransition(existing: AttendanceEvent[], nextType: AttendanceEventType): void {
    const ordered = [...existing].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    if (ordered.length === 0 && nextType !== 'CHECK_IN') {
      throw new BadRequestException('FLOW_INVALID: first event must be CHECK_IN');
    }

    const last = ordered.at(-1);
    if (!last) {
      return;
    }

    const accepted = allowedTransitions[last.eventType];
    if (!accepted.includes(nextType)) {
      throw new BadRequestException(
        `FLOW_INVALID: cannot transition from ${last.eventType} to ${nextType}`,
      );
    }

    if (ordered.some((item) => item.eventType === 'CHECK_OUT') && nextType !== 'CHECK_IN') {
      throw new BadRequestException('FLOW_INVALID: workday already closed');
    }
  }

  calculateWorkedMinutes(events: AttendanceEvent[]): number {
    const map = new Map(events.map((ev) => [ev.eventType, ev]));
    const checkIn = map.get('CHECK_IN');
    const lunchOut = map.get('LUNCH_OUT');
    const lunchIn = map.get('LUNCH_IN');
    const checkOut = map.get('CHECK_OUT');

    if (!checkIn || !checkOut) {
      return 0;
    }

    const gross = (checkOut.occurredAt.getTime() - checkIn.occurredAt.getTime()) / 60000;
    const lunch =
      lunchOut && lunchIn
        ? (lunchIn.occurredAt.getTime() - lunchOut.occurredAt.getTime()) / 60000
        : 0;

    return Math.max(0, Math.round(gross - lunch));
  }
}
