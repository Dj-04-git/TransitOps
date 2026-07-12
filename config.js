import dotenv from "dotenv";

dotenv.config();

export const config = {
  JWT_SECRET: process.env.JWT_SECRET,
  EMAIL: process.env.EMAIL,
  EMAIL_PASS: process.env.EMAIL_PASS,
  PORT: process.env.PORT || 5000
};