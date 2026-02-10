# FTP Error: Disk Quota Exceeded

If your account has many files or large files, you may encounter the "Disk Quota Exceeded" error.

---

## Causes

This error is typically caused by one of two issues:

| Limit | Maximum | How to Check |
|-------|---------|--------------|
| Disk space | 5 GB | Control panel sidebar |
| Inodes (files + folders) | 60,000 | Control panel sidebar |

**Note:** The counters in the control panel are not live—they're refreshed once per day.

---

## What Is the Inode Limit?

In Linux file systems, every file and directory is an "inode." Having too many inodes slows down file reading and writing, which makes websites slower.

That's why free hosting accounts have an inode limit.

---

## How to Reduce Inode Usage

To decrease your inode usage, delete files and directories from your account:

- Scripts you don't use anymore
- Temporary files
- Content that isn't necessary for your website

**Note:** The inode counter isn't updated immediately after deleting content. It should update within a few hours.

---

## Need More Space?

If you've deleted everything you can and still need more space, consider upgrading to premium hosting. Premium accounts have much higher disk space and inode limits.

---

## Quick Tips

| Issue | Solution |
|-------|----------|
| Too many files | Delete unused plugins, themes, temporary files |
| Files too large | Compress images, use external hosting for media |
| Cache files accumulating | Clear cache regularly, configure cache limits |
| Old backups | Delete old backup files from the server |
