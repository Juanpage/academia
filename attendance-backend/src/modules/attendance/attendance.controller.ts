import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceEventDto } from './dto/create-attendance-event.dto';
import { EditAttendanceEventDto } from './dto/edit-attendance-event.dto';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';

@Controller('/api/v1/attendance')
@UseGuards(RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('/events')
  async createEvent(@Req() req: any, @Body() dto: CreateAttendanceEventDto) {
    return this.attendanceService.createEvent(req.user.tenantId, req.user.id, dto);
  }

  @Patch('/events/:id')
  @Roles('SUPER_ADMIN')
  async editEvent(@Req() req: any, @Body() dto: EditAttendanceEventDto) {
    return this.attendanceService.editEvent(req.user.tenantId, req.user.id, req.params.id, dto);
  }
}
