import { IsString } from "class-validator";

export class FollowUserDto {
  @IsString()
  follower_id: string | undefined;

  @IsString()
  following_id: string | undefined;
}