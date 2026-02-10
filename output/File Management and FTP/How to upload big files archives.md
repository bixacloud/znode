# How to Upload Big Files / Archives

Znode has a file size limit of 10 MB on all servers. You cannot upload files larger than 10 MB directly.

---

## Installing Large Scripts

If a software package is larger than 10 MB, you cannot upload the archive directly and extract it on the server. However, you can easily upload the contents manually.

### Steps

1. **Download the software** to your computer
2. **Extract the archive** on your computer (this creates a folder with all files)
3. **Set up an FTP connection** (see [How to upload files with FTP](How%20to%20upload%20files%20with%20FTP.md))
4. **Navigate to the extracted folder** on your computer in your FTP client
5. **Select all files and folders** in that directory
6. **Upload them to the correct folder** on your account (usually `htdocs`)

**Upload time:** Depending on script size and internet speed, this can take minutes to hours. This is the most reliable way to upload larger software.

---

## Installing Large Themes or Plugins

Many scripts with plugin systems offer web-based uploaders, but they may fail for large addons.

### Manual Upload Method

Most addons can be uploaded manually via FTP:

1. **Extract the downloaded plugin/theme** on your computer
2. **Set up an FTP connection**
3. **Navigate to the correct folder** on your account:
   - WordPress plugins: `wp-content/plugins/`
   - WordPress themes: `wp-content/themes/`
4. **Upload the extracted folder**
5. **Activate from the admin area** after upload completes

**Important:** Downloaded packages often contain documentation and examples alongside the actual plugin/theme. Make sure you upload the correct folder—otherwise your script won't recognize the addon.

---

## Uploading Large Files for Download

If you want to offer large downloadable files on your website, you cannot upload them directly if they exceed 10 MB.

### Solution: Use File Sharing Services

Upload large files to specialized services and share links on your website:

| Service Type | Examples |
|--------------|----------|
| File sharing | Dropbox, Google Drive, Mediafire |
| Video hosting | YouTube, Vimeo |
| Image hosting | Imgur, Google Photos |

These services offer much higher file size limits and are designed for file distribution.

---

## Summary

| Scenario | Solution |
|----------|----------|
| Large script installation | Extract locally, upload via FTP |
| Large plugins/themes | Upload manually to correct folder |
| Large downloadable files | Use external file sharing services |
| Large media files | Use specialized hosting services |
