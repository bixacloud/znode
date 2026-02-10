import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { 
  getSSLConfig, 
  setSSLConfig, 
  getAllSSLConfigs,
  generateVerificationToken,
  isSubdomainOfService,
  getServiceDomainFor,
  extractSubdomainPrefix,
  createCloudflareDNSRecord,
  deleteCloudflareDNSRecord,
  verifyDNSTxtRecord,
  verifyDNSCnameRecord,
  testCloudflareConnection,
  issueCertificate,
} from '../lib/ssl.js';
import { testGoogleServiceAccount } from '../lib/google-eab.js';
import { createNotification } from '../lib/notification.js';
import { VistapanelApi } from '../lib/vistapanel.js';
import { verifyTurnstileForService } from '../lib/turnstile.js';

// Store logs in memory for real-time viewing
const issueLogs: Map<string, string[]> = new Map();

const router = Router();

// Helper to get MOFH config
async function getMOFHConfig() {
  const setting = await prisma.setting.findUnique({
    where: { key: 'mofh_config' },
  });
  if (!setting) return null;
  return JSON.parse(setting.value);
}

// Helper to get VistapanelApi instance
async function getVistapanelInstance(vpUsername: string, password: string): Promise<VistapanelApi> {
  const mofhConfig = await getMOFHConfig();
  const cpanelUrl = mofhConfig?.cpanelUrl || 'https://cpanel.byethost.com';
  
  const vp = new VistapanelApi();
  vp.setCpanelUrl(cpanelUrl);
  await vp.login(vpUsername, password);
  
  return vp;
}

// Helper to create CNAME record via VistaPanel
async function createVistapalCNAME(hosting: { vpUsername: string; password: string }, source: string, domain: string, destination: string): Promise<void> {
  console.log(`[SSL CNAME] Checking CNAME: ${source}.${domain}`);
  const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
  try {
    // Check if CNAME already exists
    const exists = await vp.hasCNAMErecord(source, domain);
    if (exists) {
      console.log(`[SSL CNAME] CNAME already exists, skipping creation`);
      return;
    }
    
    console.log(`[SSL CNAME] Creating CNAME: ${source}.${domain} -> ${destination}`);
    await vp.createCNAMErecord(source, domain, destination);
    console.log(`[SSL CNAME] CNAME created successfully`);
  } catch (error) {
    console.error(`[SSL CNAME] Failed to create CNAME:`, error);
    throw error;
  } finally {
    await vp.logout();
  }
}

// Helper to delete CNAME record via VistaPanel
async function deleteVistapanelCNAME(hosting: { vpUsername: string; password: string }, source: string): Promise<void> {
  const vp = await getVistapanelInstance(hosting.vpUsername, hosting.password);
  try {
    await vp.deleteCNAMErecord(source);
  } finally {
    await vp.logout();
  }
}

// ==================== USER ROUTES ====================

// Get all SSL certificates for current user
router.get('/certificates', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all hostings for user
    const hostings = await prisma.hosting.findMany({
      where: { userId },
      select: { id: true },
    });
    
    const hostingIds = hostings.map(h => h.id);
    
    const certificates = await prisma.sSLCertificate.findMany({
      where: { hostingId: { in: hostingIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        hosting: {
          select: { domain: true, vpUsername: true },
        },
      },
    });
    
    // Return safe data
    const safeCertificates = certificates.map(cert => ({
      id: cert.id,
      domain: cert.domain,
      status: cert.status,
      provider: cert.provider,
      domainType: cert.domainType,
      expiresAt: cert.expiresAt,
      issuedAt: cert.issuedAt,
      createdAt: cert.createdAt,
      hosting: cert.hosting,
    }));
    
    res.json({ certificates: safeCertificates });
  } catch (error) {
    console.error('Get user SSL certificates error:', error);
    res.status(500).json({ error: 'Failed to get SSL certificates' });
  }
});

