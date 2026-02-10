import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { sendTemplateEmail } from '../lib/email.js';
import { notifyHostingCreated } from '../lib/notification.js';
import { Resolver } from 'dns/promises';
import { verifyTurnstileForService } from '../lib/turnstile.js';

const router = Router();

// Default BYET nameservers
const DEFAULT_NAMESERVERS = [
  'ns1.byet.org',
  'ns2.byet.org',
  'ns3.byet.org',
  'ns4.byet.org',
  'ns5.byet.org',
];

// MOFH API Configuration
interface MOFHConfig {
  enabled: boolean;
  apiUsername: string;
  apiPassword: string;
  defaultPackage: string;
  cpanelUrl: string;
  customNameservers?: string; // Comma-separated custom nameservers
}

// Get allowed nameservers (custom or default BYET)
async function getAllowedNameservers(): Promise<string[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'mofh_config' },
  });
  
  if (setting) {
    const config = JSON.parse(setting.value);
    if (config.customNameservers && config.customNameservers.trim()) {
      // Parse custom nameservers (comma-separated)
      return config.customNameservers
        .split(',')
        .map((ns: string) => ns.trim().toLowerCase())
        .filter((ns: string) => ns.length > 0);
    }
  }
  
  return DEFAULT_NAMESERVERS;
}

// Check if domain has correct nameservers
async function checkDomainNameservers(domain: string): Promise<{ valid: boolean; currentNS: string[]; requiredNS: string[]; message?: string }> {
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']); // Use public DNS
  
  const requiredNS = await getAllowedNameservers();
  
  // Check if this is a subdomain (more than 2 parts)
  const parts = domain.split('.');
  const isSubdomain = parts.length > 2;
  
  try {
    // First, try to get NS records for the domain directly
    const nsRecords = await resolver.resolveNs(domain);
    const currentNS = nsRecords.map(ns => ns.toLowerCase());
    
    // Check if at least one required nameserver is present
    const hasValidNS = currentNS.some(ns => 
      requiredNS.some(required => ns === required || ns.endsWith('.' + required))
    );
    
    return {
      valid: hasValidNS,
      currentNS,
      requiredNS,
    };
  } catch (error: any) {
    // NS lookup failed - this is common for subdomains due to REFUSED from target NS
    console.log('[NS Check] NS lookup failed for', domain, ':', error.code || error.message);
    
    // For subdomains, try to query parent domain's nameserver for NS delegation
    if (isSubdomain) {
      try {
        // Get parent domain (e.g., dpdns.org from datvu.dpdns.org)
        const parentDomain = parts.slice(-2).join('.');
        
        // First get parent domain's NS
        const parentNS = await resolver.resolveNs(parentDomain);
        console.log('[NS Check] Parent NS for', parentDomain, ':', parentNS);
        
        if (parentNS.length > 0) {
          // Import child_process for dig command
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          // Try each parent NS until one responds
          for (const parentNsHostname of parentNS) {
            try {
              // Resolve parent NS to IP address
              let parentNsIp = '';
              try {
                const ips = await resolver.resolve4(parentNsHostname);
                if (ips.length > 0) {
                  parentNsIp = ips[0];
                }
              } catch {
                console.log('[NS Check] Could not resolve IP for', parentNsHostname);
                continue;
              }
              
              if (!parentNsIp) continue;
              
              console.log('[NS Check] Trying parent NS:', parentNsHostname, '-> IP:', parentNsIp);
              
              // Use dig to query NS with +norecurse from parent nameserver IP
              // Parse AUTHORITY section for NS records
              const { stdout } = await execAsync(
                `dig NS ${domain} @${parentNsIp} +norecurse +time=5 2>/dev/null | grep -E "^${domain.replace(/\./g, '\\.')}.*IN.*NS" | awk '{print $5}'`,
                { timeout: 10000 }
              );
              
              const delegatedNS = stdout.trim().split('\n')
                .filter(ns => ns.length > 0)
                .map(ns => ns.toLowerCase().replace(/\.$/, ''));
              
              console.log('[NS Check] Delegated NS from parent for', domain, ':', delegatedNS);
              
              if (delegatedNS.length > 0) {
                const hasValidNS = delegatedNS.some(ns =>
                  requiredNS.some(required => ns === required || ns.endsWith('.' + required))
                );
                
                return {
                  valid: hasValidNS,
                  currentNS: delegatedNS,
                  requiredNS,
                  message: hasValidNS 
                    ? 'NS delegation found and correctly configured'
                    : 'NS delegation found but not pointing to our servers',
                };
              }
            } catch (digError: any) {
              console.log('[NS Check] dig failed for', parentNsHostname, ':', digError.message);
              // Continue to next parent NS
              continue;
            }
          }
          
          // If dig failed, check if parent NS are valid (subdomain will inherit)
          const parentNSLower = parentNS.map(ns => ns.toLowerCase());
          const parentHasValidNS = parentNSLower.some(ns =>
            requiredNS.some(required => ns === required || ns.endsWith('.' + required))
          );
          
          if (parentHasValidNS) {
            return {
              valid: true,
              currentNS: parentNSLower,
              requiredNS,
              message: 'Parent domain nameservers are correctly configured',
            };
          }
        }
        
        // Parent NS doesn't match required - subdomain needs NS delegation
        return {
          valid: false,
          currentNS: [],
          requiredNS,
          message: `Please delegate NS for ${domain} to our nameservers at your DNS provider`,
        };
      } catch (parentError: any) {
        console.error('[NS Check] Parent NS lookup also failed:', parentError.message);
      }
    }
    
    return {
      valid: false,
      currentNS: [],
      requiredNS,
      message: 'Could not resolve nameservers for this domain',
    };
  }
}

