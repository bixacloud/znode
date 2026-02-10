# Can't Change Nameservers to Znode

When trying to point your domain to Znode's nameservers (`ns1.byet.org`, `ns2.byet.org`, etc.), your registrar might reject the change with error messages like:

- "DNS Query Refused"
- "ERROR: Answer must be authoritative"
- "The name server is not responsible for this domain"
- "Domain is not activated in the nameservers"

## Solutions

### Option 1: Use CNAME Verification (Recommended)

Instead of changing nameservers, verify your domain ownership by adding a CNAME record to your current DNS settings. This is often the easiest solution.

See: [How to add your domain with CNAME verification](How%20to%20add%20your%20domain%20with%20CNAME%20verification.md)

### Option 2: Switch to a Different Registrar

Some domain registrars are more flexible about nameserver changes. If your current registrar blocks the update, consider transferring your domain to a registrar that doesn't enforce these strict checks.

## Why Does This Happen?

This is a chicken-and-egg problem: the validation system wants to see DNS records before allowing the nameserver change, but we can't create DNS records until your domain is added to your hosting account.

### Two Levels of Validation

| Level | Description |
|-------|-------------|
| **Registry-level** | Enforced by the organization managing the domain extension (like `.de` or `.com.br`). Applies regardless of which registrar you use. |
| **Registrar-level** | Enforced by your specific domain provider. Varies between companies and is becoming less common. |

When your registrar or registry checks our nameservers for your domain's DNS records, they don't find any because we only create them after you successfully add the domain to your Znode account.

## Affected Domain Extensions

### Registry-Level Validation (Cannot Be Bypassed)

These domain extensions have strict rules built into the system:

- `.com.br`
- `.de`
- `.dk`
- `.hu`
- `.it`

For these extensions, **CNAME verification is your only option**.

### Registrar-Level Validation

This can potentially happen with any domain extension (`.com`, `.net`, `.org`, etc.) depending on your registrar's policies, but it's becoming less common.

## What Won't Work

**Waiting:** The error won't resolve on its own. We need your domain added to your account before we can create the DNS records.

## Summary

If you can't change your nameservers to Znode's servers, use the CNAME verification method instead. It's usually faster and easier than working around registrar or registry restrictions.
