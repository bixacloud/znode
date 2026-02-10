import { Router, Response } from 'express';
import { lookup } from 'dns/promises';
import prisma from '../lib/prisma.js';
import { adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get single public setting value (for frontend)
router.get('/public/:key', async (req, res: Response) => {
  try {
    const { key } = req.params;
    
    // Whitelist of public settings
    const publicKeys = ['LANDING_PAGE_ENABLED'];
    
    if (!publicKeys.includes(key)) {
      return res.status(403).json({ error: 'Setting not publicly accessible' });
    }
    
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    
    res.json({
      key,
      value: setting?.value ?? 'true',
    });
  } catch (error) {
    console.error('Get public setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Update multiple settings (admin only)
router.put('/', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body as { settings: Record<string, string> };
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    // Update each setting
    const updates = Object.entries(settings).map(async ([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    });
    
    await Promise.all(updates);
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// OAuth Provider interface
interface OAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUrl?: string;
}

interface OAuthSettings {
  google: OAuthConfig;
  facebook: OAuthConfig;
  microsoft: OAuthConfig;
  discord: OAuthConfig;
  github: OAuthConfig;
}

const defaultOAuthSettings: OAuthSettings = {
  google: { enabled: false, clientId: '', clientSecret: '' },
  facebook: { enabled: false, clientId: '', clientSecret: '' },
  microsoft: { enabled: false, clientId: '', clientSecret: '' },
  discord: { enabled: false, clientId: '', clientSecret: '' },
  github: { enabled: false, clientId: '', clientSecret: '' },
};

// Get OAuth settings (admin only)
router.get('/oauth', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    if (!setting) {
      return res.json({ settings: defaultOAuthSettings });
    }

    const settings = JSON.parse(setting.value) as OAuthSettings;
    
    // Mask secrets for security (only show last 4 chars)
    const maskedSettings: OAuthSettings = {
      google: {
        ...settings.google,
        clientSecret: settings.google.clientSecret 
          ? '••••••••' + settings.google.clientSecret.slice(-4) 
          : '',
      },
      facebook: {
        ...settings.facebook,
        clientSecret: settings.facebook.clientSecret 
          ? '••••••••' + settings.facebook.clientSecret.slice(-4) 
          : '',
      },
      microsoft: {
        ...settings.microsoft,
        clientSecret: settings.microsoft.clientSecret 
          ? '••••••••' + settings.microsoft.clientSecret.slice(-4) 
          : '',
      },
      discord: {
        ...settings.discord,
        clientSecret: settings.discord.clientSecret 
          ? '••••••••' + settings.discord.clientSecret.slice(-4) 
          : '',
      },
      github: {
        ...(settings.github || defaultOAuthSettings.github),
        clientSecret: settings.github?.clientSecret 
          ? '••••••••' + settings.github.clientSecret.slice(-4) 
          : '',
      },
    };

    res.json({ settings: maskedSettings });
  } catch (error) {
    console.error('Get OAuth settings error:', error);
    res.status(500).json({ error: 'Failed to get OAuth settings' });
  }
});

// Update OAuth settings (admin only)
router.put('/oauth', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, config } = req.body as { provider: keyof OAuthSettings; config: OAuthConfig };

    if (!provider || !config) {
      return res.status(400).json({ error: 'Provider and config are required' });
    }

    if (!['google', 'facebook', 'microsoft', 'discord', 'github'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Get current settings
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    let settings: OAuthSettings = currentSetting 
      ? JSON.parse(currentSetting.value) 
      : defaultOAuthSettings;

    // If clientSecret starts with •, keep the old one
    if (config.clientSecret && config.clientSecret.startsWith('••••••••')) {
      config.clientSecret = settings[provider].clientSecret;
    }

    // Update the specific provider
    settings[provider] = {
      enabled: config.enabled,
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      callbackUrl: config.callbackUrl,
    };

    // Save to database
    await prisma.setting.upsert({
      where: { key: 'oauth_config' },
      update: { value: JSON.stringify(settings) },
      create: { key: 'oauth_config', value: JSON.stringify(settings) },
    });

    // Update environment variables in memory (for immediate effect)
    updateEnvVariables(settings);

    res.json({ 
      message: `${provider} OAuth settings updated successfully`,
      provider,
    });
  } catch (error) {
    console.error('Update OAuth settings error:', error);
    res.status(500).json({ error: 'Failed to update OAuth settings' });
  }
});

// Update all OAuth settings at once
router.put('/oauth/all', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const newSettings = req.body as Partial<OAuthSettings>;

    // Get current settings
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    let settings: OAuthSettings = currentSetting 
      ? JSON.parse(currentSetting.value) 
      : defaultOAuthSettings;

    // Update each provider
    for (const provider of ['google', 'facebook', 'microsoft', 'discord', 'github'] as const) {
      if (newSettings[provider]) {
        const config = newSettings[provider]!;
        
        // If clientSecret starts with •, keep the old one
        if (config.clientSecret && config.clientSecret.startsWith('••••••••')) {
          config.clientSecret = settings[provider].clientSecret;
        }

        settings[provider] = {
          enabled: config.enabled ?? settings[provider].enabled,
          clientId: config.clientId ?? settings[provider].clientId,
          clientSecret: config.clientSecret ?? settings[provider].clientSecret,
          callbackUrl: config.callbackUrl ?? settings[provider].callbackUrl,
        };
      }
    }

    // Save to database
    await prisma.setting.upsert({
      where: { key: 'oauth_config' },
      update: { value: JSON.stringify(settings) },
      create: { key: 'oauth_config', value: JSON.stringify(settings) },
    });

    // Update environment variables in memory
    updateEnvVariables(settings);

    res.json({ 
      message: 'All OAuth settings updated successfully',
    });
  } catch (error) {
    console.error('Update all OAuth settings error:', error);
    res.status(500).json({ error: 'Failed to update OAuth settings' });
  }
});

// Test OAuth connection
router.post('/oauth/test/:provider', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = req.params.provider as string;

    if (!['google', 'facebook', 'microsoft', 'discord', 'github'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    if (!setting) {
      return res.status(400).json({ error: 'OAuth not configured' });
    }

    const settings = JSON.parse(setting.value) as OAuthSettings;
    const config = settings[provider as keyof OAuthSettings];

    if (!config.enabled) {
      return res.status(400).json({ error: `${provider} OAuth is disabled` });
    }

    if (!config.clientId || !config.clientSecret) {
      return res.status(400).json({ error: `${provider} OAuth credentials are incomplete` });
    }

    // For now, just check if credentials are set
    // In production, you might want to make a test API call
    res.json({ 
      success: true,
      message: `${provider} OAuth configuration looks valid`,
    });
  } catch (error) {
    console.error('Test OAuth error:', error);
    res.status(500).json({ error: 'Failed to test OAuth configuration' });
  }
});

// Get public OAuth status (for login page)
router.get('/oauth/status', async (req, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'oauth_config' },
    });

    if (!setting) {
      return res.json({
        google: false,
        facebook: false,
        microsoft: false,
        discord: false,
        github: false,
      });
    }

    const settings = JSON.parse(setting.value) as OAuthSettings;

    res.json({
      google: settings.google.enabled && !!settings.google.clientId,
      facebook: settings.facebook.enabled && !!settings.facebook.clientId,
      microsoft: settings.microsoft.enabled && !!settings.microsoft.clientId,
      discord: settings.discord.enabled && !!settings.discord.clientId,
      github: settings.github?.enabled && !!settings.github?.clientId,
    });
  } catch (error) {
    console.error('Get OAuth status error:', error);
    res.status(500).json({ error: 'Failed to get OAuth status' });
  }
});

