# How to Upload Files with FTP

The best and most reliable way to upload files is using FTP. You'll need:

- Your FTP username
- Your FTP password
- The FTP hostname
- An FTP client

**Find your credentials:** Go to the client area → **FTP Details** section. The FTP password is the same as your hosting account and control panel password (different from your client area password).

This guide uses FileZilla, a popular free FTP client available for most operating systems.

---

## Setting Up the Connection

1. Open FileZilla
2. Go to **File** → **Site Manager**
3. Click **New Site**
4. Configure the settings:

| Setting | Value |
|---------|-------|
| Host | `ftpupload.net` |
| Logon Type | Normal |
| User | Your username (e.g., `znode_12345678`) |
| Password | Your password |

5. Click **OK**

**Tip:** You can rename the site from "New Site" to something meaningful like your domain name for easier identification.

---

## Transferring Files

1. Open FileZilla
2. Go to **File** → **Site Manager**
3. Select your site under **Select Entry**
4. Click **Connect**

You'll see:
- **Left pane:** Files on your computer
- **Right pane:** Files on your hosting account

### Uploading Files

Drag files from the left pane to the right pane.

### Downloading Files

Drag files from the right pane to the left pane.

### Important: Upload to the Correct Location

| Domain Type | Upload Location |
|-------------|-----------------|
| First/main domain | `/htdocs` |
| Subdomains | `/example.znode.app/htdocs` |
| Addon domains | `/example.com/htdocs` |

---

## Removing Files

1. Right-click the files/directories you want to remove
2. Select **Delete**

---

## Changing File/Directory Permissions

1. Right-click the file/directory
2. Select **File Permissions…**
3. Set permissions using checkboxes
4. Click **OK**

**Warning:** Never go below 600 for permissions, or you won't be able to modify the file yourself.

---

## Quick Reference

| Task | How To |
|------|--------|
| Connect | Site Manager → Select site → Connect |
| Upload | Drag from left to right |
| Download | Drag from right to left |
| Delete | Right-click → Delete |
| Change permissions | Right-click → File Permissions |

---

## Common Permission Values

| Value | Meaning | Use For |
|-------|---------|---------|
| 644 | Owner read/write, others read | Most files |
| 755 | Owner all, others read/execute | Directories, scripts |
| 600 | Owner read/write only | Sensitive config files |
