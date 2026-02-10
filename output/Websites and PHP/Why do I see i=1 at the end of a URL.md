# Why Do I See ?i=1 at the End of a URL?

**Category:** Websites and PHP

---

Don't worry—this is completely normal! When you visit your website, you might notice `?i=1` appended to the end of your URL. Here's what's happening and why.

## What Is the ?i=1 Suffix?

The `?i=1` parameter is part of a security check that protects your website from bots and malicious traffic. Our system needs to verify that you're using a real web browser before granting access to your site.

## Why Does It Appear?

When you first visit your website, our security system:

1. Sends a small test to your browser
2. Checks if your browser can store a cookie
3. Adds a number to track how many verification attempts have been made

The page reloads with `?i=1` while this verification occurs. If the first attempt doesn't succeed, you might see `?i=2` or `?i=3` as the system retries.

## What Should I Do?

In most cases, you don't need to do anything. Once the security check completes successfully, the `?i=1` parameter won't appear on subsequent page visits.

If the parameter keeps appearing or you see higher numbers like `?i=3`, make sure cookies are enabled in your browser. After several failed attempts, you'll be redirected to a page with instructions on enabling cookies.

## Can I Remove It?

This security feature is built into our free hosting to keep your site safe and cannot be disabled. The URL parameter is temporary and won't affect your website's functionality.

**Note:** Premium hosting uses different security methods that don't require this URL parameter.

## Common Questions

**Will this hurt my SEO?**  
No, search engines understand that temporary parameters like this are part of security systems.

**Do all my visitors see this?**  
Most visitors will only see it briefly during their first visit, if at all.

**Having other issues?**  
This security check occasionally causes compatibility issues with certain tools and applications. If you're experiencing problems beyond just seeing the URL parameter, read our comprehensive guide to the Browser Security System.
