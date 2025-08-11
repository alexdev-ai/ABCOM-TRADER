import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
}

export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        const apiError: ApiError = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationErrors
          }
        };

        return res.status(400).json(apiError);
      }

      // Handle unexpected validation errors
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during validation'
        }
      };

      return res.status(500).json(apiError);
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic input sanitization
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Trim whitespace
        req.body[key] = req.body[key].trim();
        
        // Remove null bytes
        req.body[key] = req.body[key].replace(/\0/g, '');
      }
    }
  }
  
  next();
};