// Get MOFH config from database
async function getMOFHConfig(): Promise<MOFHConfig | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'mofh_config' },
  });
  
  if (!setting) return null;
  
  const config = JSON.parse(setting.value) as MOFHConfig;
  if (!config.enabled || !config.apiUsername || !config.apiPassword) {
    return null;
  }
  
  return config;
}

// Make MOFH JSON API request (for create, suspend, unsuspend, etc.)
async function mofhJsonRequest(endpoint: string, data: Record<string, string>, config: MOFHConfig) {
  const authString = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64');
  
  const params = new URLSearchParams(data);
  const response = await fetch(`https://panel.myownfreehost.net/json-api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  return response;
}

// Make MOFH XML API request (for getuserdomains, etc. - requires api_user & api_key in body)
async function mofhXmlRequest(endpoint: string, data: Record<string, string>, config: MOFHConfig) {
  const authString = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64');
  
  // XML API requires api_user and api_key in body
  const fullData = {
    api_user: config.apiUsername,
    api_key: config.apiPassword,
    ...data,
  };
  
  const params = new URLSearchParams(fullData);
  const response = await fetch(`https://panel.myownfreehost.net/xml-api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  return response;
}

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// File Manager password encoding (XOR + Base64)
const FM_KEY = 'ERFgjowETHGj9wf';

function fmEncodePassword(password: string, key: string = FM_KEY): string {
  let out = '';
  for (let i = 0; i < password.length; i++) {
    out += String.fromCharCode(password.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(out, 'binary').toString('base64');
}

function createFileManagerLink(username: string, password: string, dir: string = '/htdocs/'): string {
  const encodedPassword = fmEncodePassword(password);
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(encodedPassword);
  const home = dir ? '&home=' + encodeURIComponent(dir) : '';
  return `https://filemanager.ai/new3/index.php?u=${u}&p=${p}${home}`;
}

// Check if hosting is fully operational (active AND cpanel approved)
interface HostingOperationalCheck {
  operational: boolean;
  error?: string;
  errorCode?: 'NOT_ACTIVE' | 'CPANEL_NOT_APPROVED' | 'PENDING' | 'SUSPENDED' | 'SUSPENDING' | 'REACTIVATING';
}

function isHostingOperational(hosting: { status: string; cpanelApproved: boolean }): HostingOperationalCheck {
  // Check status first
  if (hosting.status === 'PENDING') {
    return { operational: false, error: 'Hosting account is pending activation', errorCode: 'PENDING' };
  }
  if (hosting.status === 'SUSPENDING') {
    return { operational: false, error: 'Hosting account is being suspended', errorCode: 'SUSPENDING' };
  }
  if (hosting.status === 'SUSPENDED') {
    return { operational: false, error: 'Hosting account is suspended', errorCode: 'SUSPENDED' };
  }
  if (hosting.status === 'REACTIVATING') {
    return { operational: false, error: 'Hosting account is being reactivated', errorCode: 'REACTIVATING' };
  }
  if (hosting.status !== 'ACTIVE') {
    return { operational: false, error: 'Hosting account is not active', errorCode: 'NOT_ACTIVE' };
  }
  
  // Check cpanel approval
  if (!hosting.cpanelApproved) {
    return { operational: false, error: 'You must login to cPanel first before using this feature', errorCode: 'CPANEL_NOT_APPROVED' };
  }
  
  return { operational: true };
}

// ==================== USER ROUTES ====================

// Get user's hosting accounts
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const hostings = await prisma.hosting.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ hostings });
  } catch (error) {
    console.error('Get hostings error:', error);
    res.status(500).json({ error: 'Failed to get hosting accounts' });
  }
});

