import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  @Redirect('/api/v1/docs', 301)
  redirectWithStatus() {}
}
