# What Is the File/Upload Size Limit?

All Znode servers have a **file size limit of 10 MB**.

**Important:** This is a **file size limit**, not just an upload limit.

---

## What's the Difference?

| Type | Description |
|------|-------------|
| Upload limit | Set through PHP settings, can sometimes be adjusted |
| File size limit | Enforced at the file system level, cannot be overridden |

The 10 MB limit:
- Cannot be changed through any PHP configuration
- Applies to files uploaded via FTP or file manager
- Applies to all files, regardless of upload method

---

## Can the Limit Be Increased?

**No.** The size limit is fixed and cannot be increased in any way.

10 MB is sufficient for regular website files:
- Scripts
- Images
- Style sheets
- PHP files
- Configuration files

---

## Working Around the Limit

| Scenario | Solution |
|----------|----------|
| Large scripts, plugins, or themes | Extract on your computer, upload via FTP |
| Large downloadable files | Use file sharing services (Google Drive, Dropbox) |
| Video files | Use video hosting services (YouTube, Vimeo) |
| Large media galleries | Use image hosting services or CDNs |

See: [How to upload big files/archives](How%20to%20upload%20big%20files%20archives.md)

---

## File Type Specific Limits

| File Type | Maximum Size |
|-----------|--------------|
| HTML, PHP, JS | 1 MB |
| .htaccess | 10 KB |
| All other files | 10 MB |