// Get required nameservers (public endpoint for displaying in UI)
router.get('/nameservers', async (req, res: Response) => {
  try {
    const nameservers = await getAllowedNameservers();
    res.json({ nameservers });
  } catch (error) {
    console.error('Get nameservers error:', error);
    res.json({ nameservers: DEFAULT_NAMESERVERS });
  }
});

// Check nameservers for a custom domain
router.post('/check-nameservers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    // Basic domain validation - allow subdomains (e.g., sub.example.com, deep.sub.example.com)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }
    
    const result = await checkDomainNameservers(domain);
    
    res.json({
      domain,
      valid: result.valid,
      currentNameservers: result.currentNS,
      requiredNameservers: result.requiredNS,
      message: result.message || (result.valid 
        ? 'Nameservers are correctly configured' 
        : 'Nameservers are not pointing to our servers. Please update your domain nameservers.'),
    });
  } catch (error) {
    console.error('Check nameservers error:', error);
    res.status(500).json({ error: 'Failed to check nameservers' });
  }
});

// Check subdomain availability - MUST be before /:username routes
router.post('/check-domain', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subdomain, domain } = req.body;
    
    if (!subdomain || !domain) {
      return res.status(400).json({ error: 'Subdomain and domain are required' });
    }
    
    const fullDomain = `${subdomain}.${domain}`;
    
    // Check if domain exists in our database
    const existingHosting = await prisma.hosting.findFirst({
      where: { 
        domain: fullDomain,
        status: { not: 'DELETED' },
      },
    });
    
    if (existingHosting) {
      return res.json({ 
        available: false, 
        message: 'This subdomain is already taken' 
      });
    }
    
    // Also check with MOFH API (optional - their create API will also check)
    res.json({ 
      available: true, 
      message: 'Subdomain is available',
      domain: fullDomain,
    });
  } catch (error) {
    console.error('Check domain error:', error);
    res.status(500).json({ error: 'Failed to check domain availability' });
  }
});

// Get hosting statistics for user - MUST be before /:username routes
router.get('/stats/summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const [total, active, pending, suspended] = await Promise.all([
      prisma.hosting.count({ where: { userId, status: { not: 'DELETED' } } }),
      prisma.hosting.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.hosting.count({ where: { userId, status: 'PENDING' } }),
      prisma.hosting.count({ where: { userId, status: 'SUSPENDED' } }),
    ]);
    
    res.json({
      total,
      active,
      pending,
      suspended,
      limit: 3,
      canCreate: total < 3,
    });
  } catch (error) {
    console.error('Get hosting stats error:', error);
    res.status(500).json({ error: 'Failed to get hosting statistics' });
  }
});

