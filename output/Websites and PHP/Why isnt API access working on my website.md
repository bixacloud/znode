# Why Isn't API Access Working on My Website?

**Category:** Websites and PHP

---

If you're trying to use APIs on your Znode website and they're not working, this is due to our browser security system that's required on all free hosting accounts.

## What's Happening?

Znode uses a security system that requires JavaScript and cookies to access websites. APIs and automated tools typically can't execute JavaScript or store cookies, so they get blocked by the security system.

When API clients try to connect, they usually receive a "403 Forbidden" error or an HTML response saying "This site requires Javascript to work."

## Which APIs Are Affected?

This affects any type of programmatic access to your website, including:

- REST API endpoints hosted on your site
- WordPress XML-RPC (used by many WordPress tools and plugins)
- Third-party services trying to connect to your APIs
- Webhook endpoints that external services try to call
- Command-line tools like cURL trying to access your site

## What Are My Options?

**Use premium hosting:** Our premium hosting doesn't have this security restriction, so APIs work normally.

**Use a different service:** Znode is designed for hosting websites, not APIs. If you need API hosting, consider using a service better suited for that purpose.

**Make outbound requests instead:** Your website can make API requests to external servers. Only inbound API requests to your site are blocked.

**Use webhooks in reverse:** Instead of external services calling your site, have your site periodically check external services or databases for updates.

**Use a web browser:** If you need to trigger actions on your website, you can do so through a regular web browser instead of automated scripts.

## Why Does This Security System Exist?

The security system protects your website from malicious bots and automated attacks. It also prevents bots from consuming your account's resource limits, which could cause your site to be suspended.

This is especially important on free hosting where resource limits are quite low.

## Need More Information?

Learn more about how this security system works and what other features it affects in our comprehensive guide to the Browser Security System.
