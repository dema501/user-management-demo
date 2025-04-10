import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Skip validation for non-payload types unless specifically needed
    if (!['body', 'query', 'param'].includes(metadata.type)) {
      return value;
    }

    try {
      return this.schema.parse(value) as unknown;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Validation failed (${metadata.type})`,
          errors: this.formatZodError(error),
        });
      }
      // Handle unexpected errors
      throw new BadRequestException('Validation failed');
    }
  }

  private formatZodError(error: ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.') || 'object';
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });
    return errors;
  }
}
