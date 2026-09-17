import { IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsString()
  @IsNotEmpty()
  requiredSkill: string;

  @IsInt()
  @Min(1)
  headcount: number;
}
