# Why Your Domain Redirects to suspended-domain.net

Sometimes your domain may redirect to `suspended-domain.net` instead of showing your website. Despite what the domain name implies, there are various reasons why this happens.

**In short:** This occurs when your browser connects to a website IP address, but there's no active website for your domain on that IP address.

## Expected Timeline for Fixes

| Fix Type | Timeline |
|----------|----------|
| Account reactivation | A few minutes to a few hours |
| DNS changes | 1-6 hours for most visitors, up to 72 hours for everyone |
| Cache clearing | Immediate to 24 hours |

During the first few hours after making changes, some visitors may still see the redirect while others see your website normally. This is completely normal and will resolve itself.

---

## Common Causes and Solutions

### 1. Your Account Is Suspended

If your account is suspended, all domains on that account will redirect to `suspended-domain.net`.

**How to fix:** Check your email for suspension notices or contact support. Once your account is reactivated, the redirects will be removed automatically.

---

### 2. You're Moving the Domain to Another Hosting Provider

If you've set up an account with a new provider, updated your nameservers, and removed the domain from Znode, you may still see the redirect.

**Why:** DNS changes can take up to 72 hours to propagate worldwide. During this time, some visitors still connect to our servers, but since you've removed the domain, they see the `suspended-domain.net` page.

#### The Smart Way to Migrate

Before removing your domain from Znode:

1. Set up your website completely on the new hosting provider
2. Test everything using a temporary URL
3. Update your nameservers
4. **Keep your Znode account active for 3-5 days** after changing nameservers

This ensures visitors always see a working website during the transition.

#### If You've Already Removed the Domain

Unfortunately, you cannot force everyone to connect to your new provider immediately. DNS caching is controlled by networks worldwide.

**Options:**
- **Re-add the domain temporarily:** Add it back to your original Znode account, create a "Website Moved" page, and keep it active for 3-5 days
- **Wait it out:** Most visitors will see your new site within 6-24 hours; all visitors within 72 hours

---

### 3. You're Moving the Domain to Another Znode Account

Moving a domain between Znode accounts causes the same DNS propagation delays.

**The challenge:** Since you cannot host a domain on multiple Znode accounts simultaneously, you cannot keep a temporary page on the old account.

**Options:**
- Wait for DNS propagation (1-72 hours)
- Plan the move during low-traffic periods
- Communicate with your audience about potential brief downtime

---

### 4. You're Using Custom Nameservers

If you're using your own nameservers (like Cloudflare), two configuration errors can cause this redirect:

#### Error 1: Domain Not Assigned to a Hosting Account

Even with custom nameservers, you **must** add the domain to a Znode hosting account through the control panel.

**Why:** Custom nameservers can point your domain to our IP address, but our servers need to know which account and directory should handle requests for your domain.

**How to fix:**
1. Add the domain to your Znode account (you may need to temporarily use our nameservers for verification)
2. Switch back to your custom nameservers
3. Ensure your DNS records point to the correct IP address

#### Error 2: Wrong IP Address in DNS Records

Your custom nameservers must point to the exact IP address of the Znode account where you added the domain.

**How to check:**
1. Find your account's IP address in the Znode control panel
2. Compare it with the A record in your custom nameservers
3. Update the A record if they don't match

---

### 5. Browser or DNS Cache Issues

Sometimes your browser, computer, or internet provider caches the old redirect even after you've fixed the underlying issue.

#### Quick Fixes

1. **Clear browser cache and cookies**
2. **Try incognito/private browsing mode**
3. **Test on a different device or network** (like mobile data)
4. **Clear your computer's DNS cache:**

| Operating System | Command |
|-----------------|---------|
| Windows | `ipconfig /flushdns` (run as admin) |
| Mac | `sudo dscacheutil -flushcache` |
| Linux | `sudo systemctl restart systemd-resolved` |

**Still not working?** Wait 24-72 hours. DNS changes can take this long to reach everyone worldwide.

---

## Best Practices for Domain Management

### When Planning to Migrate

- Set up and test your new hosting completely before changing anything
- Change nameservers during low-traffic hours
- Keep your old hosting active for 3-5 days after the nameserver change
- Inform your audience about potential brief accessibility issues

### When Managing Multiple Accounts

- Document which domains are on which accounts
- Never add the same domain to multiple accounts simultaneously
- Only remove domains from the old account after confirming they work on the new one

### For Custom DNS Setups

- Always add domains to your hosting account first
- Double-check IP addresses match between your DNS provider and hosting account
- Use a DNS checker tool to verify your records before going live

---

## Still Having Issues?

Most redirect problems resolve within 72 hours. If your domain is still redirecting after this time and you've verified the steps above, contact Znode support with details about which solution you tried and when you made the changes.
