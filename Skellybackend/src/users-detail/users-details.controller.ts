import { Controller, Get, Param, Post, Delete, Body } from "@nestjs/common";
import { UsersDetailsService } from "./users-details.service";
import { FollowUserDto } from "./dto/follow-user.dto";

@Controller("users-details")
export class UsersDetailsController {
  constructor(private readonly usersService: UsersDetailsService) {}

  @Get(":id")
  async getUserDetails(@Param("id") id: string) {
    return this.usersService.getUserDetails(id);
  }

  @Post("follow")
  async followUser(@Body() dto: FollowUserDto) {
    return this.usersService.followUser(dto);
  }

  @Delete("unfollow")
  async unfollowUser(@Body() dto: FollowUserDto) {
    return this.usersService.unfollowUser(dto);
  }
}