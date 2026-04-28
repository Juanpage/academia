import { IsDateString, IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import type { AttendanceEventType } from '../attendance.types';

export class CreateAttendanceEventDto {
  @IsEnum(['CHECK_IN', 'LUNCH_OUT', 'LUNCH_IN', 'CHECK_OUT'])
  eventType!: AttendanceEventType;

  @IsUUID()
  officeId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsString()
  @IsNotEmpty()
  selfieUrl!: string;

  @IsOptional()
  @IsString()
  wifiSsid?: string;

  @IsOptional()
  @IsString()
  wifiBssid?: string;

  @IsString()
  @IsNotEmpty()
  deviceFingerprint!: string;
}
