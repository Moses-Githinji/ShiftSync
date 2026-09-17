import { IsNotEmpty, IsString } from 'class-validator';

export class ProposeSwapDto {
  @IsString()
  @IsNotEmpty()
  assignmentId: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
