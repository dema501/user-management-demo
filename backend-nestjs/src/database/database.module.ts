import { Module, Global } from '@nestjs/common';
import { DrizzleProvider } from './drizzle.provider';
@Global()
@Module({
  providers: [DrizzleProvider],
  exports: [DrizzleProvider], // Export the provider token
})
export class DatabaseModule {}
