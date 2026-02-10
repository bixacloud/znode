import crypto from 'crypto';
import { prisma } from './prisma.js';
import Cloudflare from 'cloudflare';
import acme from 'acme-client';
import { getGoogleEABKey } from './google-eab.js';

// ACME Directory URLs for different providers
export const ACME_DIRECTORIES = {
  LETS_ENCRYPT: 'https://acme-v02.api.letsencrypt.org/directory',
  LETS_ENCRYPT_STAGING: 'https://acme-staging-v02.api.letsencrypt.org/directory',
  GOOGLE_TRUST: 'https://dv.acme-v02.api.pki.goog/directory',
  GOOGLE_TRUST_STAGING: 'https://dv.acme-v02.test-api.pki.goog/directory',
};

// Get SSL config value from database
export async function getSSLConfig(key: string): Promise<string | null> {
  const config = await prisma.sSLConfig.findUnique({
    where: { key },
  });
  return config?.value || null;
}

// Set SSL config value
export async function setSSLConfig(key: string, value: string, description?: string): Promise<void> {
  await prisma.sSLConfig.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  });
}

// Get all SSL configs
export async function getAllSSLConfigs(): Promise<Record<string, string>> {
  const configs = await prisma.sSLConfig.findMany();
  return configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, string>);
}

// Generate a random verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Get service domains from allowed_domains setting
export async function getServiceDomainsFromAllowedDomains(): Promise<string[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'allowed_domains' },
  });
  
  if (!setting) return [];
  
  try {
    const domains = JSON.parse(setting.value) as Array<{ domain: string; enabled: boolean }>;
    return domains
      .filter(d => d.enabled)
      .map(d => d.domain.toLowerCase());
  } catch {
    return [];
  }
}

// Check if a domain is a subdomain of the hosting service
export async function isSubdomainOfService(domain: string): Promise<boolean> {
  const domains = await getServiceDomainsFromAllowedDomains();
  if (domains.length === 0) return false;
  
  const lowerDomain = domain.toLowerCase();
  
  return domains.some(serviceDomain => 
    lowerDomain.endsWith(`.${serviceDomain}`) || lowerDomain === serviceDomain
  );
}

// Get the service domain that a subdomain belongs to
export async function getServiceDomainFor(domain: string): Promise<string | null> {
  const domains = await getServiceDomainsFromAllowedDomains();
  if (domains.length === 0) return null;
  
  const lowerDomain = domain.toLowerCase();
  
  for (const serviceDomain of domains) {
    if (lowerDomain.endsWith(`.${serviceDomain}`)) {
      return serviceDomain;
    }
  }
  return null;
}

// Extract subdomain prefix from full domain
export function extractSubdomainPrefix(domain: string, serviceDomain: string): string {
  const lowerDomain = domain.toLowerCase();
  const lowerService = serviceDomain.toLowerCase();
  
  if (lowerDomain.endsWith(`.${lowerService}`)) {
    return lowerDomain.slice(0, -(lowerService.length + 1));
  }
  return domain;
}

// Get Cloudflare client instance
async function getCloudflareClient(): Promise<Cloudflare> {
  const apiToken = await getSSLConfig('CLOUDFLARE_API_TOKEN');
  
  if (!apiToken) {
    throw new Error('Cloudflare API Token not configured');
  }
  
  return new Cloudflare({ apiToken });
}

// Get Zone ID for a domain (auto-detect from intermediate domain)
async function getCloudflareZoneId(client: Cloudflare, domainName: string): Promise<string> {
  // Extract root domain from domainName (e.g., "sub.example.com" -> "example.com")
  const parts = domainName.split('.');
  const rootDomain = parts.slice(-2).join('.');
  
  // List zones and find matching one
  const zones = await client.zones.list({ name: rootDomain });
  
  if (!zones.result || zones.result.length === 0) {
    throw new Error(`Zone not found for domain: ${rootDomain}`);
  }
  
  return zones.result[0].id;
}

