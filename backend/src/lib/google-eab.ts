import { GoogleAuth } from 'google-auth-library';
import { getSSLConfig, setSSLConfig } from './ssl.js';

interface EABCredentials {
  keyId: string;
  hmacKey: string;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Get a new EAB key from Google Cloud Public CA API
 * This requires a Service Account with "Public CA External Account Key Creator" role
 */
export async function getGoogleEABKey(): Promise<EABCredentials> {
  // Get service account JSON from config
  const serviceAccountJson = await getSSLConfig('GOOGLE_SERVICE_ACCOUNT_JSON');
  
  if (!serviceAccountJson) {
    throw new Error('Google Service Account JSON not configured. Please upload your service account key file in SSL settings.');
  }
  
  let serviceAccount: ServiceAccountKey;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error('Invalid Google Service Account JSON format');
  }
  
  if (!serviceAccount.project_id) {
    throw new Error('Invalid Service Account: missing project_id');
  }
  
  console.log(`[Google EAB] Using service account: ${serviceAccount.client_email}`);
  console.log(`[Google EAB] Project ID: ${serviceAccount.project_id}`);
  
  // Create authenticated client
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  
  if (!accessToken.token) {
    throw new Error('Failed to get access token from Google');
  }
  
  // Call Public CA API to create external account key
  const apiUrl = `https://publicca.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/global/externalAccountKeys`;
  
  console.log(`[Google EAB] Calling API: ${apiUrl}`);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Google EAB] API Error: ${response.status} ${errorText}`);
    
    if (response.status === 403) {
      throw new Error('Permission denied. Make sure the Service Account has "Public CA External Account Key Creator" role and Public CA API is enabled.');
    }
    if (response.status === 404) {
      throw new Error('Public CA API not found. Make sure to enable "Public Certificate Authority API" in your Google Cloud project.');
    }
    
    throw new Error(`Google API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  /*
   * Response format:
   * {
   *   "name": "projects/.../locations/global/externalAccountKeys/...",
   *   "keyId": "abc123...",
   *   "b64MacKey": "xyz789..."
   * }
   */
  
  if (!data.keyId || !data.b64MacKey) {
    console.error('[Google EAB] Unexpected response:', data);
    throw new Error('Invalid response from Google API: missing keyId or b64MacKey');
  }
  
  console.log(`[Google EAB] Successfully created EAB key: ${data.keyId.substring(0, 10)}...`);
  
  return {
    keyId: data.keyId,
    hmacKey: data.b64MacKey,
  };
}

/**
 * Test Google Service Account configuration
 */
export async function testGoogleServiceAccount(): Promise<{ success: boolean; message: string; projectId?: string; email?: string }> {
  try {
    const serviceAccountJson = await getSSLConfig('GOOGLE_SERVICE_ACCOUNT_JSON');
    
    if (!serviceAccountJson) {
      return { success: false, message: 'Service Account JSON not configured' };
    }
    
    let serviceAccount: ServiceAccountKey;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      return { success: false, message: 'Invalid JSON format' };
    }
    
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      return { success: false, message: 'Missing required fields in Service Account JSON' };
    }
    
    // Try to authenticate
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      return { success: false, message: 'Failed to get access token' };
    }
    
    return {
      success: true,
      message: 'Service Account authenticated successfully',
      projectId: serviceAccount.project_id,
      email: serviceAccount.client_email,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Unknown error' };
  }
}
