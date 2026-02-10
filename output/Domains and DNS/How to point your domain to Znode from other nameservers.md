# How to Point Your Domain to Znode from Other Nameservers

Typically, connecting your domain to Znode is done by changing your domain's nameservers. However, there are situations where you might want to keep control over your DNS settings:

- You need advanced DNS configuration options
- Your domain registrar doesn't support custom nameserver settings
- You want to host only certain subdomains with Znode
- You need features available only through third-party DNS providers (like Cloudflare)

You can host your website on Znode while using external nameservers by correctly configuring DNS records.

---

## Step 0: Add Your Domain to Your Znode Account

Before pointing your domain, ensure it's linked to your Znode hosting account. Your domain should appear in the Domains list within the client area.

### Domain Verification Options

| Method | Description |
|--------|-------------|
| **Nameserver change** | Temporarily switch to Znode's nameservers, then revert after verification |
| **CNAME record** | Verify ownership without changing nameservers |

See: [How to add your own domain to your account](How%20to%20add%20your%20own%20domain%20to%20your%20account.md)

---

## Step 1: Find Your Website IP Address

You need the IP address associated with your Znode hosting account.

1. Log in to the Znode client area
2. Navigate to **Accounts**
3. Select your hosting account
4. In the **Account Details** panel, find the **Website IP**

**Example:** `185.27.134.XXX`

---

## Step 2: Access Your DNS Provider's Management Tool

Log in to your DNS provider and navigate to the DNS management section. The interface varies by provider.

---

## Step 3: Remove Conflicting DNS Records

Before adding new records, remove any existing records that might conflict.

**Delete records where:**
- **Host** is `@`, `www`, or your domain name (without subdomains)
- **Type** is `A`, `AAAA`, or `CNAME`

---

## Step 4: Add New DNS Records

Create two new DNS records:

### Record 1: Main Domain (A Record)

| Field | Value |
|-------|-------|
| Host | `@` or your domain name |
| Type | `A` |
| Value | Your Website IP (e.g., `185.27.134.XXX`) |

### Record 2: WWW Subdomain (CNAME Record)

| Field | Value |
|-------|-------|
| Host | `www` |
| Type | `CNAME` |
| Value | Your domain name |

**Note:** You don't need to modify other record types like MX or TXT. Leave TTL at the default value.

---

## Step 5: Configure DNS for Subdomains (Optional)

If you plan to host subdomains (e.g., `blog.example.com`) on Znode:

1. Remove any conflicting A, AAAA, or CNAME records for your subdomain
2. Add a new record:

| Field | Value |
|-------|-------|
| Host | Your subdomain (e.g., `blog`) |
| Type | `CNAME` |
| Value | Your domain name |

---

## Step 6: Wait for DNS Propagation

DNS changes can take up to 72 hours to propagate across the internet.

See: [Why isn't my domain working yet?](Why%20isnt%20my%20domain%20working%20yet.md)

---

## Quick Reference

| Record Type | Host | Value | Purpose |
|-------------|------|-------|---------|
| A | `@` | Website IP | Main domain |
| CNAME | `www` | Your domain | WWW version |
| CNAME | `subdomain` | Your domain | Subdomains |
