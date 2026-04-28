import { IsDateString, IsOptional, IsString } from 'class-validator';

export class EditAttendanceEventDto {
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  reason!: string;
}
