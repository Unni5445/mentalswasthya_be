import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import mongoose from "mongoose";
import cron from "node-cron";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from 'swagger-ui-express';
import specs from './src/config/swagger';

import { pageNotFound } from "./src/middlewares/pageNotFound";
import errorHandler from "./src/middlewares/errorHandler";
import { apiKeyMiddleware } from "./src/middlewares/apiKey";

import authRoutes from "./src/routes/auth.routes";
import orgRoutes from "./src/routes/org.routes";
import breathingRoutes from "./src/routes/breathing.routes";
import notificationRoutes from "./src/routes/notification.routes";
import adminRoutes from "./src/routes/admin.routes";
import musicRoutes from "./src/routes/music.routes";
import affirmationRoutes from "./src/routes/affirmation.routes";
import meditationRoutes from "./src/routes/meditation.routes";

dotenv.config();
const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cookieParser());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all in development
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

app.use(limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Public Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Key check
app.use('/', apiKeyMiddleware);

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/corporate", orgRoutes);
app.use("/api/breathing", breathingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/saas", adminRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/affirmation", affirmationRoutes);
app.use("/api/meditation", meditationRoutes);

// DB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("MongoDB connection failed:", err.message));

// Error Handling
app.use(pageNotFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`server run successfully http://localhost:${PORT}`)
);

