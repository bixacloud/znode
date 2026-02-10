# Why Isn't My Domain Working Yet?

You've just added your domain to Znode or changed your nameservers, but you're seeing a "DNS Resolution Error," an error message, or your old website instead of your new hosting account.

**Don't worry—this is completely normal.** It happens because of DNS caching.

---

## How Long Should I Wait?

| Typical Timeline | Maximum Time |
|------------------|--------------|
| Within 24 hours | Up to 72 hours |

Most domains start working within 24 hours. However, it can take up to 72 hours for your domain to work for everyone worldwide. This depends on factors outside of Znode's control, including your internet provider and location.

**Important:** Znode configures your domain immediately when you add it. The delay isn't on our end—it's because the internet's "phone book" (DNS) takes time to update everywhere.

---

## Why Does This Happen?

Think of DNS as the internet's phone book. When someone types your domain name, their computer looks up which server to connect to. To make websites load faster, computers and internet providers remember these lookups instead of checking every time.

When you change your nameservers or add your domain to Znode:
1. We update our records almost immediately
2. Computers and internet providers worldwide are still using their cached version
3. Eventually, cached records expire and everyone gets the updated information

That's when your domain starts working for everyone.

---

## What Can I Do Right Now?

These solutions only work on devices where you apply them. Other visitors still need to wait for their DNS cache to clear naturally.

### Clear Your Computer's DNS Cache

Your computer might be remembering the old location. Clearing the cache forces a fresh lookup.

| Operating System | Command |
|-----------------|---------|
| Windows | Open Command Prompt as admin, run `ipconfig /flushdns` |
| Mac | Open Terminal, run `sudo dscacheutil -flushcache` |
| Linux | Run `sudo systemctl restart systemd-resolved` |

### Use a Different DNS Server

Your internet provider's DNS servers might be slow to update. Switch to faster DNS servers:

| Provider | Primary | Secondary |
|----------|---------|-----------|
| Cloudflare | `1.1.1.1` | `1.0.0.1` |
| Google | `8.8.8.8` | `8.8.4.4` |
| OpenDNS | `208.67.222.222` | `208.67.220.220` |

### Edit Your Hosts File (Advanced)

If you're comfortable editing system files, you can tell your computer exactly where your domain should point by editing your hosts file. You'll need your account's IP address from the client area.

---

## Is Something Actually Wrong?

In most cases, nothing is wrong—you just need to wait. However, if it's been more than 72 hours, check these common issues:

### Troubleshooting Checklist

| Check | What to Look For |
|-------|------------------|
| **Nameservers** | Pointed to `ns1.byet.org`, `ns2.byet.org`, etc. |
| **Domain status** | Not expired or suspended by your registrar |
| **Account status** | Znode account is active and domain is properly added |

If everything looks correct but your domain still isn't working after 72 hours, contact support for help.

---

## The Bottom Line

Domain propagation is a normal part of how the internet works. Your website will start working automatically, usually within a few hours.

**Good news:** This only happens when you first set up your domain or make major DNS changes. Once everything is working, your visitors won't experience these delays for regular website updates.
