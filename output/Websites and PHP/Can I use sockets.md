# Can I Use Sockets?

**Category:** Websites and PHP

---

Yes, you can use socket functions (`fsockopen()` and related) on any free hosting account. However, access is limited to prevent abuse.

## What's Available?

A small set of default ports are available for sockets. This means functions like SMTP, FTP, and requests to external websites work fine.

## What's Not Available?

More specialized ports, like game server ports, are not available. Additional ports cannot be opened upon request.

## Summary

| Feature | Availability |
|---------|--------------|
| SMTP connections | ✓ Available |
| FTP connections | ✓ Available |
| HTTP/HTTPS requests | ✓ Available |
| Game server ports | ✗ Not available |
| Custom ports | ✗ Not available |
