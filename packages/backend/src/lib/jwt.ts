import jwt from 'jsonwebtoken'

// Validate JWT_SECRET in production/staging environments
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    throw new Error(
      'CRITICAL: JWT_SECRET environment variable must be set in production/staging. ' +
      'Generate a secure secret with: openssl rand -hex 32'
    )
  }
  console.warn(
    '[SECURITY WARNING] JWT_SECRET not set - using insecure default. ' +
    'This is only acceptable in development mode.'
  )
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod'

export interface JWTPayload {
  userId: string
  email?: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions)
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}
