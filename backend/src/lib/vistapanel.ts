/**
 * VistaPanel Users API library (TypeScript version)
 * Originally by @oddmario, maintained by @GenerateApps
 * Converted to TypeScript for Node.js
 */

import { JSDOM } from 'jsdom';

interface CookieJar {
  [key: string]: string;
}

interface TableData {
  [key: string]: string;
}

interface CNAMERecord {
  Record: string;
  Destination: string;
}

interface MXRecord {
  Domain: string;
  MX: string;
  Priority: string;
}

interface SPFRecord {
  Domain: string;
  Data: string;
}

interface DiskDirectory {
  path: string;
  size: string;
  files: number;
}

interface DiskspaceDetails {
  [key: string]: string | DiskDirectory[];
  directories?: DiskDirectory[];
}

interface ParsedSize {
  value: number;
  unit: string;
  bytes: number;
}

interface StatsValue {
  used?: number;
  total?: number;
  percent?: number | string;
}

interface DetailedStats {
  [key: string]: string | StatsValue | ParsedSize | null;
}

export class VistapanelApi {
  private cpanelUrl: string = 'https://cpanel.byethost.com';
  private loggedIn: boolean = false;
  private vistapanelSession: string = '';
  private vistapanelSessionName: string = 'PHPSESSID';
  private accountUsername: string = '';
  private cookie: string = '';

