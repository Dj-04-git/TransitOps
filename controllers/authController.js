import db from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { config } from "../config.js";

const SUPPORTED_ROLES = [
  "fleet_manager",
  "driver",
  "safety_officer",
  "financial_analyst"
];

let transporter;

const initializeTransporter = () => {
  if (!config.EMAIL || !config.EMAIL_PASS) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL,
        pass: config.EMAIL_PASS
      }
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text }) => {
  const mailer = initializeTransporter();

  if (!mailer) {
    return;
  }

  await mailer.sendMail({
    from: config.EMAIL,
    to,
    subject,
    text
  });
};

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");
const normalizeRole = (role) => (typeof role === "string" ? role.trim().toLowerCase() : "");
const isSupportedRole = (role) => SUPPORTED_ROLES.includes(role);

const buildToken = (user) =>
  jwt.sign(
    {
      id: Number(user.id),
      email: user.email,
      role: user.role
    },
    config.JWT_SECRET,
    {
      algorithm: config.JWT_ALGORITHM,
      expiresIn: config.JWT_EXPIRES_IN
    }
  );

const toUserResponse = (user) => ({
  id: Number(user.id),
  email: user.email,
  role: user.role,
  createdAt: user.created_at
});

export const getRoles = (req, res) => {
  res.json({ roles: SUPPORTED_ROLES });
};

export const register = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const role = normalizeRole(req.body.role);

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, password, and role are required" });
  }

  if (!isSupportedRole(role)) {
    return res.status(400).json({ error: "Invalid role", allowedRoles: SUPPORTED_ROLES });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role]
    );

    const user = result.rows[0];
    const token = buildToken(user);

    await sendEmail({
      to: user.email,
      subject: "TransitOps account created",
      text: `Your TransitOps account has been created with the role: ${user.role}.`
    });

    return res.status(201).json({ message: "Registered successfully", token, user: toUserResponse(user) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "User already exists" });
    }

    console.error("Register error:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
};

export const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const role = req.body.role ? normalizeRole(req.body.role) : null;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (role && !isSupportedRole(role)) {
    return res.status(400).json({ error: "Invalid role", allowedRoles: SUPPORTED_ROLES });
  }

  try {
    const result = await db.query(
      "SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ error: "Invalid password" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ error: "Selected role does not match the account role" });
    }

    const token = buildToken(user);

    return res.json({ message: "Login successful", token, user: toUserResponse(user) });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to login" });
  }
};

export const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await db.query("SELECT id, email FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const resetToken = jwt.sign(
      { id: Number(user.id), email: user.email, purpose: "password_reset" },
      config.JWT_SECRET,
      { algorithm: config.JWT_ALGORITHM, expiresIn: "15m" }
    );

    await sendEmail({
      to: user.email,
      subject: "TransitOps password reset",
      text: `Use this reset token to set a new password: ${resetToken}`
    });

    return res.json({ message: "Password reset token sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to send password reset token" });
  }
};