// Get SSL certificates for a hosting
router.get('/hosting/:hostingId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hostingId = req.params.hostingId as string;
    const userId = req.user!.id;
    
    // Verify ownership
    const hosting = await prisma.hosting.findFirst({
      where: { id: hostingId, userId },
    });
    
    if (!hosting) {
      return res.status(404).json({ error: 'Hosting not found' });
    }
    
    const certificates = await prisma.sSLCertificate.findMany({
      where: { hostingId },
      orderBy: { createdAt: 'desc' },
    });
    
    // Hide private keys in response
    const safeCertificates = certificates.map(cert => ({
      ...cert,
      privateKey: cert.privateKey ? '***HIDDEN***' : null,
    }));
    
    res.json(safeCertificates);
  } catch (error) {
    console.error('Get SSL certificates error:', error);
    res.status(500).json({ error: 'Failed to get SSL certificates' });
  }
});

// Get single SSL certificate details (for viewing)
router.get('/certificate/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: {
          select: { 
            id: true,
            userId: true,
            username: true,
            domain: true,
          },
        },
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Return certificate info (hide sensitive data if not issued)
    res.json({
      id: certificate.id,
      domain: certificate.domain,
      domainType: certificate.domainType,
      provider: certificate.provider,
      status: certificate.status,
      txtRecord: certificate.txtRecord,
      cnameRecord: certificate.cnameRecord,
      verifiedAt: certificate.verifiedAt,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      lastError: certificate.lastError,
      createdAt: certificate.createdAt,
      hostingId: certificate.hostingId,
      hosting: certificate.hosting,
      // Only include cert data if issued
      certificate: certificate.status === 'ISSUED' ? certificate.certificate : null,
      privateKey: certificate.status === 'ISSUED' ? '***HIDDEN***' : null,
      caCertificate: certificate.status === 'ISSUED' ? certificate.caCertificate : null,
    });
  } catch (error) {
    console.error('Get SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to get SSL certificate' });
  }
});

// Download SSL certificate (only for issued certificates)
router.get('/certificate/:id/download', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: {
          select: { userId: true },
        },
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Only return full certificate if issued
    if (certificate.status !== 'ISSUED') {
      return res.status(400).json({ error: 'Certificate not yet issued' });
    }
    
    res.json({
      id: certificate.id,
      domain: certificate.domain,
      certificate: certificate.certificate,
      privateKey: certificate.privateKey,
      caCertificate: certificate.caCertificate,
      expiresAt: certificate.expiresAt,
      issuedAt: certificate.issuedAt,
      provider: certificate.provider,
    });
  } catch (error) {
    console.error('Download SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to download SSL certificate' });
  }
});

