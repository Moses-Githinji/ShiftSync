import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
