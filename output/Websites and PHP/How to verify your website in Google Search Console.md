# How to Verify Your Website in Google Search Console

**Category:** Websites and PHP

---

Google Search Console is a useful tool that helps you understand how Google crawls your website and allows you to manage how Google indexes your content.

To access this information, you need to sign up for Google Search Console and add your website.

## URL-Prefix Property vs. Domain Property

Google Search Console offers two ways to add a website: URL-prefix property or Domain property.

**Domain property** is the most powerful option. However, to verify your domain name as a Domain property, you need to set up a TXT record on your domain. This is not possible with Znode's nameservers. If you use third-party nameservers (like Cloudflare), you can use this option.

**URL-prefix property** works with Znode nameservers. It only requires website verification, which can be done on any domain or subdomain with any nameservers.

## Make Sure Your Website Base URL Is Consistent

If you have a domain name like `example.com` with SSL set up, all the following URLs will serve the same content:

- `http://example.com`
- `http://www.example.com`
- `https://example.com`
- `https://www.example.com`

To get accurate stats in Google Search Console (and improve your site's SEO), you should redirect all of these URLs to a single URL (either with or without HTTPS, and with or without www).

There are multiple ways to do this:
- If your website software has a "Website URL" option, configure it first. This may also fix the redirects automatically.
- You can use `.htaccess` rules to enforce redirects. Search the web for example snippets.

## Adding Your Website to Google Search Console

To add your website as a URL-prefix property:

1. Go to [Google Search Console](https://search.google.com/search-console) and sign in with your Google account.
2. Click **"Add property"** and choose **"URL prefix"**.
3. Enter your website's base URL, including `http://` or `https://` and optionally the `www` subdomain.
4. Choose the **HTML file** verification method.
5. Download the HTML file to your computer.
6. Open a file manager or FTP client connected to your hosting account.
7. Navigate to your website folder and upload the HTML file to the `htdocs` folder.
8. Click **"Verify"** to complete the verification.

That's all you need to do to verify your domain name!