// Helper function to update environment variables
function updateEnvVariables(settings: OAuthSettings) {
  if (settings.google.enabled) {
    process.env.GOOGLE_CLIENT_ID = settings.google.clientId;
    process.env.GOOGLE_CLIENT_SECRET = settings.google.clientSecret;
  }
  if (settings.facebook.enabled) {
    process.env.FACEBOOK_APP_ID = settings.facebook.clientId;
    process.env.FACEBOOK_APP_SECRET = settings.facebook.clientSecret;
  }
  if (settings.microsoft.enabled) {
    process.env.MICROSOFT_CLIENT_ID = settings.microsoft.clientId;
    process.env.MICROSOFT_CLIENT_SECRET = settings.microsoft.clientSecret;
  }
  if (settings.discord.enabled) {
    process.env.DISCORD_CLIENT_ID = settings.discord.clientId;
    process.env.DISCORD_CLIENT_SECRET = settings.discord.clientSecret;
  }
  if (settings.github?.enabled) {
    process.env.GITHUB_CLIENT_ID = settings.github.clientId;
    process.env.GITHUB_CLIENT_SECRET = settings.github.clientSecret;
  }
}

// ========================
// MOFH API Settings
// ========================

interface MOFHConfig {
  enabled: boolean;
  apiUsername: string;
  apiPassword: string;
  defaultPackage: string;
  cpanelUrl: string;
  customNameservers?: string;
}

