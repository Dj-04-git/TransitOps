import dotenv from "dotenv";

dotenv.config();

export const config = {
  JWT_SECRET: process.env.JWT_SECRET || process.env.SECRET_KEY,
  JWT_ALGORITHM: process.env.ALGORITHM || "HS256",
  JWT_EXPIRES_IN: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 60}m`,
  EMAIL: process.env.EMAIL,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL
};
