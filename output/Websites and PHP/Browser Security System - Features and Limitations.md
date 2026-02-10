# Browser Security System - Features and Limitations

**Category:** Websites and PHP

---

Znode uses a security system on all free hosting accounts to ensure your website is accessed by real web browsers, not bots or automated scripts. While this protects your site from malicious traffic, it can affect certain types of access.

## How the Security System Works

The system verifies that visitors can execute JavaScript and accept cookies—features that all modern web browsers support. This verification happens automatically, and most website visitors will never notice it.

You may occasionally see `?i=1` or similar parameters in your URL during this check. This is completely normal. [Learn more about URL parameters](#).

## What Doesn't Work with This Security System

Because the system requires JavaScript and cookies, these types of access won't work:

### Mobile and Desktop Apps
- Android or iOS mobile apps cannot connect to your website
- Desktop applications that try to fetch content from your site
- Progressive Web Apps (PWAs)

**Note:** Mobile web browsers work perfectly fine.

### API and Automated Access
- REST APIs, WordPress XML-RPC, and similar services
- Command-line tools like cURL or wget
- Automated scripts and bots
- Webhooks from external services

### Development and Validation Tools
- Website validators and SEO checking tools
- Domain verification systems used by some ad networks and webmaster tools

### Cross-Site Requests
- AJAX requests from other domains (CORS)
- Embedding images or files from your site on other websites (hotlinking)

## What Still Works Normally

The security system only affects access to your website from external sources. These features work perfectly fine:

### Outbound Requests from Your Site
- Your website's code can make API calls to external services
- Server-side scripts can fetch data from other websites
- External database connections work normally

### Same-Domain JavaScript Requests
- AJAX calls within your own website work fine
- Single Page Applications (SPAs) can call APIs on the same domain
- JavaScript can fetch data from your own site's endpoints

**Key principle:** Anything accessed through a real web browser, or outbound connections from your site, will work as expected.

## Common Error Messages

When incompatible tools try to access your site, you might see:

| Error | Meaning |
|-------|---------|
| 403 Forbidden | The most common error for blocked requests |
| "This site requires Javascript to work" | JavaScript is disabled or unavailable |
| "No 'Access-Control-Allow-Origin' header" | Cross-domain requests are blocked |

## Benefits of This System

**Protection from malicious bots:** The system blocks automated attacks, login attempts, and spam bots that could compromise your site or consume server resources.

**Prevents resource overuse:** Malicious bots can quickly consume your account's resource limits, potentially causing your website to be suspended. This security system helps ensure your resources are available for legitimate visitors.

**Search engine compatibility:** All major search engines (Google, Bing, etc.) support JavaScript and cookies, so your site will be indexed normally. Some validator tools may report issues, but actual search engine crawlers work fine.

## Can I Disable This System?

No, this security system is mandatory on all free hosting accounts and cannot be disabled.

If your website or application needs the blocked features, consider premium hosting. Premium hosting protects your site using less restrictive methods, allowing mobile apps, APIs, and automated tools to work normally.

## Related Articles

- [Why won't my mobile app connect to my website?](#)
- [Why isn't API access working on my website?](#)
- [Why do I see ?i=1 at the end of a URL?](#)