const defaultMOFHSettings: MOFHConfig = {
  enabled: false,
  apiUsername: '',
  apiPassword: '',
  defaultPackage: '',
  cpanelUrl: '',
  customNameservers: '',
};

// Get MOFH settings (admin only)
router.get('/mofh', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });

    if (!setting) {
      return res.json({ settings: defaultMOFHSettings, packages: [] });
    }

    const settings = JSON.parse(setting.value) as MOFHConfig;
    
    // Mask password for security (only show last 4 chars)
    const maskedSettings: MOFHConfig = {
      ...settings,
      apiPassword: settings.apiPassword 
        ? '••••••••' + settings.apiPassword.slice(-4) 
        : '',
    };

    res.json({ settings: maskedSettings });
  } catch (error) {
    console.error('Get MOFH settings error:', error);
    res.status(500).json({ error: 'Failed to get MOFH settings' });
  }
});

// Update MOFH settings (admin only)
router.put('/mofh', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = req.body as MOFHConfig;

    // Get current settings to preserve password if masked
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });

    let currentSettings: MOFHConfig = currentSetting 
      ? JSON.parse(currentSetting.value) 
      : defaultMOFHSettings;

    // If password starts with •, keep the old one
    if (config.apiPassword && config.apiPassword.startsWith('••••••••')) {
      config.apiPassword = currentSettings.apiPassword;
    }

    const newSettings: MOFHConfig = {
      enabled: config.enabled ?? false,
      apiUsername: config.apiUsername || '',
      apiPassword: config.apiPassword || '',
      defaultPackage: config.defaultPackage || '',
      cpanelUrl: config.cpanelUrl || '',
      customNameservers: config.customNameservers || '',
    };

    // Save to database
    await prisma.setting.upsert({
      where: { key: 'mofh_config' },
      update: { value: JSON.stringify(newSettings) },
      create: { key: 'mofh_config', value: JSON.stringify(newSettings) },
    });

    res.json({ 
      message: 'MOFH settings updated successfully',
    });
  } catch (error) {
    console.error('Update MOFH settings error:', error);
    res.status(500).json({ error: 'Failed to update MOFH settings' });
  }
});