export const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const resetToken = req.body.resetToken;
  const newPassword = req.body.newPassword;

  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: "Email, reset token, and new password are required" });
  }

  try {
    const decoded = jwt.verify(resetToken, config.JWT_SECRET);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    if (normalizeEmail(decoded.email) !== email) {
      return res.status(400).json({ error: "Reset token does not match the email" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const result = await db.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = $2
       RETURNING id, email, role, created_at`,
      [hashed, email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    return res.json({ message: "Password reset successful", user: toUserResponse(user) });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Reset token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

export const getProfile = async (req, res) => {
  const requestedId = req.params.id ? Number(req.params.id) : Number(req.user.id);
  const tokenUserId = Number(req.user.id);

  if (requestedId !== tokenUserId) {
    return res.status(403).json({ error: "Unauthorized - Cannot access another user's account" });
  }

  try {
    const result = await db.query("SELECT id, email, role, created_at FROM users WHERE id = $1", [requestedId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    return res.json({ user: toUserResponse(user) });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to load account" });
  }
};

export const updateProfile = async (req, res) => {
  const requestedId = req.params.id ? Number(req.params.id) : Number(req.user.id);
  const tokenUserId = Number(req.user.id);

  if (requestedId !== tokenUserId) {
    return res.status(403).json({ error: "Unauthorized - Cannot update another user's account" });
  }

  const email = req.body.email ? normalizeEmail(req.body.email) : null;
  const newPassword = req.body.newPassword;
  const role = req.body.role ? normalizeRole(req.body.role) : null;

  if (role) {
    return res.status(400).json({ error: "Role changes are not allowed through this endpoint" });
  }

  try {
    const currentResult = await db.query("SELECT id, email, role, created_at FROM users WHERE id = $1", [requestedId]);
    const currentUser = currentResult.rows[0];

    if (!currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    let updatedUser = currentUser;

    if (email || newPassword) {
      const nextEmail = email || currentUser.email;
      const nextPasswordHash = newPassword ? await bcrypt.hash(newPassword, 10) : null;

      const updateResult = await db.query(
        `UPDATE users
         SET email = $1,
             password_hash = COALESCE($2, password_hash)
         WHERE id = $3
         RETURNING id, email, role, created_at`,
        [nextEmail, nextPasswordHash, requestedId]
      );

      updatedUser = updateResult.rows[0];
    }

    return res.json({ message: "Account updated successfully", user: toUserResponse(updatedUser) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Failed to update account" });
  }
};

// // REGISTER
// export const register = async (req, res) => {
//   const { name, email, password, phone, location, about } = req.body;
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   db.run(
//     "INSERT INTO users (name, email, password, otp, phone, location, about) VALUES (?, ?, ?, ?, ?, ?, ?)",
//     [name, email, hashedPassword, otp, phone , location , about ],
//     function (err) {
//       if (err) return res.status(400).json({ error: "User already exists" });

//       initializeTransporter().sendMail({
//         to: email,
//         subject: "OTP Verification",
//         text: `Your OTP is ${otp}`
//       });

//       res.json({ message: "Registered successfully. Verify OTP." });
//     }
//   );
// };

// // VERIFY OTP
// export const verifyOtp = (req, res) => {
//   const { email, otp } = req.body;

//   db.get(
//     "SELECT * FROM users WHERE email=? AND otp=?",
//     [email, otp],
//     (err, user) => {
//       if (!user) return res.status(400).json({ error: "Invalid OTP" });

//       db.run(
//         "UPDATE users SET isVerified=1, otp=NULL WHERE email=?",
//         [email]
//       );

//       res.json({ message: "Account verified successfully" });
//     }
//   );
// };

// // RESEND OTP
// export const resendOtp = (req, res) => {
//   const { email } = req.body;
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   db.run(
//     "UPDATE users SET otp=? WHERE email=?",
//     [otp, email],
//     function (err) {
//       if (err) return res.status(400).json({ message: "User not found" });

//       initializeTransporter().sendMail({
//         to: email,
//         subject: "OTP Verification",
//         text: `Your OTP is ${otp}`
//       });

//       res.json({ message: "OTP resent successfully" });
//     }
//   );
// };

// // LOGIN
// export const login = (req, res) => {
//   const { email, password } = req.body;

//   db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
//     if (!user) return res.status(400).json({ error: "User not found" });
//     if (!user.isVerified) return res.status(403).json({ error: "Verify OTP first" });

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) return res.status(400).json({ error: "Invalid password" });

//   const token = jwt.sign(
//   { id: user.id },
//   config.JWT_SECRET,
//   { expiresIn: "1h" }
// );

//     res.json({ message: "Login successful", token, userId: user.id });
//   });
// };

// // FORGOT PASSWORD (SEND OTP)
// export const forgotPassword = (req, res) => {
//   const { email } = req.body;
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   db.run("UPDATE users SET otp=? WHERE email=?", [otp, email], function () {
//     initializeTransporter().sendMail({
//       to: email,
//       subject: "Reset Password OTP",
//       text: `Your OTP is ${otp}`
//     });

//     res.json({ message: "OTP sent to email" });
//   });
// };

// // RESET PASSWORD
// export const resetPassword = async (req, res) => {
//   const { email, otp, newPassword } = req.body;
//   const hashed = await bcrypt.hash(newPassword, 10);

//   db.get(
//     "SELECT * FROM users WHERE email=? AND otp=?",
//     [email, otp],
//     (err, user) => {
//       if (!user) return res.status(400).json({ error: "Invalid OTP" });

//       db.run(
//         "UPDATE users SET password=?, otp=NULL WHERE email=?",
//         [hashed, email]
//       );

//       res.json({ message: "Password reset successful" });
//     }
//   );
// };

// // GET PROFILE
// export const getProfile = (req, res) => {
//   const { id } = req.params;
//   const tokenUserId = req.user.id; // User ID from JWT token

//   // Verify user can only access their own profile
//   if (parseInt(id) !== tokenUserId) {
//     return res.status(403).json({ error: "Unauthorized - Cannot access another user's profile" });
//   }

//   db.get(
//     "SELECT id, name, email, phone, location, about FROM users WHERE id=?",
//     [id],
//     (err, user) => {
//       if (err || !user) {
//         return res.status(400).json({ error: "User not found" });
//       }

//       res.json({ user });
//     }
//   );
// };

// // UPDATE PROFILE
// export const updateProfile = (req, res) => {
//   const { id } = req.params;
//   const { name, phone, location, about } = req.body;
//   const tokenUserId = req.user.id;

//   // Verify user can only update their own profile
//   if (parseInt(id) !== tokenUserId) {
//     return res.status(403).json({ error: "Unauthorized - Cannot update another user's profile" });
//   }

//   db.run(
//     "UPDATE users SET name = ?, phone = ?, location = ?, about = ? WHERE id = ?",
//     [name, phone, location, about, id],
//     function (err) {
//       if (err) {
//         console.error('Database error updating profile:', err);
//         return res.status(400).json({ error: "Error updating profile: " + err.message });
//       }

//       // Fetch and return updated profile
//       db.get(
//         "SELECT id, name, email, phone, location, about FROM users WHERE id=?",
//         [id],
//         (err, user) => {
//           if (err || !user) {
//             return res.status(400).json({ error: "User not found" });
//           }

//           res.json({ message: "Profile updated successfully", user });
//         }
//       );
//     }
//   );
// };
