# What Does Subdomain / Addon Domain / Parked Domain Mean?

In the control panel, you'll find sections called Addon Domains, Parked Domains, and Subdomains. This guide explains what each domain type means and when to use them.

## Subdomains

### What Is a Subdomain?

A subdomain is a domain that's part of another domain name. For example:
- If you own `example.com`, then `test.example.com` is a subdomain
- Similarly, `sub.test.example.com` is a subdomain of both `example.com` and `test.example.com`

### Using the Subdomains Section

The Subdomains section in your control panel allows you to:

1. **Create subdomains of existing domains:** If your account has `example.com`, you can create subdomains like `blog.example.com` and `shop.example.com`

2. **Add free subdomains:** You can add additional free subdomains like `example.znode.app` and `example.rf.gd` to your account

**Key point:** When you create any subdomain, a new directory is created on your account with its own `htdocs` folder. This allows you to upload a completely separate website to the subdomain.

---

## Addon Domains

### What Is an Addon Domain?

An Addon Domain is your own registered domain name (like `example.com` or `example.net`) that you add to your hosting account.

### How to Use Addon Domains

1. Register your domain with a domain provider (like Spaceship)
2. Point your domain's nameservers to your account's nameservers (found in your control panel)
3. Add the domain through the Addon Domains section

**Key point:** Like subdomains, addon domains get their own directory with a new `htdocs` folder, allowing you to host a separate, independent website.

---

## Parked Domains

### What Is a Parked Domain?

A Parked Domain is similar to an Addon Domain, but instead of creating a new website folder, you link it to an existing domain on your account.

### How Parked Domains Work

When you park a domain on another domain, both domains serve content from the **same directory**. This means:
- With a simple HTML website, both domains show identical content
- With complex CMS software, results may vary

### Important Considerations

**WordPress example:** WordPress always redirects visitors to the Website URL configured in settings. So if you park a domain on a WordPress site, visitors will be redirected to the original domain.

**Summary:** Parked Domains share the same website folder, but actual behavior depends on the content you're hosting.

---

## Quick Comparison

| Feature | Subdomain | Addon Domain | Parked Domain |
|---------|-----------|--------------|---------------|
| Creates new folder | ✅ Yes | ✅ Yes | ❌ No |
| Separate website | ✅ Yes | ✅ Yes | ❌ No (shares content) |
| Requires own domain | ❌ No | ✅ Yes | ✅ Yes |
| Requires nameserver setup | ❌ No (for free subdomains) | ✅ Yes | ✅ Yes |

---

## When to Use Each Type

| Use Case | Recommended Type |
|----------|-----------------|
| Testing or development site | Subdomain |
| Blog at `blog.yourdomain.com` | Subdomain |
| Completely new website on your own domain | Addon Domain |
| Multiple domains showing the same website | Parked Domain |
| Redirecting old domain to new domain | Parked Domain (with caveats) |
