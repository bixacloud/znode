# I Can't Ping My Website! Is the Server Down?

**Category:** Websites and PHP

---

If you try to ping your website or any Znode server, you'll see the ping fail with 100% packet loss. **This is completely normal and doesn't mean your website is down.**

On Windows, you'll see output like this:

```
> ping example.com
Pinging example.com [185.27.134.XX] with 32 bytes of data:
Request timed out.
Request timed out.
Request timed out.
Request timed out.

Ping statistics for 185.27.134.XX:
    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)
```

## What Should I Do Instead?

The best way to check if your website is working is simply to **visit it in your browser**. If your website loads normally, everything is fine regardless of what ping shows.

You can also use online tools like [downforeveryoneorjustme.com](https://downforeveryoneorjustme.com) to check if your site is accessible from different locations.

## Why Doesn't Ping Work on Znode?

Znode servers are configured with firewalls that **block ping traffic for security reasons** and to prevent exposing network details. The servers deliberately don't respond to ping requests, even when your website is running perfectly.

This is actually common practice among web hosting providers. Blocking ping traffic helps protect against certain types of network attacks while having no impact on your website's actual functionality.

## Summary

| Situation | What It Means |
|-----------|---------------|
| Ping fails with 100% packet loss | Normal—ping is blocked by firewall |
| Website loads in browser | Your site is working fine |
| Website doesn't load in browser | There may be an actual issue |

**Bottom line:** Ping failure on Znode hosting is normal and expected. Focus on whether your website actually loads in a browser rather than relying on ping results.