// Get hosting for cPanel auto-login (public route, no user check, limited data)
// This allows accessing cPanel even before account is activated
router.get('/:username/cpanel-login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { vpUsername },
      select: {
        id: true,
        vpUsername: true,
        password: true,
        domain: true,
        status: true,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Get cPanel URL from settings
    const mofhConfig = await getMOFHConfig();
    const cpanelUrl = mofhConfig?.cpanelUrl || 'https://cpanel.byethost.com';
    
    res.json({ 
      hosting,
      cpanelUrl,
    });
  } catch (error) {
    console.error('Get hosting for cpanel login error:', error);
    res.status(500).json({ error: 'Failed to get hosting account' });
  }
});

// Mark hosting as cPanel approved (user confirms they logged into cPanel)
// This unlocks SSL and other features that require cPanel to be accessed first
router.post('/:username/mark-approved', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    if (hosting.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Hosting account must be active before approval' });
    }
    
    // Already approved
    if (hosting.cpanelApproved) {
      return res.json({ 
        success: true, 
        message: 'Hosting already approved',
        hosting,
      });
    }
    
    // Mark as approved
    const updatedHosting = await prisma.hosting.update({
      where: { id: hosting.id },
      data: {
        cpanelApproved: true,
        cpanelApprovedAt: new Date(),
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Hosting approved successfully',
      hosting: updatedHosting,
    });
  } catch (error) {
    console.error('Mark hosting approved error:', error);
    res.status(500).json({ error: 'Failed to mark hosting as approved' });
  }
});

// Get single hosting account by vpUsername
router.get('/:username', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Get cPanel URL from settings
    const mofhConfig = await getMOFHConfig();
    const cpanelUrl = mofhConfig?.cpanelUrl || 'https://cpanel.byethost.com';
    
    // Get first allowed domain for SQL server display (custom domains)
    let firstAllowedDomain = '';
    const domainsSettings = await prisma.setting.findUnique({
      where: { key: 'allowed_domains' },
    });
    if (domainsSettings) {
      const allowedDomains = JSON.parse(domainsSettings.value) as Array<{ domain: string; enabled: boolean }>;
      const enabledDomain = allowedDomains.find(d => d.enabled);
      firstAllowedDomain = enabledDomain?.domain || '';
    }
    
    res.json({ 
      hosting,
      cpanelUrl,
      firstAllowedDomain,
    });
  } catch (error) {
    console.error('Get hosting error:', error);
    res.status(500).json({ error: 'Failed to get hosting account' });
  }
});

// Get File Manager link
router.get('/:username/filemanager', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const dir = (req.query.dir as string) || '/htdocs/';
    
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Check if hosting is operational
    const opCheck = isHostingOperational(hosting);
    if (!opCheck.operational) {
      return res.status(400).json({ error: opCheck.error, errorCode: opCheck.errorCode });
    }
    
    // Create File Manager link using vpUsername and password
    const link = createFileManagerLink(hosting.vpUsername, hosting.password, dir);
    
    res.json({ link });
  } catch (error) {
    console.error('Get file manager link error:', error);
    res.status(500).json({ error: 'Failed to get file manager link' });
  }
});

