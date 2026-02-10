import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../lib/validation.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setTokenCookies, 
  clearTokenCookies,
  verifyToken 
} from '../lib/jwt.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { sendTemplateEmail } from '../lib/email.js';
import { notifyLogin, notifyLogout, notifyPasswordChange, notifyOtpEnabled, notifyOtpDisabled, notifyProfileUpdate } from '../lib/notification.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper function to check if email verification is enabled
async function isEmailVerificationEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });
    if (setting?.value) {
      const settings = JSON.parse(setting.value);
      return settings.emailVerificationEnabled !== false; // Default to true
    }
    return true; // Default enabled
  } catch {
    return true; // Default enabled on error
  }
}

// Helper function to generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send verification email
async function sendVerificationEmail(userId: string, email: string, name: string) {
  // Check if email verification is enabled
  if (!await isEmailVerificationEnabled()) {
    console.log('Email verification is disabled, skipping verification email');
    return;
  }

  // Delete any existing unused tokens
  await prisma.emailVerificationToken.deleteMany({
    where: { userId, used: false },
  });

  // Create verification token and OTP (valid for 30 minutes)
  const token = crypto.randomBytes(32).toString('hex');
  const otp = generateOtp();
  
  await prisma.emailVerificationToken.create({
    data: {
      token,
      otp,
      userId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  });

  // Get site name
  const siteSetting = await prisma.setting.findUnique({
    where: { key: 'site_name' },
  });
  const siteName = siteSetting?.value || 'ZNode';

  // Send verification email with OTP
  const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;
  await sendTemplateEmail('EMAIL_VERIFICATION', email, {
    name: name || email,
    verifyLink,
    siteName,
    otp, // Include OTP in email
  }, userId);

  return token;
}

// Helper function to handle OAuth callback
function handleOAuthCallback(provider: string) {
  return async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }

    // Send verification email if user is not verified
    if (!user.emailVerified) {
      try {
        await sendVerificationEmail(user.id, user.email, user.name || '');
        console.log(`Verification email sent for OAuth user ${user.email} via ${provider}`);
      } catch (emailError) {
        console.error(`Failed to send verification email for OAuth user ${user.email}:`, emailError);
        // Don't fail login if email fails
      }
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    // Set cookies with proper settings for cross-origin
    setTokenCookies(res, accessToken, refreshToken);
    
    // Also pass token in URL for frontend to set in localStorage (backup for cross-site cookie issues)
    res.redirect(`${FRONTEND_URL}/oauth-callback?token=${accessToken}&refreshToken=${refreshToken}`);
  };
}