// Request new SSL certificate
router.post('/request', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { domain, provider = 'LETS_ENCRYPT', turnstileToken } = req.body;
    const userId = req.user!.id;
    
    // Verify Turnstile if required
    const turnstileResult = await verifyTurnstileForService('createSSL', turnstileToken);
    if (!turnstileResult.valid) {
      return res.status(400).json({ error: turnstileResult.error });
    }
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    // Validate provider
    if (!['LETS_ENCRYPT', 'GOOGLE_TRUST'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    // Check if this is a subdomain of our service
    const isSubdomain = await isSubdomainOfService(domain);
    const serviceDomain = isSubdomain ? await getServiceDomainFor(domain) : null;
    
    let hosting = null;
    let domainType: 'SUBDOMAIN' | 'CUSTOM' = 'CUSTOM';
    
    if (isSubdomain && serviceDomain) {
      // This is a subdomain of our service - need to find or require hosting
      domainType = 'SUBDOMAIN';
      
      // Extract subdomain prefix to find matching hosting
      const subdomainPrefix = extractSubdomainPrefix(domain, serviceDomain);
      
      // IMPORTANT: For subdomains, we need to find the hosting that OWNS this domain
      // The domain should match exactly: subdomain.serviceDomain === hosting.domain
      // e.g., if SSL is for demo78.zarix.app, we need hosting with domain = demo78.zarix.app
      
      // First, try exact match - this is the most accurate
      hosting = await prisma.hosting.findFirst({
        where: { 
          userId,
          domain: domain, // Exact match: demo78.zarix.app
        },
      });
      
      // If no exact match, check if the subdomain prefix matches a hosting username
      // e.g., SSL for demo78.zarix.app should match hosting with vpUsername containing 'demo78'
      if (!hosting && subdomainPrefix) {
        // Find hosting where the domain starts with the subdomain prefix
        hosting = await prisma.hosting.findFirst({
          where: {
            userId,
            domain: {
              startsWith: `${subdomainPrefix}.`,
            },
          },
        });
      }
      
      // Also check by vpUsername as fallback
      if (!hosting && subdomainPrefix) {
        hosting = await prisma.hosting.findFirst({
          where: {
            userId,
            vpUsername: {
              contains: subdomainPrefix,
            },
          },
        });
      }
      
      if (!hosting) {
        // Check user's hosting limit from settings or use default
        const maxHostingsSetting = await prisma.setting.findUnique({
          where: { key: 'max_hostings_per_user' },
        });
        const maxHostings = maxHostingsSetting ? parseInt(maxHostingsSetting.value) : 3;
        
        const currentHostings = await prisma.hosting.count({
          where: { 
            userId, 
            status: { not: 'DELETED' },
          },
        });
        
        if (currentHostings >= maxHostings) {
          return res.status(400).json({ 
            error: 'NO_SLOT_AVAILABLE',
            message: 'You have reached your hosting account limit. Please upgrade your plan or delete an existing hosting account.',
            maxHostings,
            currentHostings,
          });
        }
        
        return res.status(400).json({ 
          error: 'HOSTING_REQUIRED',
          message: `This domain requires a hosting account. Please create a hosting account first.`,
          domain,
          serviceDomain,
          slotsAvailable: maxHostings - currentHostings,
        });
      }
      
      // Check hosting status
      if (hosting.status !== 'ACTIVE') {
        return res.status(400).json({ 
          error: 'HOSTING_NOT_ACTIVE',
          message: 'Your hosting account is not active. Please wait for activation or contact support.',
          hostingStatus: hosting.status,
        });
      }
      
      // Check if user has approved via cPanel login
      if (!hosting.cpanelApproved) {
        return res.status(400).json({ 
          error: 'CPANEL_APPROVAL_REQUIRED',
          message: 'You must login to cPanel and complete initial approval before requesting SSL certificates.',
          hostingUsername: hosting.vpUsername,
        });
      }
    } else {
      // Custom domain - first check if this domain has its own hosting account (custom domain hosting)
      hosting = await prisma.hosting.findFirst({
        where: { 
          userId,
          domain: domain, // Exact match with SSL domain
          isCustomDomain: true,
          status: 'ACTIVE',
        },
      });
      
      if (hosting) {
        // This custom domain has its own hosting, can use auto SSL via VistaPanel
        domainType = 'CUSTOM'; // Keep as CUSTOM but mark for auto handling
      } else {
        // Find any active hosting to associate with
        hosting = await prisma.hosting.findFirst({
          where: { 
            userId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        });
      }
      
      if (!hosting) {
        return res.status(400).json({ 
          error: 'NO_ACTIVE_HOSTING',
          message: 'You need at least one active hosting account to request SSL for a custom domain.',
        });
      }
      
      // Check if the hosting is approved
      if (!hosting.cpanelApproved) {
        return res.status(400).json({ 
          error: 'CPANEL_APPROVAL_REQUIRED',
          message: 'You must login to cPanel and complete initial approval before requesting SSL certificates.',
          hostingUsername: hosting.vpUsername,
        });
      }
    }
    
    // Check if certificate already exists for this domain
    const existingCert = await prisma.sSLCertificate.findFirst({
      where: { 
        domain,
        status: { notIn: ['FAILED', 'EXPIRED', 'REVOKED'] },
      },
    });
    
    if (existingCert) {
      return res.status(400).json({ error: 'Certificate already exists for this domain' });
    }
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    
    // Get intermediate domain for CNAME delegation
    const intermediateDomain = await getSSLConfig('INTERMEDIATE_DOMAIN');
    
    let txtRecord = null;
    let cnameRecord = null;
    let dnsRecordId = null;
    let autoVerified = false;
    
    // Check if this is a custom domain with its own hosting (can auto-verify via VistaPanel)
    const isCustomDomainHosting = domainType === 'CUSTOM' && hosting.isCustomDomain && hosting.domain === domain;
    
    if (domainType === 'SUBDOMAIN' || isCustomDomainHosting) {
      // For subdomains of our service domains OR custom domains with their own hosting:
      // 1. Create TXT record on intermediate domain (Cloudflare): _acme-challenge.{prefix}.proxydomain.com
      // 2. Create CNAME on hosting domain (VistaPanel): _acme-challenge -> _acme-challenge.{prefix}.proxydomain.com
      
      if (!intermediateDomain) {
        return res.status(500).json({ 
          error: 'SSL not configured properly',
          message: 'Intermediate domain is not configured. Please contact admin.',
        });
      }
      
      // For subdomains: extract prefix from service domain
      // For custom domain hosting: use hosting username as prefix (unique identifier)
      let recordPrefix: string;
      if (domainType === 'SUBDOMAIN' && serviceDomain) {
        recordPrefix = extractSubdomainPrefix(domain, serviceDomain);
      } else {
        // For custom domain hosting, use the 8-char username as unique prefix
        recordPrefix = hosting.username;
      }
      
      // TXT record name on intermediate domain
      const txtRecordName = `_acme-challenge.${recordPrefix}.${intermediateDomain}`;
      // CNAME target
      cnameRecord = txtRecordName;
      txtRecord = verificationToken;
      
      try {
        // Step 1: Create TXT record on intermediate domain (Cloudflare)
        // _acme-challenge.{prefix}.proxydomain.com = verificationToken
        dnsRecordId = await createCloudflareDNSRecord(
          'TXT',
          `_acme-challenge.${recordPrefix}.${intermediateDomain}`,
          verificationToken,
          false
        );
        
        // Step 2: Create CNAME record on hosting domain (VistaPanel)
        // _acme-challenge -> _acme-challenge.{prefix}.proxydomain.com
        await createVistapalCNAME(
          hosting,
          '_acme-challenge', // source (will become _acme-challenge.{domain})
          hosting.domain,   // domain 
          txtRecordName     // destination (_acme-challenge.{prefix}.proxydomain.com)
        );
        
        autoVerified = true;
        console.log(`[SSL] Auto-verified DNS for ${domain} (${isCustomDomainHosting ? 'custom domain hosting' : 'subdomain'})`);
      } catch (error: any) {
        console.error('Failed to create DNS records:', error);
        
        // Cleanup: if TXT was created but CNAME failed, delete the TXT
        if (dnsRecordId) {
          try {
            await deleteCloudflareDNSRecord(dnsRecordId);
          } catch (cleanupError) {
            console.error('Failed to cleanup TXT record:', cleanupError);
          }
        }
        
        return res.status(500).json({ 
          error: 'Failed to create DNS records',
          message: error.message || 'Could not automatically create DNS verification records. Please contact support.',
        });
      }
    } else {
      // For custom domains, user adds TXT record directly
      txtRecord = verificationToken;
    }
    
    // Create certificate record
    const certificate = await prisma.sSLCertificate.create({
      data: {
        hostingId: hosting.id,
        domain,
        domainType,
        provider,
        status: autoVerified ? 'VERIFYING' : 'PENDING_VERIFICATION',
        verificationToken,
        txtRecord,
        cnameRecord,
        dnsRecordId,
      },
    });
    
    // For subdomain or custom domain hosting with auto-verified DNS, automatically start the full SSL flow in background
    if (autoVerified) {
      // Run full issuance flow async
      (async () => {
        try {
          console.log(`[SSL Auto] Starting auto-issue for ${certificate.id} (${domain})`);
          
          // Wait for DNS propagation (30 seconds)
          console.log(`[SSL Auto] Waiting 30s for DNS propagation...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          // Verify DNS
          const verified = await verifyDNSTxtRecord(domain, txtRecord!, cnameRecord || undefined);
          
          if (verified) {
            console.log(`[SSL Auto] DNS verified for ${certificate.id}`);
            await prisma.sSLCertificate.update({
              where: { id: certificate.id },
              data: { status: 'VERIFIED', verifiedAt: new Date() },
            });
            
            // Issue certificate
            console.log(`[SSL Auto] Starting certificate issuance for ${certificate.id}`);
            const result = await issueCertificate(certificate.id);
            
            if (result.success) {
              console.log(`[SSL Auto] Certificate issued successfully for ${certificate.id}`);
            } else {
              console.error(`[SSL Auto] Certificate issuance failed: ${result.error}`);
            }
          } else {
            console.log(`[SSL Auto] DNS verification failed, will retry later for ${certificate.id}`);
            await prisma.sSLCertificate.update({
              where: { id: certificate.id },
              data: { lastError: 'DNS not yet propagated. Auto-retry in progress.' },
            });
            
            // Retry after another 30 seconds
            await new Promise(resolve => setTimeout(resolve, 30000));
            const retryVerified = await verifyDNSTxtRecord(domain, txtRecord!, cnameRecord || undefined);
            
            if (retryVerified) {
              await prisma.sSLCertificate.update({
                where: { id: certificate.id },
                data: { status: 'VERIFIED', verifiedAt: new Date(), lastError: null },
              });
              await issueCertificate(certificate.id);
            } else {
              await prisma.sSLCertificate.update({
                where: { id: certificate.id },
                data: { lastError: 'DNS propagation taking longer than expected. Please wait and try manual verification.' },
              });
            }
          }
        } catch (error: any) {
          console.error(`[SSL Auto] Error in auto-issue:`, error);
          await prisma.sSLCertificate.update({
            where: { id: certificate.id },
            data: { 
              status: 'FAILED',
              lastError: error.message || 'Auto-issuance failed',
            },
          });
        }
      })();
    }
    
    res.json({
      certificate: {
        id: certificate.id,
        domain: certificate.domain,
        domainType: certificate.domainType,
        status: certificate.status,
        txtRecord: certificate.txtRecord,
        hostingId: hosting.id,
        hostingDomain: hosting.domain,
        autoVerified,
      },
      instructions: autoVerified 
        ? 'SSL certificate is being issued automatically. This may take 1-2 minutes.'
        : `Add TXT record: _acme-challenge.${domain} → ${txtRecord}`,
    });
  } catch (error) {
    console.error('Request SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to request SSL certificate' });
  }
});

// Verify DNS and start certificate issuance
router.post('/verify/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    // Get certificate with hosting info
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: {
          select: { userId: true },
        },
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    if (!['PENDING_VERIFICATION', 'VERIFYING'].includes(certificate.status)) {
      return res.status(400).json({ error: 'Certificate is not pending verification' });
    }
    
    // Update status to verifying
    await prisma.sSLCertificate.update({
      where: { id },
      data: { status: 'VERIFYING' },
    });
    
    // Verify DNS TXT record (with CNAME support for subdomain)
    const verified = await verifyDNSTxtRecord(
      certificate.domain,
      certificate.txtRecord!,
      certificate.cnameRecord || undefined // Pass CNAME target for subdomain verification
    );
    
    if (!verified) {
      await prisma.sSLCertificate.update({
        where: { id },
        data: { 
          status: 'PENDING_VERIFICATION',
          lastError: 'DNS record not found or incorrect',
        },
      });
      return res.status(400).json({ 
        error: 'DNS verification failed',
        message: certificate.domainType === 'SUBDOMAIN'
          ? 'DNS record not yet propagated. Please wait a moment and try again.'
          : 'DNS record not found. Please make sure you have added the correct record and wait for DNS propagation (can take up to 48 hours).',
      });
    }
    
    // Update to verified status
    await prisma.sSLCertificate.update({
      where: { id },
      data: { 
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    
    // For subdomain, we can optionally clean up the DNS record after verification
    // But we'll keep it for now as ACME might need it during issuance
    
    // Trigger certificate issuance (async job should pick this up)
    // For now, return success
    res.json({ 
      success: true, 
      message: 'DNS verified successfully. Certificate issuance will begin shortly.',
      status: 'VERIFIED',
    });
  } catch (error) {
    console.error('Verify SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to verify SSL certificate' });
  }
});

// Issue certificate (trigger ACME flow)
router.post('/issue/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    // Get certificate with hosting info
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: {
          select: { userId: true },
        },
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    if (certificate.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'Certificate must be verified first' });
    }
    
    // Initialize logs for this certificate
    issueLogs.set(id, []);
    const addLog = (msg: string) => {
      const logs = issueLogs.get(id) || [];
      logs.push(`[${new Date().toISOString()}] ${msg}`);
      issueLogs.set(id, logs);
    };
    
    // Start issuance in background
    addLog('Starting certificate issuance...');
    
    // Run issuance async
    issueCertificate(id, addLog).then(result => {
      if (result.success) {
        addLog('Certificate issued successfully!');
      } else {
        addLog(`ERROR: ${result.error}`);
      }
    }).catch(error => {
      addLog(`FATAL ERROR: ${error.message}`);
    });
    
    res.json({ 
      success: true, 
      message: 'Certificate issuance started. Check logs for progress.',
    });
  } catch (error) {
    console.error('Issue SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to start certificate issuance' });
  }
});

// Get issue logs for certificate
router.get('/logs/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    // Verify ownership
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: {
          select: { userId: true },
        },
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    const logs = issueLogs.get(id) || [];
    
    res.json({ 
      logs,
      status: certificate.status,
      lastError: certificate.lastError,
    });
  } catch (error) {
    console.error('Get SSL logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Delete/cancel SSL certificate request
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    
    const certificate = await prisma.sSLCertificate.findFirst({
      where: { id },
      include: {
        hosting: true, // Need full hosting info for CNAME cleanup
      },
    });
    
    if (!certificate || certificate.hosting?.userId !== userId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Can only delete if not issued or expired/revoked
    if (['ISSUING', 'ISSUED'].includes(certificate.status)) {
      return res.status(400).json({ error: 'Cannot delete an active certificate' });
    }
    
    // Clean up DNS records for subdomain
    if (certificate.domainType === 'SUBDOMAIN' && certificate.hosting) {
      // Delete CNAME record from VistaPanel
      try {
        await deleteVistapanelCNAME(certificate.hosting, '_acme-challenge');
      } catch (error) {
        console.error('Failed to delete VistaPanel CNAME record:', error);
        // Continue with deletion even if CNAME cleanup fails
      }
      
      // Delete TXT record from Cloudflare
      if (certificate.dnsRecordId) {
        try {
          await deleteCloudflareDNSRecord(certificate.dnsRecordId);
        } catch (error) {
          console.error('Failed to delete Cloudflare TXT record:', error);
          // Continue with deletion even if DNS cleanup fails
        }
      }
    }
    
    await prisma.sSLCertificate.delete({
      where: { id },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to delete SSL certificate' });
  }
});

// ==================== ADMIN ROUTES ====================

// Get SSL configuration
router.get('/admin/config', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await getAllSSLConfigs();
    
    // Mask sensitive values - these keys contain secrets that should not be exposed
    const sensitiveKeys = [
      'CLOUDFLARE_API_TOKEN',
      'GOOGLE_EAB_HMAC_KEY',
      'GOOGLE_SERVICE_ACCOUNT_JSON',
    ];
    
    const maskedConfigs = { ...configs };
    for (const key of sensitiveKeys) {
      if (maskedConfigs[key] && maskedConfigs[key].length > 4) {
        // Show only last 4 chars for tokens, or indicate presence for JSON
        if (key === 'GOOGLE_SERVICE_ACCOUNT_JSON') {
          try {
            const parsed = JSON.parse(maskedConfigs[key]);
            maskedConfigs[key] = `***configured*** (${parsed.client_email || 'unknown email'})`;
          } catch {
            maskedConfigs[key] = '***configured***';
          }
        } else {
          maskedConfigs[key] = '***' + maskedConfigs[key].slice(-4);
        }
      }
    }
    
    res.json(maskedConfigs);
  } catch (error) {
    console.error('Get SSL config error:', error);
    res.status(500).json({ error: 'Failed to get SSL configuration' });
  }
});

// Update SSL configuration
router.put('/admin/config', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    // Validate known config keys
    const validKeys = [
      'CLOUDFLARE_API_TOKEN',
      'INTERMEDIATE_DOMAIN',
      'ACME_EMAIL',
      'USE_STAGING',
      'GOOGLE_SERVICE_ACCOUNT_JSON',
      'GOOGLE_EAB_KEY_ID',
      'GOOGLE_EAB_HMAC_KEY',
    ];
    
    if (!validKeys.includes(key)) {
      return res.status(400).json({ error: 'Invalid configuration key' });
    }
    
    // Sensitive keys that get masked - don't save masked values
    const sensitiveKeys = ['CLOUDFLARE_API_TOKEN', 'GOOGLE_EAB_HMAC_KEY', 'GOOGLE_SERVICE_ACCOUNT_JSON'];
    const stringValue = String(value);
    
    if (sensitiveKeys.includes(key)) {
      // Skip if value is masked or empty indicator
      if (stringValue.startsWith('***') || stringValue === '') {
        console.log(`[SSL Config] Skipping masked/empty value for ${key}`);
        return res.json({ success: true, skipped: true, message: 'Masked value not saved' });
      }
    }
    
    await setSSLConfig(key, stringValue, description);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update SSL config error:', error);
    res.status(500).json({ error: 'Failed to update SSL configuration' });
  }
});

// Bulk update SSL configuration
router.put('/admin/config/bulk', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = req.body;
    
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration data' });
    }
    
    // List of sensitive keys that get masked - never save masked values
    const sensitiveKeys = ['CLOUDFLARE_API_TOKEN', 'GOOGLE_EAB_HMAC_KEY', 'GOOGLE_SERVICE_ACCOUNT_JSON'];
    
    const skippedKeys: string[] = [];
    
    for (const [key, value] of Object.entries(configs)) {
      if (value !== undefined && value !== null && value !== '') {
        const stringValue = String(value);
        
        // Skip if value looks like a masked value (starts with ***)
        if (sensitiveKeys.includes(key) && stringValue.startsWith('***')) {
          console.log(`[SSL Config] Skipping masked value for ${key}`);
          skippedKeys.push(key);
          continue;
        }
        
        // Additional validation for specific keys
        if (key === 'CLOUDFLARE_API_TOKEN' && stringValue.length < 20) {
          console.log(`[SSL Config] Skipping invalid Cloudflare token (too short)`);
          skippedKeys.push(key);
          continue;
        }
        
        if (key === 'GOOGLE_SERVICE_ACCOUNT_JSON') {
          try {
            const parsed = JSON.parse(stringValue);
            if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
              console.log(`[SSL Config] Skipping invalid Service Account JSON (missing required fields)`);
              skippedKeys.push(key);
              continue;
            }
          } catch (e) {
            console.log(`[SSL Config] Skipping invalid Service Account JSON (parse error)`);
            skippedKeys.push(key);
            continue;
          }
        }
        
        await setSSLConfig(key, stringValue);
      }
    }
    
    if (skippedKeys.length > 0) {
      console.log(`[SSL Config] Skipped keys: ${skippedKeys.join(', ')}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Bulk update SSL config error:', error);
    res.status(500).json({ error: 'Failed to update SSL configuration' });
  }
});

// Test Cloudflare connection
router.post('/admin/test-cloudflare', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await testCloudflareConnection();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Cloudflare connection successful',
        zones: result.zones,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || 'Cloudflare connection failed',
      });
    }
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Cloudflare connection failed',
    });
  }
});