// Create new hosting account
router.post('/create', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { subdomain, domain, label, isCustomDomain, customDomain, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('createHosting', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    // For custom domain mode, use customDomain field
    const targetDomain = isCustomDomain ? customDomain : domain;
    
    if (!targetDomain && !isCustomDomain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    if (isCustomDomain && !customDomain) {
      return res.status(400).json({ error: 'Custom domain is required' });
    }
    
    let fullDomain: string;
    let accountUsername: string;
    
    if (isCustomDomain) {
      // Custom domain mode - use the customDomain directly
      fullDomain = customDomain.toLowerCase().trim();
      
      // Validate custom domain format - allow subdomains (e.g., sub.example.com)
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(fullDomain)) {
        return res.status(400).json({ error: 'Invalid domain format' });
      }
      
      // Check nameservers before allowing registration
      const nsCheck = await checkDomainNameservers(fullDomain);
      if (!nsCheck.valid) {
        return res.status(400).json({ 
          error: 'Domain nameservers are not configured correctly',
          currentNameservers: nsCheck.currentNS,
          requiredNameservers: nsCheck.requiredNS,
        });
      }
      
      // Generate a username from domain (max 8 chars total for MOFH)
      // Take first 4 chars of domain + 4 random chars = 8 chars
      accountUsername = fullDomain.replace(/\./g, '').substring(0, 4).toLowerCase();
      accountUsername += Math.random().toString(36).substring(2, 6);
      
    } else {
      // Subdomain mode
      if (!subdomain) {
        return res.status(400).json({ error: 'Subdomain is required' });
      }
      
      // Validate subdomain format (3-8 characters, lowercase letters and numbers only)
      const subdomainRegex = /^[a-z0-9]{3,8}$/;
      if (!subdomainRegex.test(subdomain)) {
        return res.status(400).json({ 
          error: 'Invalid subdomain format. Use only lowercase letters and numbers (3-8 characters)' 
        });
      }
      
      fullDomain = `${subdomain}.${domain}`;
      accountUsername = subdomain;
      
      // Check if domain is in allowed list (only for subdomain mode)
      const domainsSettings = await prisma.setting.findUnique({
        where: { key: 'allowed_domains' },
      });
      
      if (domainsSettings) {
        const allowedDomains = JSON.parse(domainsSettings.value) as Array<{ domain: string; enabled: boolean }>;
        const isAllowed = allowedDomains.some(d => d.domain === domain && d.enabled);
        
        if (!isAllowed) {
          return res.status(400).json({ error: 'This domain is not allowed' });
        }
      }
    }
    
    // Check user's hosting limit (max 3 active accounts)
    const activeHostings = await prisma.hosting.count({
      where: { 
        userId,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });
    
    if (activeHostings >= 3) {
      return res.status(400).json({ 
        error: 'You have reached the maximum limit of 3 hosting accounts' 
      });
    }
    
    // Get MOFH config
    const mofhConfig = await getMOFHConfig();
    if (!mofhConfig) {
      return res.status(500).json({ error: 'Hosting service is not configured' });
    }
    
    // Check if domain already exists
    const existingHosting = await prisma.hosting.findFirst({
      where: { 
        domain: fullDomain,
        status: { not: 'DELETED' },
      },
    });
    
    if (existingHosting) {
      return res.status(400).json({ error: 'This domain is already registered' });
    }
    
    // Generate random password for the hosting account
    const hostingPassword = generatePassword(12);
    
    // Create account via MOFH JSON API
    const mofhResp = await mofhJsonRequest('createacct.php', {
      username: accountUsername,
      password: hostingPassword,
      contactemail: userEmail,
      domain: fullDomain,
      plan: mofhConfig.defaultPackage,
    }, mofhConfig);
    
    const mofhText = await mofhResp.text();
    console.log('[MOFH Create Account] Raw:', mofhText);
    
    let mofhResponse: {
      result?: Array<{
        status: number;
        statusmsg: string;
        options?: {
          vpusername: string;
          package: string;
        };
      }>;
    };
    
    try {
      mofhResponse = JSON.parse(mofhText);
    } catch (e) {
      console.error('[MOFH] Failed to parse response:', mofhText);
      return res.status(500).json({ error: 'Invalid response from hosting service' });
    }
    
    console.log('[MOFH Create Account]', JSON.stringify(mofhResponse, null, 2));
    
    // Check response
    const result = mofhResponse.result?.[0];
    
    if (!result || result.status !== 1) {
      const errorMsg = result?.statusmsg || 'Failed to create account';
      return res.status(400).json({ error: errorMsg });
    }
    
    const vpUsername = result.options?.vpusername;
    
    if (!vpUsername) {
      return res.status(500).json({ error: 'Failed to get account username from MOFH' });
    }
    
    // Save to database
    const hosting = await prisma.hosting.create({
      data: {
        userId,
        vpUsername,
        username: accountUsername,
        password: hostingPassword, // Store password for user to view later
        domain: fullDomain,
        package: mofhConfig.defaultPackage,
        status: 'PENDING', // Will be updated by callback
        label: label || null,
        isCustomDomain: isCustomDomain || false,
      },
    });
    
    // Send hosting created email
    try {
      const userForEmail = await prisma.user.findUnique({ where: { id: userId } });
      if (userForEmail?.email) {
        await sendTemplateEmail('HOSTING_CREATED', userForEmail.email, {
          name: userForEmail.name || userForEmail.email.split('@')[0],
          domain: fullDomain,
          username: vpUsername,
          password: hostingPassword,
        }, userForEmail.id);
      }
    } catch (e) { console.error('[Hosting] Failed to send created email:', e); }
    
    // Create notification for hosting created
    notifyHostingCreated(userId, fullDomain, vpUsername).catch(console.error);
    
    res.json({ 
      success: true,
      message: 'Hosting account created successfully! It will be activated within a few minutes.',
      hosting: {
        id: hosting.id,
        domain: hosting.domain,
        username: vpUsername,
        password: hostingPassword, // Only return password once
        status: hosting.status,
      },
    });
  } catch (error) {
    console.error('Create hosting error:', error);
    res.status(500).json({ error: 'Failed to create hosting account' });
  }
});

// Update hosting label
router.patch('/:username/label', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { label, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('hostingSettings', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    // Find hosting account
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Update label
    const updated = await prisma.hosting.update({
      where: { id: hosting.id },
      data: { label: label || null },
    });
    
    res.json({ 
      success: true, 
      message: 'Label updated successfully',
      hosting: updated,
    });
  } catch (error) {
    console.error('Update hosting label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// Change hosting account password
router.post('/:username/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { newPassword, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('hostingSettings', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    // Validate password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    if (newPassword.length > 20) {
      return res.status(400).json({ error: 'Password must not exceed 20 characters' });
    }
    
    // Password should contain only alphanumeric characters (like generatePassword)
    // MOFH does not support special characters in passwords
    const passwordRegex = /^[a-zA-Z0-9]+$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: 'Password can only contain letters and numbers (no special characters)' });
    }
    
    // Find hosting account
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Only allow password change for ACTIVE accounts
    if (hosting.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Password can only be changed for active accounts' });
    }
    
    // Get MOFH config
    const mofhConfig = await getMOFHConfig();
    if (!mofhConfig) {
      return res.status(500).json({ error: 'Hosting service is not configured' });
    }
    
    // Call MOFH API to change password
    // API uses the 8-char username (not vpUsername), but MOFH JSON API accepts vpUsername too
    const mofhResp = await mofhJsonRequest('passwd.php', {
      user: hosting.username, // The 8-char custom username
      pass: newPassword,
    }, mofhConfig);
    
    const mofhText = await mofhResp.text();
    console.log('[MOFH Change Password] Raw:', mofhText);
    
    let mofhResponse: {
      passwd?: Array<{
        status: number;
        statusmsg: string;
      }>;
    };
    
    try {
      mofhResponse = JSON.parse(mofhText);
    } catch (e) {
      console.error('[MOFH] Failed to parse password response:', mofhText);
      return res.status(500).json({ error: 'Invalid response from hosting service' });
    }
    
    const result = mofhResponse.passwd?.[0];
    
    if (!result || result.status !== 1) {
      const errorMsg = result?.statusmsg || 'Failed to change password';
      return res.status(400).json({ error: errorMsg });
    }
    
    // Update password in our database
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: { password: newPassword },
    });
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change hosting password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Helper function to check if text is English only
function isEnglishOnly(text: string): boolean {
  // Allow letters, numbers, spaces, and basic punctuation
  return /^[a-zA-Z0-9\s.,!?'"\-_():;@#$%&*+=\/\\]+$/.test(text);
}

// Deactivate (suspend) hosting account
router.post('/:username/deactivate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  console.log('[DEACTIVATE] Request received for:', req.params.username);
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    const { reason, turnstileToken } = req.body;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('hostingSettings', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    // Validate reason is provided and in English
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Deactivate reason is required' });
    }
    
    if (!isEnglishOnly(reason)) {
      return res.status(400).json({ error: 'Deactivate reason must be in English only' });
    }
    
    console.log('[DEACTIVATE] User:', userId, 'vpUsername:', vpUsername, 'reason:', reason);
    
    // Find hosting account
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    console.log('[DEACTIVATE] Found hosting:', hosting?.id, 'username:', hosting?.username, 'status:', hosting?.status);
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    if (hosting.status === 'SUSPENDED' || hosting.status === 'SUSPENDING') {
      return res.status(400).json({ error: 'This account is already suspended or being suspended' });
    }
    
    if (hosting.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Only active accounts can be deactivated' });
    }
    
    // Check deactivation rate limit: max 2 times per day (12 hours apart)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const recentDeactivations = await prisma.hosting.count({
      where: {
        userId,
        suspendedAt: { gte: twelveHoursAgo },
      },
    });
    
    if (recentDeactivations >= 2) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. You can only deactivate hosting accounts 2 times per day (12 hours apart).',
        nextAvailable: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
    }
    
    // Get MOFH config
    const mofhConfig = await getMOFHConfig();
    if (!mofhConfig) {
      console.log('[DEACTIVATE] MOFH config not found');
      return res.status(500).json({ error: 'MOFH is not configured' });
    }
    
    console.log('[DEACTIVATE] Calling MOFH suspend API for username:', hosting.username);
    
    // Call MOFH JSON API to suspend account
    // Note: MOFH API requires the 8-character username, not the full vpUsername
    const mofhResp = await mofhJsonRequest('suspendacct.php', {
      user: hosting.username, // Use the 8-char username, not vpUsername
      reason: reason || 'User requested deactivation',
    }, mofhConfig);
    
    const mofhData = await mofhResp.json();
    console.log('[MOFH Suspend]', hosting.username, 'Response:', JSON.stringify(mofhData));
    
    // Check MOFH response status
    const status = mofhData?.result?.[0]?.status;
    const statusMsg = mofhData?.result?.[0]?.statusmsg || '';
    
    if (status !== 1) {
      return res.status(400).json({ 
        error: 'MOFH failed to suspend account', 
        details: statusMsg 
      });
    }
    
    // Update local database - set to SUSPENDING (will be fully suspended in ~2 minutes)
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: { 
        status: 'SUSPENDING',
        suspendReason: reason || 'User requested deactivation',
        suspendedAt: new Date(),
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Hosting account is being suspended. It will be fully suspended in about 2 minutes.',
      status: 'SUSPENDING',
    });
  } catch (error) {
    console.error('Deactivate hosting error:', error);
    res.status(500).json({ error: 'Failed to deactivate hosting account' });
  }
});

