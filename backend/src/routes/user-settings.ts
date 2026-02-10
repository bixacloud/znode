import { Router, Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthenticatedRequest, adminMiddleware } from '../middleware/auth.js';
import { notifyPasswordChange, notifyOtpEnabled, notifyOtpDisabled, notifyProfileUpdate } from '../lib/notification.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== Profile Routes ====================

// Update display name
router.put('/profile/name', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user!.id;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: trimmedName }
    });

    // Create notification for name change
    const clientIp = (req as any).headers['x-forwarded-for']?.toString().split(',')[0] || (req as any).ip || 'Unknown';
    notifyProfileUpdate(userId, clientIp, ['display name']).catch(console.error);

    res.json({ message: 'Name updated successfully', name: trimmedName });
  } catch (error) {
    console.error('Update name error:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

// ==================== Password Routes ====================

// Change password
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has password (OAuth users might not)
    if (!user.password) {
      return res.status(400).json({ 
        error: 'Cannot change password for OAuth accounts. Please set a password first.' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Create notification for password change
    const clientIp = (req as any).headers['x-forwarded-for']?.toString().split(',')[0] || (req as any).ip || 'Unknown';
    notifyPasswordChange(userId, clientIp).catch(console.error);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Set password for OAuth users
router.post('/set-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user!.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has password
    if (user.password) {
      return res.status(400).json({ error: 'Password already set. Use change password instead.' });
    }

    // Hash and save password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password set successfully' });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// ==================== 2FA Routes ====================

// Get 2FA status
router.get('/2fa/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorEnabled: true,
        password: true // Check if user has password set
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      enabled: user.twoFactorEnabled,
      hasPassword: !!user.password
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

// Setup 2FA - Generate secret and QR code
router.post('/2fa/setup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Require password for 2FA
    if (!user.password) {
      return res.status(400).json({ error: 'Please set a password before enabling 2FA' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate secret
    const secret = generateSecret();
    
    // Get site name from settings DB
    const siteNameSetting = await prisma.setting.findUnique({ where: { key: 'site_name' } });
    const appName = siteNameSetting?.value || process.env.APP_NAME || 'ZNode';
    const otpauth = generateURI({ 
      secret,
      issuer: appName,
      label: userEmail 
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Temporarily store secret (will be confirmed when user verifies)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret }
    });

    res.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauth
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/2fa/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: 'Please setup 2FA first' });
    }

    // Verify the code
    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret
    });

    if (!result.valid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Generate 8 recovery codes
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      plainCodes.push(formatted);
      hashedCodes.push(await bcrypt.hash(formatted, 10));
    }

    // Enable 2FA and store hashed recovery codes
    await prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: true,
        recoveryCodes: JSON.stringify(hashedCodes)
      }
    });

    // Create notification for 2FA enabled
    const clientIp = (req as any).headers['x-forwarded-for']?.toString().split(',')[0] || (req as any).ip || 'Unknown';
    notifyOtpEnabled(userId, clientIp).catch(console.error);

    res.json({ message: '2FA enabled successfully', recoveryCodes: plainCodes });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/2fa/disable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, password } = req.body;
    const userId = req.user!.id;

    if (!code || !password) {
      return res.status(400).json({ error: 'Verification code and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify password
    if (!user.password) {
      return res.status(400).json({ error: 'No password set' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify the 2FA code
    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA secret not found' });
    }

    const codeResult = verifySync({
      token: code,
      secret: user.twoFactorSecret
    });

    if (!codeResult.valid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null
      }
    });

    // Create notification for 2FA disabled
    const clientIp = (req as any).headers['x-forwarded-for']?.toString().split(',')[0] || (req as any).ip || 'Unknown';
    notifyOtpDisabled(userId, clientIp).catch(console.error);

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// ==================== Admin Signature Route ====================

// Get admin signature
router.get('/admin/signature', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { adminSignature: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ signature: user.adminSignature || '' });
  } catch (error) {
    console.error('Get admin signature error:', error);
    res.status(500).json({ error: 'Failed to get signature' });
  }
});

// Update admin signature
router.put('/admin/signature', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { signature } = req.body;
    const userId = req.user!.id;

    if (signature === undefined) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { adminSignature: signature }
    });

    res.json({ message: 'Signature updated successfully' });
  } catch (error) {
    console.error('Update admin signature error:', error);
    res.status(500).json({ error: 'Failed to update signature' });
  }
});

export default router;