// Create DNS record in Cloudflare
export async function createCloudflareDNSRecord(
  type: 'TXT' | 'CNAME',
  name: string,
  content: string,
  proxied: boolean = false
): Promise<string> {
  const client = await getCloudflareClient();
  const zoneId = await getCloudflareZoneId(client, name);
  
  const record = await client.dns.records.create({
    zone_id: zoneId,
    type,
    name,
    content,
    ttl: 1, // Auto
    proxied,
  });
  
  if (!record.id) {
    throw new Error('Failed to create DNS record');
  }
  
  // Return zoneId:recordId so we can delete later
  return `${zoneId}:${record.id}`;
}

// Delete DNS record from Cloudflare
export async function deleteCloudflareDNSRecord(recordIdWithZone: string): Promise<void> {
  const [zoneId, recordId] = recordIdWithZone.split(':');
  
  if (!zoneId || !recordId) {
    throw new Error('Invalid record ID format');
  }
  
  const client = await getCloudflareClient();
  await client.dns.records.delete(recordId, { zone_id: zoneId });
}

// Get DNS record from Cloudflare
export async function getCloudflareDNSRecord(name: string, type: string): Promise<any | null> {
  const client = await getCloudflareClient();
  const zoneId = await getCloudflareZoneId(client, name);
  
  const records = await client.dns.records.list({
    zone_id: zoneId,
    name: { exact: name },
    type: type as any,
  });
  
  return records.result?.[0] || null;
}

// Test Cloudflare connection
export async function testCloudflareConnection(): Promise<{ success: boolean; zones: string[]; error?: string }> {
  try {
    const client = await getCloudflareClient();
    const zones = await client.zones.list();
    
    const zoneNames = zones.result?.map(z => z.name) || [];
    
    return { 
      success: true, 
      zones: zoneNames,
    };
  } catch (error: any) {
    return { 
      success: false, 
      zones: [],
      error: error.message,
    };
  }
}

// Verify DNS TXT record (follows CNAME chain)
export async function verifyDNSTxtRecord(domain: string, expectedValue: string, cnameTarget?: string): Promise<boolean> {
  try {
    const { Resolver } = await import('dns').then(m => m.promises);
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    
    const acmeDomain = `_acme-challenge.${domain}`;
    
    console.log(`[DNS Verify] Checking ${acmeDomain} for value: ${expectedValue.substring(0, 20)}...`);
    
    // If cnameTarget is provided, we're in subdomain mode
    // The flow is: _acme-challenge.subdomain.zarix.app CNAME -> _acme-challenge.subdomain.intermediate.domain TXT
    if (cnameTarget) {
      // First try to resolve CNAME
      let cnameResolved = false;
      try {
        const cnameRecords = await resolver.resolveCname(acmeDomain);
        if (cnameRecords.length > 0) {
          const targetDomain = cnameRecords[0].replace(/\.$/, '');
          console.log(`[DNS Verify] CNAME found: ${acmeDomain} -> ${targetDomain}`);
          
          // Now query TXT on the CNAME target
          try {
            const txtRecords = await resolver.resolveTxt(targetDomain);
            const flatRecords = txtRecords.flat();
            console.log(`[DNS Verify] TXT records on ${targetDomain}:`, flatRecords);
            cnameResolved = true;
            return flatRecords.some(record => record === expectedValue);
          } catch (txtError) {
            console.log(`[DNS Verify] No TXT on CNAME target: ${txtError}`);
          }
        }
      } catch (cnameError: any) {
        console.log(`[DNS Verify] CNAME not yet propagated for ${acmeDomain}: ${cnameError.code}`);
      }
      
      // If CNAME not yet propagated, directly query TXT on the cnameTarget
      // because TXT record is already created on Cloudflare
      if (!cnameResolved) {
        console.log(`[DNS Verify] Trying direct TXT query on cnameTarget: ${cnameTarget}`);
        try {
          const txtRecords = await resolver.resolveTxt(cnameTarget);
          const flatRecords = txtRecords.flat();
          console.log(`[DNS Verify] TXT records on ${cnameTarget}:`, flatRecords);
          
          if (flatRecords.some(record => record === expectedValue)) {
            console.log(`[DNS Verify] TXT found on intermediate domain, but CNAME not yet propagated`);
            // TXT exists on intermediate, but CNAME not yet propagated
            // Return false so we wait for CNAME to propagate
            return false;
          }
        } catch (txtError: any) {
          console.log(`[DNS Verify] No TXT on cnameTarget: ${txtError.code}`);
        }
      }
      
      return false;
    }
    
    // Direct TXT lookup on the domain (for custom domains)
    const records = await resolver.resolveTxt(acmeDomain);
    const flatRecords = records.flat();
    console.log(`[DNS Verify] Direct TXT records on ${acmeDomain}:`, flatRecords);
    
    return flatRecords.some(record => record === expectedValue);
  } catch (error) {
    console.error('DNS verification error:', error);
    return false;
  }
}