// ==================== Local Auth Routes ====================

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, password, name } = validation.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (emailVerified is null by default - not verified)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.id, user.email, user.name || '');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user,
      accessToken,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    const { email, password, twoFactorCode } = validation.data as { email: string; password: string; twoFactorCode?: string };

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // If 2FA code not provided, return requires2FA
      if (!twoFactorCode) {
        // Generate a temp token for 2FA verification
        const tempToken = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        return res.status(200).json({ 
          requires2FA: true,
          tempToken,
          message: 'Please enter your 2FA code'
        });
      }

      // Verify 2FA code
      const { verifySync } = await import('otplib');
      const result = verifySync({
        token: twoFactorCode,
        secret: user.twoFactorSecret
      });

      if (!result.valid) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    setTokenCookies(res, accessToken, refreshToken);

    // Create login notification
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    notifyLogin(user.id, clientIp, userAgent).catch(console.error);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 2FA Login Verification
router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { code, tempToken, isRecoveryCode } = req.body;

    if (!code || !tempToken) {
      return res.status(400).json({ error: 'Verification code and temp token are required' });
    }

    // Decode temp token to get user info
    const decoded = Buffer.from(tempToken, 'base64').toString();
    const [userId, timestamp] = decoded.split(':');

    // Check if token is expired (5 minutes)
    const tokenTime = parseInt(timestamp);
    if (Date.now() - tokenTime > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Verification session expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        twoFactorSecret: true, 
        twoFactorEnabled: true,
        recoveryCodes: true
      }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Invalid verification request' });
    }

    if (isRecoveryCode) {
      // Verify recovery code
      if (!user.recoveryCodes) {
        return res.status(400).json({ error: 'No recovery codes available' });
      }

      const storedCodes: string[] = JSON.parse(user.recoveryCodes);
      let matchedIndex = -1;
      const normalizedInput = code.trim().toUpperCase();

      for (let i = 0; i < storedCodes.length; i++) {
        const isMatch = await bcrypt.compare(normalizedInput, storedCodes[i]);
        if (isMatch) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex === -1) {
        return res.status(400).json({ error: 'Invalid recovery code' });
      }

      // Remove used recovery code
      storedCodes.splice(matchedIndex, 1);
      await prisma.user.update({
        where: { id: userId },
        data: { recoveryCodes: JSON.stringify(storedCodes) }
      });
    } else {
      // Verify TOTP code
      const { verifySync } = await import('otplib');
      const verifyResult = verifySync({
        token: code,
        secret: user.twoFactorSecret
      });

      if (!verifyResult.valid) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    setTokenCookies(res, accessToken, refreshToken);

    // Create login notification (2FA login)
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    notifyLogin(user.id, clientIp, userAgent).catch(console.error);

    // Return success with token
    res.json({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'Unknown';
    
    if (userId) {
      notifyLogout(userId, clientIp).catch(console.error);
    }
    
    clearTokenCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    clearTokenCookies(res);
    res.json({ message: 'Logged out successfully' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const payload = verifyToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({
      message: 'Token refreshed',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        accounts: {
          select: {
            provider: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== Google OAuth Routes ====================
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
      console.log('Google OAuth callback - error:', err);
      console.log('Google OAuth callback - user:', user?.id || 'none');
      console.log('Google OAuth callback - info:', info);
      
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=google_error&message=${encodeURIComponent(err.message || 'Unknown error')}`);
      }
      
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
      }
      
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback('google')
);

// ==================== Facebook OAuth Routes ====================
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get(
  '/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Facebook OAuth error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=facebook_error&message=${encodeURIComponent(err.message || 'Unknown error')}`);
      }
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback('facebook')
);

// ==================== Microsoft OAuth Routes ====================
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));

router.get(
  '/microsoft/callback',
  (req, res, next) => {
    passport.authenticate('microsoft', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Microsoft OAuth error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=microsoft_error&message=${encodeURIComponent(err.message || 'Unknown error')}`);
      }
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=microsoft_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback('microsoft')
);

// ==================== Discord OAuth Routes ====================
router.get('/discord', passport.authenticate('discord', { scope: ['identify', 'email'] }));

router.get(
  '/discord/callback',
  (req, res, next) => {
    passport.authenticate('discord', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Discord OAuth error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=discord_error&message=${encodeURIComponent(err.message || 'Unknown error')}`);
      }
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=discord_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback('discord')
);

// ==================== GitHub OAuth Routes ====================
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  (req, res, next) => {
    passport.authenticate('github', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('GitHub OAuth error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=github_error&message=${encodeURIComponent(err.message || 'Unknown error')}`);
      }
      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=github_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback('github')
);

// ==================== Link/Unlink OAuth Accounts ====================

// Get linked accounts
router.get('/accounts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        provider: true,
        createdAt: true,
      },
    });

    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Unlink an OAuth account
router.delete('/accounts/:provider', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = req.params.provider as string;
    
    // Check if user has password or other linked accounts
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { accounts: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure user has another way to login
    if (!user.password && user.accounts.length <= 1) {
      return res.status(400).json({ 
        error: 'Cannot unlink last authentication method. Please set a password first.' 
      });
    }

    // Delete the account link
    await prisma.account.deleteMany({
      where: {
        userId: req.user!.id,
        provider,
      },
    });

    res.json({ message: `${provider} account unlinked successfully` });
  } catch (error) {
    console.error('Unlink account error:', error);
    res.status(500).json({ error: 'Failed to unlink account' });
  }
});

// ==================== Password Reset Routes ====================

// Forgot password - request reset email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send reset email
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
    await sendTemplateEmail('PASSWORD_RESET', user.email, {
      name: user.name || user.email.split('@')[0],
      resetLink,
    }, user.id);

    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token
router.get('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { email: true } } },
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'This token has already been used' });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    res.json({ valid: true, email: resetToken.user.email });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find and validate token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (resetToken.used) {
      return res.status(400).json({ error: 'This token has already been used' });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    await Promise.all([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ==================== Email Verification Routes ====================

// Send verification email (for logged in users or after registration)
router.post('/send-verification', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    await sendVerificationEmail(user.id, user.email, user.name || '');

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Resend verification email (for not logged in users)
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If your email exists, a verification link will be sent' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'If your email exists, a verification link will be sent' });
    }

    await sendVerificationEmail(user.id, user.email, user.name || '');

    res.json({ message: 'If your email exists, a verification link will be sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Helper function to verify Turnstile captcha
async function verifyTurnstile(turnstileToken: string): Promise<boolean> {
  try {
    // Get Turnstile settings
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });
    
    if (!setting) return true; // No settings, skip verification
    
    const settings = JSON.parse(setting.value);
    if (!settings.turnstileEnabled || !settings.turnstileSecretKey) {
      return true; // Turnstile not enabled, skip
    }
    
    // Verify with Cloudflare
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: settings.turnstileSecretKey,
        response: turnstileToken,
      }),
    });
    
    const result = await response.json() as { success: boolean };
    return result.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Verify email with token
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token, turnstileToken, otp } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get verification token first to check if OTP is required
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (verificationToken.used) {
      return res.status(400).json({ error: 'This token has already been used' });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Check if Turnstile is required
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });
    
    if (setting) {
      const settings = JSON.parse(setting.value);
      if (settings.turnstileEnabled && settings.turnstileSecretKey) {
        if (!turnstileToken) {
          return res.status(400).json({ error: 'Captcha verification required' });
        }
        
        const isValidCaptcha = await verifyTurnstile(turnstileToken);
        if (!isValidCaptcha) {
          return res.status(400).json({ error: 'Captcha verification failed' });
        }
      }
    }

    // Check OTP if it exists in the token
    if (verificationToken.otp) {
      if (!otp) {
        return res.status(400).json({ error: 'OTP code is required', requireOtp: true });
      }
      if (otp !== verificationToken.otp) {
        return res.status(400).json({ error: 'Invalid OTP code' });
      }
    }

    // Mark email as verified and token as used
    await Promise.all([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    res.json({ 
      message: 'Email verified successfully',
      email: verificationToken.user.email,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Check verification status (for token from URL)
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: { select: { email: true } } },
    });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired token', valid: false });
    }

    if (verificationToken.used) {
      return res.status(400).json({ error: 'This token has already been used', valid: false });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token has expired', valid: false });
    }

    res.json({ 
      valid: true, 
      email: (verificationToken as any).user.email,
      requireOtp: !!verificationToken.otp, // Indicate if OTP is required
    });
  } catch (error) {
    console.error('Check verification token error:', error);
    res.status(500).json({ error: 'Failed to verify token', valid: false });
  }
});

export default router;