// Test MOFH connection (admin only)
router.post('/mofh/test', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiUsername, apiPassword } = req.body;

    // First try version endpoint (no auth needed)
    const versionResponse = await fetch('https://panel.myownfreehost.net/json-api/version.php');
    if (!versionResponse.ok) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot connect to MOFH API server' 
      });
    }
    const versionData = await versionResponse.json() as { version: string };

    // Then try to list packages with credentials
    const username = apiUsername;
    let password = apiPassword;

    // If masked password, get from database
    if (password && password.startsWith('••••••••')) {
      const setting = await prisma.setting.findUnique({
        where: { key: 'mofh_config' },
      });
      if (setting) {
        const settings = JSON.parse(setting.value) as MOFHConfig;
        password = settings.apiPassword;
      }
    }

    const authString = Buffer.from(`${username}:${password}`).toString('base64');
    const packagesResponse = await fetch('https://panel.myownfreehost.net/json-api/listpkgs.php', {
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    const packagesData = await packagesResponse.json() as { 
      package?: Array<{ name: string }>;
      cpanelresult?: {
        error?: string;
        data?: { reason?: string };
      };
    };

    // Check for error in response body (MOFH returns 200 even on auth failure)
    if (packagesData.cpanelresult?.error) {
      const errorMessage = packagesData.cpanelresult.data?.reason || packagesData.cpanelresult.error;
      
      // Detect specific error types
      let friendlyMessage = 'API connection failed';
      if (errorMessage.toLowerCase().includes('ip') || errorMessage.toLowerCase().includes('whitelist')) {
        friendlyMessage = 'IP address not whitelisted on MOFH';
      } else if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('invalid')) {
        friendlyMessage = 'Invalid API credentials';
      } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('key')) {
        friendlyMessage = 'Invalid API password/key';
      }
      
      return res.json({ 
        success: false,
        message: friendlyMessage,
        error: errorMessage,
        apiVersion: versionData.version,
      });
    }

    // Check if packages array exists (valid response)
    if (!packagesData.package) {
      return res.json({ 
        success: false,
        message: 'Invalid response from MOFH API',
        apiVersion: versionData.version,
      });
    }

    res.json({ 
      success: true,
      message: 'MOFH API connection successful!',
      apiVersion: versionData.version,
      packagesCount: packagesData.package.length,
    });
  } catch (error) {
    console.error('Test MOFH connection error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to connect to MOFH API' 
    });
  }
});