// Verify DNS CNAME record
export async function verifyDNSCnameRecord(domain: string, expectedTarget: string): Promise<boolean> {
  try {
    const { Resolver } = await import('dns').then(m => m.promises);
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    
    const records = await resolver.resolveCname(`_acme-challenge.${domain}`);
    
    return records.some(record => 
      record.toLowerCase() === expectedTarget.toLowerCase() ||
      record.toLowerCase() === `${expectedTarget.toLowerCase()}.`
    );
  } catch (error) {
    console.error('CNAME verification error:', error);
    return false;
  }
}

// Generate ACME account key pair
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  return { privateKey, publicKey };
}

// Generate CSR (Certificate Signing Request)
export function generateCSR(domain: string, privateKey: string): string {
  // Note: In production, use a proper library like node-forge
  // This is a simplified implementation
  const forge = require('node-forge');
  
  const keys = forge.pki.privateKeyFromPem(privateKey);
  const csr = forge.pki.createCertificationRequest();
  
  csr.publicKey = forge.pki.setRsaPublicKey(keys.n, keys.e);
  csr.setSubject([{ name: 'commonName', value: domain }]);
  csr.sign(keys);
  
  return forge.pki.certificationRequestToPem(csr);
}

// Base64url encode
export function base64url(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return buffer.toString('base64url');
}

// JWK thumbprint
export function jwkThumbprint(jwk: any): string {
  const ordered = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  
  return base64url(crypto.createHash('sha256').update(ordered).digest());
}

// Get ACME directory URL based on provider
export function getAcmeDirectoryUrl(provider: string, useStaging: boolean = false): string {
  switch (provider) {
    case 'LETS_ENCRYPT':
      return useStaging ? ACME_DIRECTORIES.LETS_ENCRYPT_STAGING : ACME_DIRECTORIES.LETS_ENCRYPT;
    case 'GOOGLE_TRUST':
      return useStaging ? ACME_DIRECTORIES.GOOGLE_TRUST_STAGING : ACME_DIRECTORIES.GOOGLE_TRUST;
    default:
      return useStaging ? ACME_DIRECTORIES.LETS_ENCRYPT_STAGING : ACME_DIRECTORIES.LETS_ENCRYPT;
  }
}