  /**
   * Find line containing a string
   */
  private getLineWithString(content: string, str: string): string | number {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(str)) {
        return line;
      }
    }
    return -1;
  }

  /**
   * Simple fetch wrapper with cookie support
   */
  private async simpleCurl(
    url: string,
    post: boolean = false,
    postfields: Record<string, string> = {},
    header: boolean = false,
    httpheader: string[] = [],
    followlocation: boolean = false
  ): Promise<string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
    };

    // Add custom headers
    for (const h of httpheader) {
      if (h.startsWith('Cookie:')) {
        headers['Cookie'] = h.replace('Cookie: ', '');
      }
    }

    const options: RequestInit = {
      method: post ? 'POST' : 'GET',
      headers,
      redirect: followlocation ? 'follow' : 'manual',
    };

    if (post && Object.keys(postfields).length > 0) {
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(postfields)) {
        formData.append(key, value);
      }
      options.body = formData.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(url, options);
    const resultUrl = response.url;
    let result = '';

    if (header) {
      // Include headers in response
      const headerLines: string[] = [];
      response.headers.forEach((value, key) => {
        headerLines.push(`${key}: ${value}`);
      });
      result = headerLines.join('\r\n') + '\r\n\r\n' + await response.text();
    } else {
      result = await response.text();
    }

    // Check for errors
    if (resultUrl.includes(this.cpanelUrl + '/panel/indexpl.php?option=error')) {
      const dom = new JSDOM(result);
      const alertMessage = dom.window.document.querySelector('.alert-message');
      if (alertMessage) {
        throw new Error(alertMessage.textContent?.trim() || 'Unknown error');
      }
    }

    return result;
  }

  /**
   * Check if cPanel URL is set
   */
  private checkCpanelUrl(): boolean {
    if (!this.cpanelUrl) {
      throw new Error('Please set cpanelUrl first.');
    }
    if (this.cpanelUrl.endsWith('/')) {
      this.cpanelUrl = this.cpanelUrl.slice(0, -1);
    }
    return true;
  }

  /**
   * Check if logged in
   */
  private checkLogin(): boolean {
    this.checkCpanelUrl();
    if (!this.loggedIn) {
      throw new Error('Not logged in.');
    }
    return true;
  }

  /**
   * Check for empty parameters
   */
  private checkForEmptyParams(params: Record<string, any>): void {
    for (const [key, value] of Object.entries(params)) {
      if (!value && value !== 0) {
        throw new Error(`${key} is required.`);
      }
    }
  }

  /**
   * Get security token from page
   */
  private async getToken(): Promise<number> {
    this.checkLogin();
    const homepage = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    // Method 1: Search for ttt= pattern directly in HTML (most reliable)
    const allTttMatches = homepage.match(/ttt=(\d{10,})/g);
    if (allTttMatches && allTttMatches.length > 0) {
      // Get the first valid token (usually a timestamp-like number)
      const match = allTttMatches[0].match(/ttt=(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    // Method 2: Find in line containing the URL pattern
    const line = this.getLineWithString(homepage, '/panel/indexpl.php?option=domains&ttt=');
    if (typeof line === 'string') {
      // Parse JSON from the line
      const jsonMatch = line.match(/\{[^}]+\}/);
      if (jsonMatch) {
        try {
          const json = JSON.parse(jsonMatch[0]);
          const url = json.url || '';
          const match = url.match(/ttt=(\d+)/);
          if (match) {
            return parseInt(match[1], 10);
          }
        } catch {
          // Continue to fallback methods
        }
      }
    }
    
    // Method 3: Search for any ttt= pattern
    const tttMatch = homepage.match(/ttt=(\d+)/);
    if (tttMatch) {
      return parseInt(tttMatch[1], 10);
    }
    
    // Method 4: Look for token in various patterns
    const tokenPatterns = [
      /&ttt=(\d+)/,
      /\?ttt=(\d+)/,
      /"ttt"\s*:\s*"?(\d+)"?/i,
      /token['"]\s*:\s*['""]?(\d+)/i,
    ];
    
    for (const pattern of tokenPatterns) {
      const match = homepage.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    // Debug: Log a portion of the page to help diagnose
    console.error('Could not find token in page. Sample:', homepage.substring(0, 2000));
    
    throw new Error('Could not find token');
  }

  /**
   * Parse table elements from HTML
   */
  private async getTableElements(url: string, id: string = ''): Promise<TableData[]> {
    this.checkLogin();
    this.checkForEmptyParams({ url });
    
    const html = await this.simpleCurl(url, false, {}, false, [this.cookie]);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    let table: Element | null;
    if (id) {
      table = doc.getElementById(id);
    } else {
      table = doc.querySelector('table');
    }
    
    if (!table) {
      return [];
    }
    
    const headers: string[] = [];
    const headerElements = table.querySelectorAll('th');
    headerElements.forEach(th => {
      headers.push(th.textContent?.trim() || '');
    });
    
    const rows: TableData[] = [];
    const detailElements = table.querySelectorAll('td');
    const details: string[] = [];
    detailElements.forEach(td => {
      details.push(td.textContent?.trim() || '');
    });
    
    if (headers.length > 0) {
      for (let i = 0; i < details.length; i += headers.length) {
        const row: TableData = {};
        for (let j = 0; j < headers.length && i + j < details.length; j++) {
          row[headers[j]] = details[i + j];
        }
        rows.push(row);
      }
    }
    
    return rows;
  }

  /**
   * Parse stats table to array
   */
  private tableToArray(html: string): Record<string, string> {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const table = doc.getElementById('stats');
    
    if (!table) {
      console.log('[tableToArray] Stats table #stats not found in HTML');
      // Try to find any stats info in the page
      const pageTitle = doc.querySelector('title')?.textContent;
      console.log('[tableToArray] Page title:', pageTitle);
      return {};
    }
    
    const data: Record<string, string> = {};
    const rows = table.querySelectorAll('tr');
    
    console.log('[tableToArray] Found', rows.length, 'rows in stats table');
    
    rows.forEach(row => {
      const cols = row.querySelectorAll('td');
      if (cols.length === 2) {
        const key = cols[0].textContent?.trim() || '';
        const value = cols[1].textContent?.trim() || '';
        data[key] = value;
      }
    });
    
    return data;
  }

  /**
   * Set cPanel URL
   */
  public setCpanelUrl(url: string): boolean {
    this.checkForEmptyParams({ url });
    
    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Remove trailing slash
    if (normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    
    this.cpanelUrl = normalizedUrl;
    return true;
  }

  /**
   * Get cPanel URL
   */
  public getCpanelUrl(): string {
    return this.cpanelUrl;
  }

  /**
   * Approve notification
   */
  public async approveNotification(): Promise<boolean> {
    this.checkLogin();
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/approve.php`,
      true,
      { submit: 'true' },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Disapprove notification
   */
  public async disapproveNotification(): Promise<boolean> {
    this.checkLogin();
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/disapprove.php`,
      true,
      { submit: 'false' },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Login to VistaPanel
   */
  public async login(username: string, password: string, theme: string = 'PaperLantern'): Promise<boolean> {
    this.checkCpanelUrl();
    this.checkForEmptyParams({ username, password });
    
    const loginResponse = await fetch(`${this.cpanelUrl}/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
      },
      body: new URLSearchParams({
        uname: username,
        passwd: password,
        theme: theme,
        seeesurf: '567811917014474432',
      }).toString(),
      redirect: 'manual',
    });
    
    // Get cookies from response
    const cookies: CookieJar = {};
    const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
    
    // Fallback for environments without getSetCookie
    const rawHeaders = loginResponse.headers.get('set-cookie') || '';
    const cookieStrings = setCookieHeaders.length > 0 ? setCookieHeaders : [rawHeaders];
    
    for (const cookieStr of cookieStrings) {
      const match = cookieStr.match(/([^=]+)=([^;]+)/);
      if (match) {
        cookies[match[1]] = match[2];
      }
    }
    
    if (this.loggedIn) {
      throw new Error('You are already logged in.');
    }
    
    if (!cookies[this.vistapanelSessionName]) {
      throw new Error('Unable to login.');
    }
    
    const loginText = await loginResponse.text();
    
    if (loginText.includes('panel/index_pl_sus.php')) {
      throw new Error('Your account is suspended.');
    }
    
    if (!loginText.includes("document.location.href = 'panel/indexpl.php")) {
      throw new Error('Invalid login credentials.');
    }
    
    this.loggedIn = true;
    this.accountUsername = username;
    this.vistapanelSession = cookies[this.vistapanelSessionName];
    this.cookie = `Cookie: ${this.vistapanelSessionName}=${this.vistapanelSession}`;
    
    // Check for notification approval
    const notice = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    // Auto-approve notifications if needed
    if (notice.includes("Please click 'I Approve' below to allow us.")) {
      console.log('Auto-approving notifications...');
      await this.simpleCurl(
        `${this.cpanelUrl}/panel/indexpl.php?option=gdpr&cmd=approve`,
        true,
        {},
        false,
        [this.cookie]
      );
    }
    
    return true;
  }

  /**
   * Set session directly (for auto-login)
   */
  public setSession(session: string): boolean {
    this.checkForEmptyParams({ session });
    this.vistapanelSession = session;
    this.cookie = `Cookie: ${this.vistapanelSessionName}=${this.vistapanelSession}`;
    if (!this.loggedIn) {
      this.loggedIn = true;
    }
    return true;
  }

  /**
   * Create a MySQL database
   */
  public async createDatabase(dbname: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ dbname });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=mysql&cmd=create`,
      true,
      { db: dbname },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * List all databases
   */
  public async listDatabases(): Promise<string[]> {
    const databases: string[] = [];
    const tableData = await this.getTableElements(
      `${this.cpanelUrl}/panel/indexpl.php?option=pma`
    );
    
    for (const row of tableData) {
      const firstValue = Object.values(row)[0];
      if (firstValue) {
        databases.push(firstValue.replace(`${this.accountUsername}_`, ''));
      }
    }
    
    return databases;
  }

  /**
   * Delete a database
   */
  public async deleteDatabase(database: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ database });
    
    const databases = await this.listDatabases();
    if (!databases.includes(database)) {
      throw new Error(`The database ${database} doesn't exist.`);
    }
    
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=mysql&cmd=remove`,
      true,
      {
        toremove: `${this.accountUsername}_${database}`,
        Submit2: 'Remove Database',
      },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Get phpMyAdmin link for a database
   */
  public async getPhpmyadminLink(database: string): Promise<string | null> {
    this.checkLogin();
    this.checkForEmptyParams({ database });
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=pma`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const links = dom.window.document.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes(`&db=${this.accountUsername}_${database}`)) {
        return href;
      }
    }
    
    return null;
  }

  /**
   * List domains
   * @param option - "all", "addon", "sub", or "parked"
   */
  public async listDomains(option: string = 'all'): Promise<string[]> {
    this.checkLogin();
    
    let endpoint: string;
    let tableId: string;
    
    switch (option) {
      case 'sub':
        endpoint = 'subdomains';
        tableId = 'subdomaintbl';
        break;
      case 'parked':
        endpoint = 'parked';
        tableId = 'parkeddomaintbl';
        break;
      case 'addon':
        endpoint = 'domains';
        tableId = 'subdomaintbl';
        break;
      default:
        endpoint = 'ssl';
        tableId = 'sql_db_tbl';
        break;
    }
    
    const token = await this.getToken();
    const tableData = await this.getTableElements(
      `${this.cpanelUrl}/panel/indexpl.php?option=${endpoint}&ttt=${token}`,
      tableId
    );
    
    const domains: string[] = [];
    for (const row of tableData) {
      const firstValue = Object.values(row)[0];
      if (firstValue) {
        domains.push(firstValue);
      }
    }
    
    return domains;
  }

  /**
   * Create a redirect
   */
  public async createRedirect(domainname: string, target: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname, target });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=redirect_add`,
      true,
      {
        domain_name: domainname,
        redirect_url: target,
      },
      false,
      [this.cookie],
      true
    );
    return true;
  }

  /**
   * Delete a redirect
   */
  public async deleteRedirect(domainname: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=redirect_rem&domain=${domainname}&redirect_url=http://`,
      true,
      {},
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Get SSL private key for domain
   */
  public async getPrivateKey(domainname: string): Promise<string | null> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname });
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=sslconfigure&domain_name=${domainname}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const textarea = dom.window.document.querySelector('textarea[name="key"]');
    return textarea?.textContent || null;
  }

  /**
   * Get SSL certificate for domain
   */
  public async getCertificate(domainname: string): Promise<string | null> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname });
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=sslconfigure&domain_name=${domainname}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const textarea = dom.window.document.querySelector('textarea[name="cert"]');
    return textarea?.textContent || null;
  }

  /**
   * Upload SSL private key
   */
  public async uploadPrivateKey(domainname: string, key: string, csr: string = ''): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname, key });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/sslconfigure/uploadkey.php`,
      true,
      {
        domain_name: domainname,
        csr,
        key,
      },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Upload SSL certificate
   */
  public async uploadCertificate(domainname: string, cert: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname, cert });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/sslconfigure/uploadcert.php`,
      true,
      {
        domain_name: domainname,
        cert,
      },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Delete SSL certificate
   */
  public async deleteCertificate(domainname: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domainname });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/sslconfigure/deletecert.php?domain_name=${domainname}&username=${this.accountUsername}`,
      false,
      {},
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Get Softaculous auto-login link
   */
  public async getSoftaculousLink(): Promise<string | null> {
    this.checkLogin();
    const token = await this.getToken();
    
    // Use fetch with redirect:manual to capture Location header
    const response = await fetch(
      `${this.cpanelUrl}/panel/indexpl.php?option=installer&ttt=${token}`,
      {
        method: 'GET',
        headers: {
          'Cookie': this.cookie.replace('Cookie: ', ''),
          'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13',
        },
        redirect: 'manual',
      }
    );
    
    // Get Location header from 302 redirect
    let location = response.headers.get('location');
    
    // If no location header, check body for redirects
    if (!location) {
      const body = await response.text();
      
      // Try meta refresh
      const metaMatch = body.match(/url=([^"'\s>]+)/i);
      if (metaMatch) {
        location = metaMatch[1];
      }
      
      // Try JavaScript redirect
      if (!location) {
        const jsMatch = body.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i);
        if (jsMatch) {
          location = jsMatch[1];
        }
      }
    }
    
    // Ensure URL has protocol
    if (location) {
      location = location.trim().replace(/[\r\n]/g, '');
      if (location.startsWith('//')) {
        location = 'https:' + location;
      } else if (!location.startsWith('http://') && !location.startsWith('https://')) {
        // Relative URL - prepend cpanel URL
        if (location.startsWith('/')) {
          const cpanelOrigin = new URL(this.cpanelUrl).origin;
          location = cpanelOrigin + location;
        } else {
          location = this.cpanelUrl + '/' + location;
        }
      }
    }
    
    return location || null;
  }

  /**
   * Get CNAME records
   */
  public async getCNAMErecords(): Promise<CNAMERecord[]> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=cnamerecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const rows = dom.window.document.querySelectorAll('tr');
    const records: CNAMERecord[] = [];
    
    for (let i = 2; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td');
      if (cols.length >= 2) {
        const cname = cols[0].textContent?.trim();
        const destination = cols[1].textContent?.trim();
        if (cname && destination) {
          records.push({ Record: cname, Destination: destination });
        }
      }
    }
    
    return records;
  }

  /**
   * Check if CNAME record exists (by trying to fetch CNAME page without token)
   */
  public async hasCNAMErecord(source: string, domain: string): Promise<boolean> {
    this.checkLogin();
    try {
      // Try to get CNAME records page directly
      const html = await this.simpleCurl(
        `${this.cpanelUrl}/panel/indexpl.php?option=cnamerecords`,
        false,
        {},
        false,
        [this.cookie]
      );
      
      const fullCname = `${source}.${domain}`;
      // Check if CNAME exists in HTML content
      return html.includes(fullCname) || html.includes(`>${source}<`) || html.includes(`>${source}.`);
    } catch (error) {
      console.error('[VistaPanel CNAME] Error checking CNAME:', error);
      return false;
    }
  }

  /**
   * Create CNAME record
   */
  public async createCNAMErecord(source: string, domain: string, dest: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ source, domain, dest });
    console.log(`[VistaPanel CNAME] Creating: source=${source}, domain=${domain}, dest=${dest}`);
    const result = await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/cnamerecords/add.php`,
      true,
      {
        source,
        d_name: domain,
        destination: dest,
      },
      false,
      [this.cookie],
      true
    );
    console.log(`[VistaPanel CNAME] Response: ${typeof result === 'string' ? result.substring(0, 500) : result}`);
    return true;
  }

  /**
   * Get CNAME deletion link
   */
  private async getCNAMEDeletionlink(source: string): Promise<string | null> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=cnamerecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const links = dom.window.document.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes(`?site=${source}`)) {
        return href;
      }
    }
    
    return null;
  }

  /**
   * Delete CNAME record
   */
  public async deleteCNAMErecord(source: string): Promise<boolean> {
    this.checkLogin();
    const link = await this.getCNAMEDeletionlink(source);
    if (link) {
      await this.simpleCurl(
        `${this.cpanelUrl}/panel/${link}`,
        false,
        {},
        false,
        [this.cookie]
      );
    }
    return true;
  }

  /**
   * Get MX records
   */
  public async getMXrecords(): Promise<MXRecord[]> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=mxrecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const rows = dom.window.document.querySelectorAll('tr');
    const records: MXRecord[] = [];
    
    for (let i = 2; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td');
      if (cols.length >= 3) {
        const domain = cols[0].textContent?.trim();
        const mx = cols[1].textContent?.trim();
        const priority = cols[2].textContent?.trim();
        if (domain && mx && priority) {
          records.push({ Domain: domain, MX: mx, Priority: priority });
        }
      }
    }
    
    return records;
  }

  /**
   * Create MX record
   */
  public async createMXrecord(domain: string, server: string, priority: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domain, server });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/mxrecords/add.php`,
      true,
      {
        d_name: domain,
        Data: server,
        Preference: priority,
      },
      false,
      [this.cookie],
      true
    );
    return true;
  }

  /**
   * Get MX deletion link
   */
  private async getMXDeletionlink(domain: string, srv: string, priority: string): Promise<string | null> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=mxrecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const links = dom.window.document.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes(`?site=${domain}`) && href.includes(`&data=${srv}`) && href.includes(`&aux=${priority}`)) {
        return href;
      }
    }
    
    return null;
  }

  /**
   * Delete MX record
   */
  public async deleteMXrecord(domain: string, srv: string, priority: string): Promise<boolean> {
    this.checkLogin();
    const link = await this.getMXDeletionlink(domain, srv, priority);
    if (link) {
      await this.simpleCurl(
        `${this.cpanelUrl}/panel/${link}`,
        false,
        {},
        false,
        [this.cookie]
      );
    }
    return true;
  }

  /**
   * Get SPF records
   */
  public async getSPFrecords(): Promise<SPFRecord[]> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=spfrecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const rows = dom.window.document.querySelectorAll('tr');
    const records: SPFRecord[] = [];
    
    for (let i = 2; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td');
      if (cols.length >= 2) {
        const domain = cols[0].textContent?.trim();
        const data = cols[1].textContent?.trim();
        if (domain && data) {
          records.push({ Domain: domain, Data: data });
        }
      }
    }
    
    return records;
  }

  /**
   * Create SPF record
   */
  public async createSPFrecord(domain: string, data: string): Promise<boolean> {
    this.checkLogin();
    this.checkForEmptyParams({ domain, data });
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/modules-new/spfrecords/add.php`,
      true,
      {
        d_name: domain,
        Data: data,
      },
      false,
      [this.cookie],
      true
    );
    return true;
  }

  /**
   * Get SPF deletion link
   */
  private async getSPFDeletionlink(domain: string, data: string): Promise<string | null> {
    this.checkLogin();
    const token = await this.getToken();
    
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=spfrecords&ttt=${token}`,
      false,
      {},
      false,
      [this.cookie]
    );
    
    const dom = new JSDOM(html);
    const links = dom.window.document.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes(`?site=${domain}`) && href.includes(`&data=${data}`)) {
        return href;
      }
    }
    
    return null;
  }

  /**
   * Delete SPF record
   */
  public async deleteSPFrecord(domain: string, data: string): Promise<boolean> {
    this.checkLogin();
    const link = await this.getSPFDeletionlink(domain, data);
    if (link) {
      await this.simpleCurl(
        `${this.cpanelUrl}/panel/${link}`,
        false,
        {},
        false,
        [this.cookie]
      );
    }
    return true;
  }

  /**
   * Change email
   */
  public async changeEmail(newEmail: string, confirmEmail: string): Promise<boolean> {
    this.checkLogin();
    const token = await this.getToken();
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=changeemail&ttt=${token}`,
      true,
      {
        ttt: token.toString(),
        newemail: newEmail,
        confemail: confirmEmail,
      },
      false,
      [this.cookie]
    );
    return true;
  }

  /**
   * Get user statistics
   */
  public async getUserStats(option: string = ''): Promise<Record<string, string> | string> {
    const html = await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php`,
      true,
      {},
      false,
      [this.cookie]
    );
    
    let stats = this.tableToArray(html);
    
    // Debug: Log all stats keys
    console.log('[getUserStats] Raw stats keys:', Object.keys(stats));
    console.log('[getUserStats] Raw stats:', JSON.stringify(stats, null, 2));
    
    // Clean up stats
    if (stats['MySQL Databases:']) {
      stats['MySQL Databases:'] = stats['MySQL Databases:'].slice(0, -1);
    }
    if (stats['Parked Domains:']) {
      stats['Parked Domains:'] = stats['Parked Domains:'].slice(0, -1);
    }
    if (stats['Bandwidth used:']) {
      stats['Bandwidth used:'] = stats['Bandwidth used:'].replace(/MB\n.{1,50}/i, 'MB');
    }
    
    if (!option) {
      return stats;
    }
    
    if (!option.endsWith(':')) {
      option = option + ':';
    }
    
    return stats[option] || '';
  }

  /**
   * Parse size string to object
   */
  private parseSize(size: string): ParsedSize | string {
    size = size.trim();
    const match = size.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB|B)?$/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] ? match[2].toUpperCase() : 'B';
      return {
        value,
        unit,
        bytes: this.convertToBytes(value, unit),
      };
    }
    return size;
  }

  /**
   * Convert size to bytes
   */
  private convertToBytes(value: number, unit: string): number {
    switch (unit.toUpperCase()) {
      case 'TB':
        return value * Math.pow(1024, 4);
      case 'GB':
        return value * Math.pow(1024, 3);
      case 'MB':
        return value * Math.pow(1024, 2);
      case 'KB':
        return value * 1024;
      default:
        return value;
    }
  }

  /**
   * Logout
   */
  public async logout(): Promise<boolean> {
    this.checkLogin();
    await this.simpleCurl(
      `${this.cpanelUrl}/panel/indexpl.php?option=signout`,
      false,
      {},
      false,
      [this.cookie]
    );
    this.loggedIn = false;
    this.vistapanelSession = '';
    this.accountUsername = '';
    this.cookie = '';
    return true;
  }

  /**
   * Check if logged in
   */
  public isLoggedIn(): boolean {
    return this.loggedIn;
  }

  /**
   * Get current session
   */
  public getSession(): string {
    return this.vistapanelSession;
  }

  /**
   * Get account username
   */
  public getAccountUsername(): string {
    return this.accountUsername;
  }
}

export default VistapanelApi;
