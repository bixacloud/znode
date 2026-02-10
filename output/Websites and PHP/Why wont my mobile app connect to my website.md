# Why Won't My Mobile App Connect to My Website?

**Category:** Websites and PHP

---

If you're trying to connect a mobile app to your Znode website and it's not working, this is likely due to our browser security system that's required on all free hosting accounts.

## What's Happening?

Znode uses a security system that requires JavaScript and cookies to access websites. This system works perfectly with mobile web browsers, but mobile apps typically can't execute JavaScript or store cookies the way browsers do.

When your app tries to connect, it gets blocked by the security system and usually receives a "403 Forbidden" error or a similar message.

## Which Apps Are Affected?

This affects any mobile app that tries to fetch content directly from your website, including:

- Custom apps you've developed that connect to your site
- WordPress mobile apps trying to connect to your WordPress site
- Social media apps trying to fetch content from your site
- Any app using APIs hosted on your Znode site

**Note:** Mobile web browsers work perfectly fine. Your website will load normally when visitors use Safari, Chrome, Firefox, or any other mobile browser.

## What Are My Options?

**Use mobile browsers instead:** Direct users to access your website through their mobile browser rather than through an app.

**Consider premium hosting:** Premium hosting doesn't have this security restriction, so mobile apps can connect normally.

**Redesign your app:** If possible, structure your app so it doesn't need to fetch data directly from your Znode site. You could use the app to open your website in the device's browser instead.

## Why Does This Security System Exist?

The security system protects your website from malicious bots and automated attacks. It also prevents bots from consuming your account's resource limits, which could cause your site to be suspended.

All major search engines can still access and index your website normally, so this doesn't affect your site's visibility.

## Need More Information?

Learn more about how this security system works and what other features it affects in our comprehensive guide to the Browser Security System.
