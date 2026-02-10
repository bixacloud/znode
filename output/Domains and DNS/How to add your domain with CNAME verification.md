# How to Add Your Domain with CNAME Verification

If you want to host your own domain name with Znode, the default method is to set the nameservers first. However, there are situations where changing nameservers beforehand isn't ideal—for example, if you have an existing site that can't experience downtime, or if your domain provider doesn't allow you to use our nameservers.

Fortunately, Znode supports adding your domain without changing nameservers first! This guide explains how to set this up.

## Step-by-Step Instructions

### Step 1: Attempt to Add the Domain

First, try adding your domain without any CNAME record configured. This will fail, but the error message will provide the CNAME record details you need.

For example, if you're adding `example.com`, you might see:

| Subdomain | Value |
|-----------|-------|
| `51f7aafae58a2ffa5f183c754a2c49c0.example.com` | `ns1.byet.org` |

### Step 2: Add the CNAME Record

Configure the CNAME record with your current DNS provider (the company whose nameservers your domain is currently using). This could be your previous hosting provider, domain registrar, or any other DNS service you've configured.

**Note:** If you're unsure which nameservers are active, check your domain registrar's settings.

Example CNAME record setup:

| Type | Host | Value |
|------|------|-------|
| CNAME | `51f7aafae58a2ffa5f183c754a2c49c0` | `ns1.byet.org` |

### Step 3: Wait for DNS Propagation

After adding the CNAME record, wait for it to take effect. This typically takes 30 minutes to 24 hours.

You can verify your CNAME record using tools like [Google's Dig tool](https://toolbox.googleapps.com/apps/dig/). The lookup should show the CNAME record pointing to `ns1.byet.org`.

### Step 4: Add the Domain Again

Once the CNAME record has propagated, return to the client area or control panel and add your domain name again.

If the CNAME record is detected correctly, your domain will be successfully added to your account!

### Step 5: Point Your Domain to Your Hosting Account

The domain is now added, but you still need to configure DNS settings to make your website accessible. You have two options:

1. **Change nameservers:** Point your domain to Znode's nameservers. See: [How to point your domain name to Znode nameservers](How%20to%20point%20your%20domain%20name%20to%20Znode%20nameservers.md)

2. **Update DNS records:** Keep your current DNS provider and add the appropriate A and CNAME records. See: [How to point your domain to Znode from other nameservers](How%20to%20point%20your%20domain%20to%20Znode%20from%20other%20nameservers.md)

## Current Limitations

CNAME verification can only be used when adding a domain to an **existing** account.

This means:
- You cannot use CNAME verification while creating a new account
- To create a new account with a domain requiring CNAME verification, first create the account with a free subdomain, then add your own domain afterward
