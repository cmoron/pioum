import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    console.error(`AppError ${err.statusCode}: ${err.message}`)
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    })
  }

  if (err instanceof ZodError) {
    console.error(`ZodError: ${err.message}`)
    return res.status(400).json({
      error: 'Validation error',
      details: err.issues
    })
  }

  console.error('Error:', err)
  return res.status(500).json({
    error: 'Internal server error'
  })
}
