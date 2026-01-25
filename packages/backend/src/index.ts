import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'

import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { groupsRouter } from './routes/groups.js'
import { sessionsRouter } from './routes/sessions.js'
import { carsRouter } from './routes/cars.js'
import { bansRouter } from './routes/bans.js'
import { avatarsRouter } from './routes/avatars.js'
import { userCarsRouter } from './routes/userCars.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/cars', carsRouter)
app.use('/api/bans', bansRouter)
app.use('/api/avatars', avatarsRouter)
app.use('/api/user-cars', userCarsRouter)

// Error handler
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export { app }
