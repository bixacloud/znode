# How to Import a MySQL Database Backup

If you're moving your website from another hosting provider or need to restore a backup, you may need to import a MySQL dump file.

---

## Before You Start

1. **Create a new database** in your control panel
2. **Configure your script** to use the new database

---

## Import Steps

1. Log in to the control panel
2. Go to **phpMyAdmin**
3. Find your new database and click **Connect Now**
4. Click **Import** in the top bar
5. Select your database backup file
6. Click **Go**

---

## Uploading Large Backups

phpMyAdmin has upload size and time limits. Large database imports may fail.

### Solution: Use BigDump

[BigDump](https://www.ozerov.de/bigdump/) is a tool that:
- Splits large database exports into smaller batches
- Uploads them separately
- Works within server time limits

### How to Use BigDump

1. Download BigDump
2. Configure it with your database credentials
3. Upload BigDump and your SQL file to your hosting account
4. Access BigDump through your browser
5. Follow the on-screen instructions

---

## File Size Guidelines

| Backup Size | Recommended Method |
|-------------|-------------------|
| Under 50 MB | phpMyAdmin direct import |
| Over 50 MB | Use BigDump |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| File too large | Use BigDump |
| Timeout during import | Use BigDump |
| Syntax error | Check backup file compatibility |
| Access denied | Verify database credentials |
