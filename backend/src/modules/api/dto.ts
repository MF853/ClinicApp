import { IsString, IsIn, IsUUID, IsOptional, MaxLength, MinLength, IsInt, Min, Max, IsBoolean, IsEmail, IsDateString, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ResponseDto { @ApiProperty({ enum: ['confirm', 'cancel'] }) @IsIn(['confirm', 'cancel']) action!: 'confirm' | 'cancel'; }
export class AttendanceDto { @ApiProperty({ enum: ['attended', 'absent'] }) @IsIn(['attended', 'absent']) outcome!: 'attended' | 'absent'; }
export class DecisionDto { @ApiProperty({ enum: ['approve', 'reject'] }) @IsIn(['approve', 'reject']) decision!: 'approve' | 'reject'; @ApiProperty() @IsString() @MaxLength(2000) reason!: string; }
export class ReserveDto { @ApiProperty() @IsUUID() originalId!: string; @ApiProperty() @IsUUID() occurrenceId!: string; }
export class ConsequenceDto { @ApiProperty({ enum: ['apply', 'suspend', 'reset', 'reactivate'] }) @IsIn(['apply', 'suspend', 'reset', 'reactivate']) action!: 'apply' | 'suspend' | 'reset' | 'reactivate'; @ApiProperty() @IsString() @MinLength(5) @MaxLength(2000) reason!: string; @ApiPropertyOptional() @IsOptional() @IsDateString() until?: string; }
export class AvailabilityDto { @ApiProperty() @IsInt() @Min(0) @Max(6) weekday!: number; @ApiProperty() @IsInt() @Min(0) @Max(1439) startMinute!: number; @ApiProperty() @IsInt() @Min(1) @Max(1440) endMinute!: number; }
export class SlotDto extends AvailabilityDto { @ApiProperty() @IsInt() @Min(1) @Max(20) capacity!: number; @ApiProperty() @IsInt() @Min(0) @Max(120) minAge!: number; @ApiProperty() @IsInt() @Min(0) @Max(120) maxAge!: number; @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) room!: string; }
export class AssignDto { @ApiProperty() @IsUUID() patientId!: string; @ApiProperty() @IsBoolean() exception!: boolean; @ApiProperty() @IsString() @MaxLength(1000) reason!: string; }
export class MemberDto { @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string; @ApiProperty() @IsEmail() email!: string; @ApiProperty() @IsString() @MinLength(12) @MaxLength(128) password!: string; @ApiProperty({ enum: ['PATIENT', 'THERAPIST', 'RECEPTION'] }) @IsIn(['PATIENT', 'THERAPIST', 'RECEPTION']) role!: 'PATIENT' | 'THERAPIST' | 'RECEPTION'; @ApiProperty() @IsString() @MaxLength(30) phone!: string; @ApiPropertyOptional() @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string; @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) registration?: string; @IsOptional() @IsUUID() slotId?: string; @IsOptional() @IsBoolean() exception?: boolean; @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
export class ParametersDto { @ApiProperty() @IsInt() @Min(1) @Max(100) absenceLimit!: number; @ApiProperty() @IsInt() @Min(1) @Max(30) justificationDays!: number; @ApiProperty() @IsInt() @Min(0) @Max(23) confirmationHour!: number; @ApiProperty() @IsInt() @Min(2) @Max(24) closeHours!: number; }
export class AlertDto { @ApiProperty() @IsIn(['ALL', 'PATIENT', 'THERAPIST']) audience!: string; @ApiProperty() @IsString() @MinLength(5) @MaxLength(2000) text!: string; @ApiProperty() @IsDateString() endsAt!: string; }
export class PrivacyDto { @ApiProperty() @IsIn(['EXPORT', 'DELETE']) type!: string; }
export class ConsentDto { @ApiProperty() @IsIn(['TERMS', 'PRIVACY', 'HEALTH']) document!: string; @ApiProperty() @IsString() @MinLength(1) @MaxLength(40) version!: string; }

export class MemberStatusDto { @IsBoolean() active!: boolean; @IsString() @MinLength(5) @MaxLength(1000) reason!: string; }
export class PatientParametersDto {
  @ValidateIf((_o, value) => value !== null) @IsInt() @Min(1) @Max(100) absenceLimit!: number | null;
  @ValidateIf((_o, value) => value !== null) @IsInt() @Min(1) @Max(30) justificationDays!: number | null;
}

export class ReasonDto { @IsString() @MinLength(5) @MaxLength(1000) reason!: string; }