// Issue SSL certificate using ACME protocol
export async function issueCertificate(
  certificateId: string,
  onLog?: (message: string) => void
): Promise<{ success: boolean; error?: string }> {
  const log = (msg: string) => {
    console.log(`[SSL Issue ${certificateId}] ${msg}`);
    onLog?.(msg);
  };

  try {
    log('Starting certificate issuance...');
    
    // Get certificate record
    const certificate = await prisma.sSLCertificate.findUnique({
      where: { id: certificateId },
      include: { hosting: true },
    });
    
    if (!certificate) {
      log('ERROR: Certificate not found');
      return { success: false, error: 'Certificate not found' };
    }
    
    if (certificate.status !== 'VERIFIED') {
      log(`ERROR: Certificate status is ${certificate.status}, expected VERIFIED`);
      return { success: false, error: 'Certificate must be verified first' };
    }
    
    log(`Domain: ${certificate.domain}`);
    log(`Provider: ${certificate.provider}`);
    
    // Update status to ISSUING
    await prisma.sSLCertificate.update({
      where: { id: certificateId },
      data: { status: 'ISSUING' },
    });
    log('Status updated to ISSUING');
    
    // Get SSL config
    const useStaging = (await getSSLConfig('USE_STAGING')) === 'true';
    const acmeEmail = await getSSLConfig('ACME_EMAIL');
    
    if (!acmeEmail) {
      log('ERROR: ACME_EMAIL not configured');
      await updateCertificateError(certificateId, 'ACME_EMAIL not configured');
      return { success: false, error: 'ACME_EMAIL not configured' };
    }
    
    const directoryUrl = getAcmeDirectoryUrl(certificate.provider, useStaging);
    log(`Using ACME directory: ${directoryUrl}`);
    log(`Using staging: ${useStaging}`);
    
    // Create ACME client
    log('Creating ACME client...');
    const client = new acme.Client({
      directoryUrl,
      accountKey: await acme.crypto.createPrivateKey(),
    });
    
    // Create account - Google Trust Services requires EAB
    log('Creating/retrieving ACME account...');
    
    if (certificate.provider === 'GOOGLE_TRUST') {
      // Google Trust Services requires External Account Binding (EAB)
      // First try to get EAB from Service Account (automatic)
      // If not configured, fall back to manual EAB credentials
      
      let eabKeyId: string | null = null;
      let eabHmacKey: string | null = null;
      
      // Check if Service Account is configured for automatic EAB
      const serviceAccountJson = await getSSLConfig('GOOGLE_SERVICE_ACCOUNT_JSON');
      
      if (serviceAccountJson) {
        log('Using Service Account to generate EAB key automatically...');
        try {
          const eabCredentials = await getGoogleEABKey();
          eabKeyId = eabCredentials.keyId;
          eabHmacKey = eabCredentials.hmacKey;
          log('EAB key generated successfully from Service Account');
        } catch (eabError: any) {
          log(`ERROR: Failed to get EAB from Service Account: ${eabError.message}`);
          await updateCertificateError(certificateId, `Failed to get EAB from Google: ${eabError.message}`);
          return { success: false, error: eabError.message };
        }
      } else {
        // Fall back to manual EAB credentials
        eabKeyId = await getSSLConfig('GOOGLE_EAB_KEY_ID');
        eabHmacKey = await getSSLConfig('GOOGLE_EAB_HMAC_KEY');
        
        if (!eabKeyId || !eabHmacKey) {
          log('ERROR: Google Trust Services requires EAB credentials');
          await updateCertificateError(certificateId, 'Google Trust Services requires either a Service Account JSON or manual EAB credentials (GOOGLE_EAB_KEY_ID and GOOGLE_EAB_HMAC_KEY). Please configure in SSL settings.');
          return { success: false, error: 'Google EAB credentials not configured' };
        }
        log('Using manually configured EAB credentials');
      }
      
      log('Creating ACME account with External Account Binding...');
      await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${acmeEmail}`],
        externalAccountBinding: {
          kid: eabKeyId,
          hmacKey: eabHmacKey,
        },
      });
    } else {
      // Let's Encrypt and others don't require EAB
      await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${acmeEmail}`],
      });
    }
    log('ACME account ready');
    
    // Create order
    log('Creating certificate order...');
    const order = await client.createOrder({
      identifiers: [{ type: 'dns', value: certificate.domain }],
    });
    log('Order created');
    
    // Get authorizations
    log('Getting authorizations...');
    const authorizations = await client.getAuthorizations(order);
    
    for (const authz of authorizations) {
      log(`Processing authorization for ${authz.identifier.value}`);
      
      // Find DNS challenge
      const dnsChallenge = authz.challenges.find(c => c.type === 'dns-01');
      if (!dnsChallenge) {
        log('ERROR: No DNS-01 challenge found');
        await updateCertificateError(certificateId, 'No DNS-01 challenge available');
        return { success: false, error: 'No DNS-01 challenge available' };
      }
      
      // Get key authorization
      const keyAuthorization = await client.getChallengeKeyAuthorization(dnsChallenge);
      log(`Challenge key authorization: ${keyAuthorization.substring(0, 20)}...`);
      
      // DNS record should already be set up during verification
      // Verify it's still correct
      log('Verifying DNS record is still in place...');
      const verified = await verifyDNSTxtRecord(
        certificate.domain, 
        keyAuthorization,
        certificate.cnameRecord || undefined
      );
      
      if (!verified) {
        // The verification token might be different from ACME challenge
        // Let's update the DNS record with the correct value
        log('DNS record has different value, need to update...');
        
        if (certificate.domainType === 'SUBDOMAIN' && certificate.dnsRecordId) {
          // Update Cloudflare TXT record with new value
          const intermediateDomain = await getSSLConfig('INTERMEDIATE_DOMAIN');
          if (!intermediateDomain) {
            await updateCertificateError(certificateId, 'INTERMEDIATE_DOMAIN not configured');
            return { success: false, error: 'INTERMEDIATE_DOMAIN not configured' };
          }
          
          // Delete old record and create new one
          try {
            await deleteCloudflareDNSRecord(certificate.dnsRecordId);
            log('Deleted old DNS record');
          } catch (e) {
            log(`Warning: Failed to delete old DNS record: ${e}`);
          }
          
          // Get subdomain prefix
          const serviceDomain = await getServiceDomainFor(certificate.domain);
          if (!serviceDomain) {
            await updateCertificateError(certificateId, 'Service domain not found');
            return { success: false, error: 'Service domain not found' };
          }
          const subdomainPrefix = extractSubdomainPrefix(certificate.domain, serviceDomain);
          
          // Create new TXT record with ACME challenge value
          const txtRecordName = `_acme-challenge.${subdomainPrefix}.${intermediateDomain}`;
          log(`Creating TXT record: ${txtRecordName} = ${keyAuthorization}`);
          
          const newRecordId = await createCloudflareDNSRecord('TXT', txtRecordName, keyAuthorization);
          
          // Update certificate with new record info
          await prisma.sSLCertificate.update({
            where: { id: certificateId },
            data: {
              dnsRecordId: newRecordId,
              txtRecord: keyAuthorization,
            },
          });
          log('Updated DNS record with ACME challenge value');
          
          // Wait for DNS propagation
          log('Waiting for DNS propagation (30 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
      
      // Complete challenge
      log('Completing challenge...');
      await client.completeChallenge(dnsChallenge);
      log('Challenge completion requested');
      
      // Wait for challenge validation
      log('Waiting for challenge validation...');
      await client.waitForValidStatus(dnsChallenge);
      log('Challenge validated!');
    }
    
    // Generate private key for certificate
    log('Generating certificate private key...');
    const [certKey, csr] = await acme.crypto.createCsr({
      commonName: certificate.domain,
    });
    log('CSR created');
    
    // Finalize order
    log('Finalizing order...');
    await client.finalizeOrder(order, csr);
    log('Order finalized');
    
    // Get certificate
    log('Downloading certificate...');
    const cert = await client.getCertificate(order);
    log('Certificate downloaded!');
    
    // Parse certificate chain
    const certParts = cert.split(/(?=-----BEGIN CERTIFICATE-----)/);
    const serverCert = certParts[0];
    const caCert = certParts.slice(1).join('');
    
    // Calculate expiry (90 days for Let's Encrypt)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);
    
    // Update certificate in database
    await prisma.sSLCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'ISSUED',
        certificate: serverCert,
        privateKey: certKey.toString(),
        caCertificate: caCert,
        issuedAt: new Date(),
        expiresAt,
        lastError: null,
      },
    });
    
    log('Certificate issued successfully!');
    log(`Expires: ${expiresAt.toISOString()}`);
    
    return { success: true };
    
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    console.error(`[SSL Issue ${certificateId}] ERROR:`, error);
    
    await updateCertificateError(certificateId, errorMsg);
    
    return { success: false, error: errorMsg };
  }
}

// Helper to update certificate error status
async function updateCertificateError(certificateId: string, error: string): Promise<void> {
  await prisma.sSLCertificate.update({
    where: { id: certificateId },
    data: {
      status: 'FAILED',
      lastError: error,
    },
  });
}
