# WordPress Site Health Warnings on Free Hosting

WordPress includes a Site Health tool that checks your website's configuration and reports potential issues. You can find it under **Tools → Site Health** in your WordPress admin area.

**Don't worry if you see multiple warnings on Znode.** Most are completely normal and expected on free hosting. Your website works perfectly fine for visitors despite these alerts.

---

## What Should I Do About These Warnings?

### Ignore Warnings If:
- Your website loads normally
- Images upload and display correctly
- Plugins work as expected
- Visitors can interact with your site

### Take Action Only If:
- Visitors report actual errors
- Specific features stop working
- You're building something requiring advanced server features

---

## Warnings You Can Safely Ignore

### "The optional module, imagick, is not installed"

WordPress prefers imagick for advanced image editing, but it's not available on free hosting due to resource and security considerations.

**What happens instead:** WordPress automatically uses the GD extension, which handles all basic image needs like resizing photos. Unless you need very specific advanced image manipulation, you won't notice any difference.

### "Your site could not complete a loopback request"

Znode uses security systems that block automated connections—including WordPress connecting back to itself for testing.

**Related warning:** "The REST API encountered an unexpected result"

**What this means:** WordPress can't test certain features automatically, but those features still work for actual visitors.

### "Unable to detect the presence of page cache"

This appears for the same reason—WordPress can't connect back to itself to check caching.

**If you have caching plugins:** They're working fine even though WordPress can't detect them.

**Recommended caching plugins:**
- W3 Total Cache
- WP Super Cache

Choose plugins that use **file-based caching**. Free hosting doesn't include server-level caching (LiteSpeed, Varnish), so avoid plugins requiring those.

---

## Warning You Should Address

### "Your website does not use HTTPS"

Unlike other warnings, **you should fix this one**. HTTPS is important for:
- Security
- User trust
- Search engine rankings

**Solution:** Znode provides free SSL certificates, but you need to set them up manually. Check the forum for instructions: "How to get free SSL/HTTPS on Znode"

---

## When Do These Warnings Actually Matter?

These limitations work fine for the vast majority of WordPress sites. They only become real problems if you're building:
- Applications requiring advanced image processing
- Automated testing workflows
- Applications that need to connect back to themselves

For typical websites, blogs, stores, and business sites—free hosting provides everything you need.

---

## Summary

| Warning | Action |
|---------|--------|
| imagick not installed | Ignore (GD works fine) |
| Loopback request failed | Ignore (features still work) |
| REST API unexpected result | Ignore (works for visitors) |
| Page cache not detected | Ignore (caching plugins still work) |
| **HTTPS not enabled** | **Set up SSL certificate** |

Most Site Health warnings are informational and don't affect your visitors' experience. These limitations help us provide stable free hosting to everyone.