// Get MOFH packages (admin only)
router.get('/mofh/packages', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });

    if (!setting) {
      return res.status(400).json({ error: 'MOFH not configured' });
    }

    const settings = JSON.parse(setting.value) as MOFHConfig;

    if (!settings.apiUsername || !settings.apiPassword) {
      return res.status(400).json({ error: 'MOFH credentials not set' });
    }

    const authString = Buffer.from(`${settings.apiUsername}:${settings.apiPassword}`).toString('base64');
    const response = await fetch('https://panel.myownfreehost.net/json-api/listpkgs.php', {
      headers: {
        'Authorization': `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch packages from MOFH' });
    }

    const data = await response.json() as { package?: Array<{ name: string }> };
    const packages = data.package?.map((pkg: { name: string }) => ({
      name: pkg.name,
    })) || [];

    res.json({ packages });
  } catch (error) {
    console.error('Get MOFH packages error:', error);
    res.status(500).json({ error: 'Failed to get MOFH packages' });
  }
});

// Get public MOFH info (for frontend - no auth required)
router.get('/mofh/public', async (req, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'mofh_config' },
    });

    if (!setting) {
      return res.json({ 
        enabled: false,
        cpanelUrl: '',
      });
    }

    const settings = JSON.parse(setting.value) as MOFHConfig;

    // Only return public info (no credentials)
    res.json({
      enabled: settings.enabled,
      cpanelUrl: settings.cpanelUrl || '',
    });
  } catch (error) {
    console.error('Get public MOFH info error:', error);
    res.status(500).json({ error: 'Failed to get MOFH info' });
  }
});

// Get server public IP (admin only)
router.get('/server-ip', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get hostname from request (like PHP's $_SERVER['HTTP_HOST'])
    const hostname = req.get('host')?.split(':')[0] || 'localhost';
    
    // Resolve hostname to IP (like PHP's gethostbyname)
    const { address } = await lookup(hostname);
    
    res.json({ ip: address });
  } catch (error) {
    console.error('Get server IP error:', error);
    res.status(500).json({ error: 'Failed to get server IP', ip: 'Không thể lấy IP' });
  }
});

// ==================== ALLOWED DOMAINS ====================

interface AllowedDomain {
  id: string;
  domain: string;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Get all allowed domains (admin only)
router.get('/domains', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    if (!setting) {
      return res.json({ domains: [] });
    }

    const domains = JSON.parse(setting.value) as AllowedDomain[];
    res.json({ domains });
  } catch (error) {
    console.error('Get allowed domains error:', error);
    res.status(500).json({ error: 'Failed to get allowed domains' });
  }
});

// Get enabled domains (public - for users to select when creating hosting)
router.get('/domains/public', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    if (!setting) {
      return res.json({ domains: [] });
    }

    const allDomains = JSON.parse(setting.value) as AllowedDomain[];
    // Only return enabled domains with minimal info
    const enabledDomains = allDomains
      .filter(d => d.enabled)
      .map(d => ({ id: d.id, domain: d.domain }));
    
    res.json({ domains: enabledDomains });
  } catch (error) {
    console.error('Get public domains error:', error);
    res.status(500).json({ error: 'Failed to get domains' });
  }
});

// Add new domain (admin only)
router.post('/domains', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { domain, description, enabled } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Clean domain (remove protocol, www, trailing slash)
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .trim();

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Get existing domains
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    const domains: AllowedDomain[] = setting ? JSON.parse(setting.value) : [];

    // Check if domain already exists
    if (domains.some(d => d.domain === cleanDomain)) {
      return res.status(400).json({ error: 'Domain already exists' });
    }

    // Add new domain
    const newDomain: AllowedDomain = {
      id: crypto.randomUUID(),
      domain: cleanDomain,
      enabled: enabled ?? true,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    domains.push(newDomain);

    // Save to database
    await prisma.setting.upsert({
      where: { key: 'allowed_domains' },
      update: { value: JSON.stringify(domains) },
      create: { key: 'allowed_domains', value: JSON.stringify(domains) },
    });

    res.json({ message: 'Domain added successfully', domain: newDomain });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Update domain (admin only)
router.put('/domains/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { domain, description, enabled } = req.body;

    // Get existing domains
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domains: AllowedDomain[] = JSON.parse(setting.value);
    const domainIndex = domains.findIndex(d => d.id === id);

    if (domainIndex === -1) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Clean domain if provided
    let cleanDomain = domains[domainIndex].domain;
    if (domain && typeof domain === 'string') {
      cleanDomain = domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .trim();

      // Check if new domain already exists (excluding current)
      if (domains.some((d, i) => i !== domainIndex && d.domain === cleanDomain)) {
        return res.status(400).json({ error: 'Domain already exists' });
      }
    }

    // Update domain
    domains[domainIndex] = {
      ...domains[domainIndex],
      domain: cleanDomain,
      description: description ?? domains[domainIndex].description,
      enabled: enabled ?? domains[domainIndex].enabled,
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    await prisma.setting.update({
      where: { key: 'allowed_domains' },
      data: { value: JSON.stringify(domains) },
    });

    res.json({ message: 'Domain updated successfully', domain: domains[domainIndex] });
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

// Toggle domain status (admin only)
router.patch('/domains/:id/toggle', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // Get existing domains
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domains: AllowedDomain[] = JSON.parse(setting.value);
    const domainIndex = domains.findIndex(d => d.id === id);

    if (domainIndex === -1) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Toggle status
    domains[domainIndex].enabled = enabled ?? !domains[domainIndex].enabled;
    domains[domainIndex].updatedAt = new Date().toISOString();

    // Save to database
    await prisma.setting.update({
      where: { key: 'allowed_domains' },
      data: { value: JSON.stringify(domains) },
    });

    res.json({ message: 'Domain status updated', domain: domains[domainIndex] });
  } catch (error) {
    console.error('Toggle domain error:', error);
    res.status(500).json({ error: 'Failed to toggle domain status' });
  }
});

// Delete domain (admin only)
router.delete('/domains/:id', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing domains
    const setting = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domains: AllowedDomain[] = JSON.parse(setting.value);
    const domainIndex = domains.findIndex(d => d.id === id);

    if (domainIndex === -1) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Remove domain
    domains.splice(domainIndex, 1);

    // Save to database
    await prisma.setting.update({
      where: { key: 'allowed_domains' },
      data: { value: JSON.stringify(domains) },
    });

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// ==================== GENERAL SETTINGS ====================

interface GeneralSettings {
  siteName: string;
  siteSlogan: string;
  siteLogo: string;
  siteFavicon: string;
  emailVerificationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceAllowedIPs: string; // Comma-separated IPs (supports IPv4 and IPv6) that can bypass maintenance
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  imgbbApiKey: string;
  turnstileServices?: {
    emailVerify: boolean;
    createHosting: boolean;
    hostingSettings: boolean;
    createSSL: boolean;
    createTicket: boolean;
    replyTicket: boolean;
  };
}

const defaultGeneralSettings: GeneralSettings = {
  siteName: 'ZNode',
  siteSlogan: 'Free Web Hosting',
  siteLogo: '',
  siteFavicon: '',
  emailVerificationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing maintenance. Please check back soon.',
  maintenanceAllowedIPs: '',
  turnstileEnabled: false,
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  imgbbApiKey: '',
  turnstileServices: {
    emailVerify: true,
    createHosting: false,
    hostingSettings: false,
    createSSL: false,
    createTicket: false,
    replyTicket: false,
  },
};

// Get general settings (admin only)
router.get('/general', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });

    const settings: GeneralSettings = setting?.value 
      ? { ...defaultGeneralSettings, ...JSON.parse(setting.value) }
      : defaultGeneralSettings;

    res.json(settings);
  } catch (error) {
    console.error('Get general settings error:', error);
    res.status(500).json({ error: 'Failed to get general settings' });
  }
});

// Get general settings (public - for frontend display)
router.get('/general/public', async (req, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });

    const settings: GeneralSettings = setting?.value 
      ? { ...defaultGeneralSettings, ...JSON.parse(setting.value) }
      : defaultGeneralSettings;

    // Return only public fields (no secret keys)
    res.json({
      siteName: settings.siteName,
      siteSlogan: settings.siteSlogan,
      siteLogo: settings.siteLogo,
      siteFavicon: settings.siteFavicon,
      emailVerificationEnabled: settings.emailVerificationEnabled,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      turnstileEnabled: settings.turnstileEnabled,
      turnstileSiteKey: settings.turnstileSiteKey, // Public site key only
      imgbbApiKey: settings.imgbbApiKey || '',
      turnstileServices: settings.turnstileServices || {
        emailVerify: true,
        createHosting: false,
        hostingSettings: false,
        createSSL: false,
        createTicket: false,
        replyTicket: false,
      },
    });
  } catch (error) {
    console.error('Get public general settings error:', error);
    res.status(500).json({ error: 'Failed to get general settings' });
  }
});

// Get public stats (user count, etc.) - no auth required
router.get('/public-stats', async (req, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    
    res.json({
      totalUsers,
    });
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Failed to get public stats' });
  }
});

// Update general settings (admin only)
router.put('/general', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body;

    // Get current settings
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });

    const currentSettings: GeneralSettings = currentSetting?.value 
      ? { ...defaultGeneralSettings, ...JSON.parse(currentSetting.value) }
      : defaultGeneralSettings;

    // Handle masked turnstileSecretKey - keep old value if masked
    if (updates.turnstileSecretKey && 
        (updates.turnstileSecretKey.startsWith('***') || 
         updates.turnstileSecretKey.startsWith('••••'))) {
      updates.turnstileSecretKey = currentSettings.turnstileSecretKey;
    }

    // Merge updates
    const newSettings: GeneralSettings = {
      ...currentSettings,
      ...updates,
    };

    // Validate
    if (!newSettings.siteName || newSettings.siteName.trim() === '') {
      return res.status(400).json({ error: 'Site name is required' });
    }

    // Save
    await prisma.setting.upsert({
      where: { key: 'general_settings' },
      update: { value: JSON.stringify(newSettings) },
      create: { key: 'general_settings', value: JSON.stringify(newSettings) },
    });

    res.json({ message: 'General settings updated successfully', settings: newSettings });
  } catch (error) {
    console.error('Update general settings error:', error);
    res.status(500).json({ error: 'Failed to update general settings' });
  }
});

// Upload logo/favicon (admin only)
router.post('/general/upload', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, data } = req.body; // type: 'logo' | 'favicon', data: base64 string

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    if (!['logo', 'favicon'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be logo or favicon' });
    }

    // Validate base64 data (should be data URL)
    if (!data.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Get current settings
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });

    const currentSettings: GeneralSettings = currentSetting?.value 
      ? { ...defaultGeneralSettings, ...JSON.parse(currentSetting.value) }
      : defaultGeneralSettings;

    // Update the specific field
    if (type === 'logo') {
      currentSettings.siteLogo = data;
    } else {
      currentSettings.siteFavicon = data;
    }

    // Save
    await prisma.setting.upsert({
      where: { key: 'general_settings' },
      update: { value: JSON.stringify(currentSettings) },
      create: { key: 'general_settings', value: JSON.stringify(currentSettings) },
    });

    res.json({ 
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`,
      url: data,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ==================== SEO SETTINGS ====================

interface SEOLanguageData {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterSite: string;
  twitterImage: string;
  customHeadTags: string;
}

interface SEOSettings {
  languages: Record<string, SEOLanguageData>;
  robotsTxt: string;
  sitemapEnabled: boolean;
  sitemapCustomUrls: string;
  canonicalUrl: string;
}

const defaultSEOLanguageData: SEOLanguageData = {
  title: '',
  description: '',
  keywords: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterCard: 'summary_large_image',
  twitterSite: '',
  twitterImage: '',
  customHeadTags: '',
};

const defaultRobotsTxt = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: {{SITE_URL}}/sitemap.xml`;

const defaultSEOSettings: SEOSettings = {
  languages: {},
  robotsTxt: defaultRobotsTxt,
  sitemapEnabled: true,
  sitemapCustomUrls: '',
  canonicalUrl: '',
};

// Get SEO settings (admin only)
router.get('/seo', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'seo_settings' },
    });

    const settings: SEOSettings = setting?.value
      ? { ...defaultSEOSettings, ...JSON.parse(setting.value) }
      : defaultSEOSettings;

    res.json({ settings });
  } catch (error) {
    console.error('Get SEO settings error:', error);
    res.status(500).json({ error: 'Failed to get SEO settings' });
  }
});

// Get SEO settings (public - for frontend meta tags)
router.get('/seo/public', async (req, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'seo_settings' },
    });

    if (!setting?.value) {
      return res.json({ languages: {}, canonicalUrl: '' });
    }

    const settings: SEOSettings = JSON.parse(setting.value);

    // Return language-specific SEO data and canonical URL
    res.json({
      languages: settings.languages || {},
      canonicalUrl: settings.canonicalUrl || '',
    });
  } catch (error) {
    console.error('Get public SEO settings error:', error);
    res.status(500).json({ error: 'Failed to get SEO settings' });
  }
});

// Update SEO settings (admin only)
router.put('/seo', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body as Partial<SEOSettings>;

    // Get current settings
    const currentSetting = await prisma.setting.findUnique({
      where: { key: 'seo_settings' },
    });

    const currentSettings: SEOSettings = currentSetting?.value
      ? { ...defaultSEOSettings, ...JSON.parse(currentSetting.value) }
      : defaultSEOSettings;

    // Merge updates
    const newSettings: SEOSettings = {
      ...currentSettings,
      ...updates,
      languages: updates.languages
        ? { ...currentSettings.languages, ...updates.languages }
        : currentSettings.languages,
    };

    // Save
    await prisma.setting.upsert({
      where: { key: 'seo_settings' },
      update: { value: JSON.stringify(newSettings) },
      create: { key: 'seo_settings', value: JSON.stringify(newSettings) },
    });

    // Regenerate static SEO files (robots.txt, sitemap.xml) in dist/
    try {
      const generateFn = (req.app as any).generateStaticSEOFiles;
      if (typeof generateFn === 'function') {
        await generateFn();
      }
    } catch (e) {
      console.warn('Could not regenerate static SEO files:', e);
    }

    res.json({ message: 'SEO settings updated successfully', settings: newSettings });
  } catch (error) {
    console.error('Update SEO settings error:', error);
    res.status(500).json({ error: 'Failed to update SEO settings' });
  }
});

// Get robots.txt content (public)
router.get('/seo/robots', async (req, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'seo_settings' },
    });

    let robotsTxt = defaultRobotsTxt;
    if (setting?.value) {
      const settings: SEOSettings = JSON.parse(setting.value);
      robotsTxt = settings.robotsTxt || defaultRobotsTxt;
    }

    // Get site URL for sitemap link
    const generalSetting = await prisma.setting.findUnique({
      where: { key: 'general_settings' },
    });
    const siteUrl = req.protocol + '://' + req.get('host');
    robotsTxt = robotsTxt.replace(/\{\{SITE_URL\}\}/g, siteUrl);

    res.type('text/plain').send(robotsTxt);
  } catch (error) {
    console.error('Get robots.txt error:', error);
    res.type('text/plain').send('User-agent: *\nAllow: /');
  }
});

// Get sitemap.xml content (public)
router.get('/seo/sitemap', async (req, res: Response) => {
  try {
    const seoSetting = await prisma.setting.findUnique({
      where: { key: 'seo_settings' },
    });

    const seoSettings: SEOSettings = seoSetting?.value
      ? { ...defaultSEOSettings, ...JSON.parse(seoSetting.value) }
      : defaultSEOSettings;

    if (!seoSettings.sitemapEnabled) {
      return res.status(404).send('Sitemap is disabled');
    }

    const siteUrl = seoSettings.canonicalUrl || (req.protocol + '://' + req.get('host'));
    const now = new Date().toISOString().split('T')[0];

    // Get available languages from SEO settings
    const languages = Object.keys(seoSettings.languages);
    const defaultLang = languages.length > 0 ? languages[0] : 'en';

    // Base pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/login', priority: '0.6', changefreq: 'monthly' },
      { loc: '/register', priority: '0.6', changefreq: 'monthly' },
      { loc: '/kb', priority: '0.8', changefreq: 'weekly' },
    ];

    // Custom URLs from settings
    const customUrls: { loc: string; priority: string; changefreq: string }[] = [];
    if (seoSettings.sitemapCustomUrls) {
      const lines = seoSettings.sitemapCustomUrls.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.trim().split('|');
        customUrls.push({
          loc: parts[0]?.trim() || '',
          priority: parts[1]?.trim() || '0.5',
          changefreq: parts[2]?.trim() || 'weekly',
        });
      }
    }

    // Fetch KB categories and articles for dynamic URLs
    let kbUrls: { loc: string; priority: string; changefreq: string }[] = [];
    try {
      const categories = await prisma.kBCategory.findMany({
        where: { isActive: true },
        include: {
          articles: {
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
          },
        },
      });

      for (const cat of categories) {
        kbUrls.push({
          loc: `/kb/${cat.slug}`,
          priority: '0.7',
          changefreq: 'weekly',
        });
        for (const article of cat.articles) {
          kbUrls.push({
            loc: `/kb/${cat.slug}/${article.slug}`,
            priority: '0.6',
            changefreq: 'weekly',
          });
        }
      }
    } catch (e) {
      // KB tables may not exist
    }

    const allPages = [...staticPages, ...kbUrls, ...customUrls].filter(p => p.loc);

    // Build sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    for (const page of allPages) {
      const fullUrl = page.loc.startsWith('http') ? page.loc : `${siteUrl}${page.loc}`;
      xml += `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
`;
      // Add hreflang for each language
      if (languages.length > 1) {
        for (const lang of languages) {
          xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${fullUrl}?lang=${lang}" />\n`;
        }
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${fullUrl}" />\n`;
      }
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.type('application/xml').send(xml);
  } catch (error) {
    console.error('Generate sitemap error:', error);
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
});

// Get single setting by key (admin only)
// IMPORTANT: This catch-all route MUST be at the end, after all specific routes
// Otherwise it matches /general, /mofh, /oauth etc. before their dedicated handlers
router.get('/:key', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = req.params.key as string;
    
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    
    res.json({
      key,
      value: setting?.value ?? null,
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

export default router;