// Reactivate (unsuspend) hosting account
router.post('/:username/reactivate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    // Find hosting account
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    if (hosting.status === 'REACTIVATING') {
      return res.status(400).json({ error: 'This account is already being reactivated' });
    }
    
    if (hosting.status !== 'SUSPENDED') {
      return res.status(400).json({ error: 'Only suspended accounts can be reactivated' });
    }
    
    // Check if suspended by admin - user cannot self-reactivate
    if (hosting.suspendReason?.startsWith('[BY ADMIN]')) {
      return res.status(403).json({ 
        error: 'This account was suspended by an administrator. Please contact support for assistance.' 
      });
    }
    
    // Get MOFH config
    const mofhConfig = await getMOFHConfig();
    if (!mofhConfig) {
      return res.status(500).json({ error: 'MOFH is not configured' });
    }
    
    // Call MOFH JSON API to unsuspend account
    // Note: MOFH API requires the 8-character username, not the full vpUsername
    const mofhResp = await mofhJsonRequest('unsuspendacct.php', {
      user: hosting.username, // Use the 8-char username, not vpUsername
    }, mofhConfig);
    
    const mofhData = await mofhResp.json();
    console.log('[MOFH Unsuspend]', hosting.username, 'Response:', JSON.stringify(mofhData));
    
    // Check MOFH response status
    const status = mofhData?.result?.[0]?.status;
    const statusMsg = mofhData?.result?.[0]?.statusmsg || '';
    
    if (status !== 1) {
      return res.status(400).json({ 
        error: 'MOFH failed to unsuspend account', 
        details: statusMsg 
      });
    }
    
    // Update local database - set to REACTIVATING (will be fully active soon)
    await prisma.hosting.update({
      where: { id: hosting.id },
      data: { 
        status: 'REACTIVATING',
      },
    });
    
    res.json({ 
      success: true, 
      message: 'Hosting account is being reactivated. It will be fully active soon.',
      status: 'REACTIVATING',
    });
  } catch (error) {
    console.error('Reactivate hosting error:', error);
    res.status(500).json({ error: 'Failed to reactivate hosting account' });
  }
});

