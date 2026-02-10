# Redirected to Znode 404 Error Page

**Category:** Websites and PHP

---

When working on your website, you may be redirected to the Znode 404 error page. This article explains why this happens and how to fix it.

## Why Do I Get a 404 Error?

When you access a file on a website, the server tries to find the matching file to load.

For example, if you have a website at `http://example.com` linked to the `htdocs` folder, and you try to access `http://example.com/blog/images/photo.jpg`, the server will look for `htdocs/blog/images/photo.jpg`.

If any folder in this path doesn't exist, or there's no file with that name, the server responds with a **404 Page Not Found** error.

**Note:** The way files are loaded can be customized with `.htaccess` rules using `RewriteRule` directives.

## How to Fix 404 Errors

### 1. Check the Home Directory of Your Domain

In the **Domains** page of your account in the client area, you can find which folders your domains are linked to.

Make sure:
- The domain folder actually exists on your account.
- Your website files are uploaded to that directory.

### 2. Make Sure Files Are Actually There

If you're uploading a website built elsewhere (on your computer or another hosting service), make sure you've uploaded all files and folders.

The most reliable way to upload an entire website is using an FTP client like FileZilla. See [How to upload files with FTP](#) for more information.

### 3. Remember: Servers Are Case-Sensitive

Znode servers run on Linux, where file names are **case-sensitive**. This is different from Windows and macOS, where file names are case-insensitive.

**Example:** If you're developing on Windows, a URL like `http://example.com/background.jpg` might work with a file called `BackGround.JPG`. But on the hosting server, this URL will return a 404 error.

**Tip:** Be consistent with capitalization. Using only lowercase letters for file and folder names is a good practice.

### 4. Don't Include "htdocs" in Your URLs

The base of your website is linked to a `htdocs` folder, but **"htdocs" should NOT appear in your URLs**.

| File Path | URL |
|-----------|-----|
| `htdocs/about.html` | `http://example.com/about.html` |
| `htdocs/images/logo.png` | `http://example.com/images/logo.png` |

### 5. Understand How URLs Work

There are different ways to specify URLs:

| URL Type | Example |
|----------|---------|
| Absolute URL | `http://example.com/images/logo.png` |
| Protocol-relative | `//example.com/images/logo.png` |
| Root-relative | `/images/logo.png` |
| Relative | `images/logo.png` |

Each type works differently. Make sure you understand which method you're using.

### 6. Check .htaccess Rules

`.htaccess` rules can customize how URLs are mapped to files. While powerful, bad rules can cause 404 errors.

Try temporarily disabling your `.htaccess` rewrite rules to see if they're causing the problem.

## Why Do I Get a CORS Error on the 404 Page?

If you see errors like this in your browser console:

```
Access to XMLHttpRequest at 'https://znode.net/errors/404/' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The error implies you need to add an `Access-Control-Allow-Origin` header—**but this is not the solution**.

The root cause is that one of the URLs in your website returns a 404 error. Find and fix the URL that's causing the 404, and the CORS error will disappear.
