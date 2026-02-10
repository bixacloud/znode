# How to Add Your Own Domain to Your Account

While a free subdomain is a great way to get started, a custom domain name makes your website look more professional. You can register your own domain with an external registrar and use it on Znode.

## Prerequisites

Before adding your domain, you need a hosting account. Even if you only want to host your own domain, you'll need to create an account with a free subdomain first, then add your domain afterward.

---

## Adding Your Domain

### Through the Client Area

1. Go to your hosting account
2. Find the Domains list
3. Click the **Add Domain** button
4. Choose **Custom Domain** as the Domain Type
5. Enter your domain name
6. Choose the directory:
   - Create a new directory for a separate website
   - Make it an alias of another domain to share the same website
7. Click **Add Domain** to save

### Through the Control Panel

You have two options:

| Option | Description | Use Case |
|--------|-------------|----------|
| **Addon Domain** | Creates its own website directory (like `yourdomain.com/htdocs`) | Host a separate website |
| **Parked Domain** | Links to an existing domain's directory | Show the same website on multiple domains |

---

## Domain Verification

Before adding your domain, you must prove ownership. There are two verification methods:

### Method 1: Nameserver Verification (Recommended)

This is the easiest method with the fewest steps. It works for both new accounts and adding domains to existing accounts.

**Steps:**
1. Change your domain's nameservers to Znode's nameservers
2. Add the domain to your account

See: [How to point your domain name to Znode nameservers](How%20to%20point%20your%20domain%20name%20to%20Znode%20nameservers.md)

**Note:** Some domain extensions and registrars don't support setting nameservers that haven't been configured yet. Changing nameservers may also cause downtime if you have an existing website.

### Method 2: CNAME Verification

Use this method if:
- You can't change nameservers beforehand
- You want to avoid downtime during migration
- Your registrar blocks the nameserver change

**Important:** CNAME verification only works for adding domains to **existing** accounts. To set up a new account with your own domain, create the account with a free subdomain first.

See: [How to add your domain with CNAME verification](How%20to%20add%20your%20domain%20with%20CNAME%20verification.md)

**Note:** The CNAME record is only for verification. After your domain is added, you'll need to either:
- Change your nameservers to point to your hosting account
- Set up the correct DNS records at your current DNS provider

---

## After Adding Your Domain

### Wait for DNS Propagation

After adding your domain, it probably won't show your website immediately. Adding a domain configures our nameservers, and this DNS change can take up to 72 hours to be visible everywhere.

Unfortunately, this timing cannot be sped up, but there are workarounds you can try to access your site sooner.

See: [Why isn't my domain working yet?](Why%20isnt%20my%20domain%20working%20yet.md)

---

## Quick Reference

| Verification Method | Best For | Works With New Accounts |
|---------------------|----------|------------------------|
| Nameserver | Most users, simplest setup | ✅ Yes |
| CNAME | Avoiding downtime, restricted registrars | ❌ No (existing accounts only) |