// Test Google Service Account connection
router.post('/admin/test-google', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await testGoogleServiceAccount();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message,
        projectId: result.projectId,
        email: result.email,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.message,
      });
    }
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Google Service Account test failed',
    });
  }
});

// Get all SSL certificates (admin view)
router.get('/admin/certificates', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { domain: { contains: String(search) } },
        { hosting: { domain: { contains: String(search) } } },
        { hosting: { user: { email: { contains: String(search) } } } },
      ];
    }
    
    const [certificates, total] = await Promise.all([
      prisma.sSLCertificate.findMany({
        where,
        include: {
          hosting: {
            select: {
              id: true,
              domain: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.sSLCertificate.count({ where }),
    ]);
    
    // Hide private keys
    const safeCertificates = certificates.map(cert => ({
      ...cert,
      privateKey: cert.privateKey ? '***HIDDEN***' : null,
    }));
    
    res.json({
      certificates: safeCertificates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get admin SSL certificates error:', error);
    res.status(500).json({ error: 'Failed to get SSL certificates' });
  }
});

// Get single SSL certificate details (admin view)
router.get('/admin/certificate/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const certificate = await prisma.sSLCertificate.findUnique({
      where: { id },
      include: {
        hosting: {
          select: {
            id: true,
            domain: true,
            vpUsername: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    // Hide private key but indicate if it exists
    const safeCertificate = {
      ...certificate,
      privateKey: certificate.privateKey ? '***HIDDEN***' : null,
      hasPrivateKey: !!certificate.privateKey,
    };
    
    res.json(safeCertificate);
  } catch (error) {
    console.error('Get admin SSL certificate detail error:', error);
    res.status(500).json({ error: 'Failed to get SSL certificate' });
  }
});

// Manually trigger certificate issuance (admin)
router.post('/admin/issue/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const certificate = await prisma.sSLCertificate.findUnique({
      where: { id },
      include: {
        hosting: {
          select: { userId: true },
        },
      },
    });
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    if (certificate.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'Certificate must be verified before issuance' });
    }
    
    // Update status to issuing
    await prisma.sSLCertificate.update({
      where: { id },
      data: { status: 'ISSUING' },
    });
    
    // TODO: Trigger ACME certificate issuance
    // This would be handled by a background job
    
    res.json({ 
      success: true, 
      message: 'Certificate issuance started',
    });
  } catch (error) {
    console.error('Issue SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to issue SSL certificate' });
  }
});

// Retry failed certificate
router.post('/admin/retry/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const certificate = await prisma.sSLCertificate.findUnique({
      where: { id },
    });
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    
    if (certificate.status !== 'FAILED') {
      return res.status(400).json({ error: 'Only failed certificates can be retried' });
    }
    
    // Reset to pending verification
    await prisma.sSLCertificate.update({
      where: { id },
      data: { 
        status: 'PENDING_VERIFICATION',
        lastError: null,
        retryCount: { increment: 1 },
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Retry SSL certificate error:', error);
    res.status(500).json({ error: 'Failed to retry SSL certificate' });
  }
});

export default router;
