# Why Are My Files Deleted After Uploading Them?

Sometimes when you upload a file, the upload completes but the file is deleted immediately afterward. This is usually caused by one of the following issues.

---

## 1. The File Is Not in a htdocs Folder

All website files must be uploaded to either:
- The main `htdocs` folder
- A domain-specific `htdocs` folder (like `example.com/htdocs`)

**You cannot upload files to other directories.** Files uploaded anywhere else are automatically deleted.

---

## 2. The File Type Is Not Allowed

Certain file types are blocked on Znode for security and fair usage reasons:
- `.exe` files
- `.apk` files
- Other non-web files

**Allowed:** Regular website files (HTML, CSS, JS, PHP, images, etc.)

**Solution:** For downloadable files or videos, use specialized file sharing services or video streaming services instead.

---

## 3. The File Contains Malware

Uploaded files are automatically scanned for malware. If malware is detected, the file is immediately deleted to protect your website and visitors.

---

## 4. The File Exceeds the Size Limit

Znode has file size limits:

| File Type | Maximum Size |
|-----------|--------------|
| HTML, PHP, JS files | 1 MB |
| `.htaccess` files | 10 KB |
| All other files | 10 MB |

**Important:** This is a file size limit, not just a PHP upload limit. All files are subject to this limit, regardless of how you upload them.

---

## How to Make Files Smaller

### HTML and PHP Files

- **Move CSS and JavaScript to separate files** and link them from your page (also improves caching)
- **Move large data to databases** (MySQL or SQLite) that can be queried from PHP
- **Split PHP code into multiple files** using `include` or `require` directives
- **Split HTML across multiple pages** for better user experience and bandwidth usage

### Other Files

- **Large archives (.zip, .rar):** See [How to upload big files/archives](How%20to%20upload%20big%20files%20archives.md)
- **Text files:** Split across separate files; join them with PHP if needed
- **Media files:** Use different encoding or stronger compression, or use specialized hosting services (YouTube, photo hosts, etc.)

### .htaccess Files

Large `.htaccess` files negatively impact server performance. Common reasons for large files and their solutions:

#### Blocking Bad Bots with User Agent Filters

**Problem:** User agent filtering has limited effectiveness because:
- Bots can fake user agents
- Free hosting already has security systems to block bots

**Solution:** Remove these rules; your site is already protected more effectively.

#### Country-Based IP Restrictions

**Problem:** IP-based country restrictions are inherently flawed—IP ranges don't reliably map to countries.

**Solution:** 
- Move IP filtering to PHP code
- Use a GeoIP service for more accurate location data
- PHP allows better customization of blocked user experience

#### Complex Rewrite Rules

**Problem:** Large sets of `RewriteRule` directives for URL routing.

**Solution:** Most frameworks handle routing in PHP. Redirect all requests to a single `index.php` that handles URL routing.

---

## Summary

| Reason | Solution |
|--------|----------|
| Wrong location | Upload to `htdocs` folder only |
| Blocked file type | Use external services for downloads/videos |
| Malware detected | Clean your files before uploading |
| File too large | Reduce size or split into smaller files |