// Sync hosting status from MOFH API
router.post('/:username/sync', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const vpUsername = req.params.username as string;
    
    // Find hosting account
    const hosting = await prisma.hosting.findFirst({
      where: { 
        vpUsername,
        userId,
      },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting account not found' });
    }
    
    // Get MOFH config
    const mofhConfig = await getMOFHConfig();
    if (!mofhConfig) {
      return res.status(500).json({ error: 'MOFH is not configured' });
    }
    
    // Query MOFH XML API for account status using getuserdomains endpoint
    const mofhResp = await mofhXmlRequest('getuserdomains.php', {
      username: vpUsername,
    }, mofhConfig);
    
    const mofhText = await mofhResp.text();
    console.log('[MOFH Sync]', vpUsername, 'Raw:', mofhText);
    
    // Response format: [["ACTIVE","domain.com"]] or null
    let domains: Array<[string, string]> | null = null;
    try {
      domains = JSON.parse(mofhText);
    } catch (e) {
      console.error('[MOFH Sync] Parse error:', e);
    }
    
    if (domains && Array.isArray(domains) && domains.length > 0) {
      const [status, domain] = domains[0];
      
      // Handle PENDING -> ACTIVE transition
      if (status === 'ACTIVE' && hosting.status === 'PENDING') {
        // Account is active on MOFH, update local database
        await prisma.hosting.update({
          where: { id: hosting.id },
          data: { 
            status: 'ACTIVE',
            activatedAt: new Date(),
          },
        });
        
        return res.json({ 
          success: true, 
          message: 'Account synced and activated',
          status: 'ACTIVE',
          domains,
        });
      }
      
      // Handle SUSPENDING -> SUSPENDED transition (account shows x status on MOFH)
      if (status === 'x' && hosting.status === 'SUSPENDING') {
        await prisma.hosting.update({
          where: { id: hosting.id },
          data: { 
            status: 'SUSPENDED',
          },
        });
        
        return res.json({ 
          success: true, 
          message: 'Account fully suspended',
          status: 'SUSPENDED',
          domains,
        });
      }
      
      // Handle REACTIVATING -> ACTIVE transition
      if (status === 'ACTIVE' && hosting.status === 'REACTIVATING') {
        await prisma.hosting.update({
          where: { id: hosting.id },
          data: { 
            status: 'ACTIVE',
            suspendReason: null,
            suspendedAt: null,
          },
        });
        
        return res.json({ 
          success: true, 
          message: 'Account fully reactivated',
          status: 'ACTIVE',
          domains,
        });
      }
      
      return res.json({ 
        success: true, 
        message: 'Account status unchanged',
        status: hosting.status,
        mofhStatus: status,
        domains,
      });
    }
    
    // Account not found on MOFH
    res.json({ 
      success: false, 
      message: 'Account not found on MOFH',
      status: hosting.status,
      raw: mofhText,
    });
  } catch (error) {
    console.error('Sync hosting error:', error);
    res.status(500).json({ error: 'Failed to sync hosting status' });
  }
});

export default router;
