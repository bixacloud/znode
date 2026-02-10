# How to Back Up Your Website

Good website administration requires making regular backups and storing them safely. You also need backups to migrate your website to other hosting accounts.

**Important:** Znode does not create or store any backups of free hosting accounts. It's your responsibility to create and store backups regularly.

---

## Backup Your Website Files

The best way to backup website files is using a desktop FTP client.

### Steps

1. Open an FTP connection to your account (see [How to upload files with FTP](How%20to%20upload%20files%20with%20FTP.md))
2. Find the `htdocs` folder of the website you're backing up
3. Download the `htdocs` folder to your computer

**In FileZilla:** Drag the `htdocs` directory from the right pane (server) to the left pane (your computer).

**Note:** Large websites may take a long time to download. Start the transfer and let it run in the background. If some transfers fail, retry them until all files are transferred successfully.

---

## Backup Your Databases

Download database backups through phpMyAdmin.

### Steps

1. Log in to your account's control panel
2. Click **phpMyAdmin**
3. Click **Connect Now** next to the database you want to download
4. Go to the **Export** tab
5. Click **Start**

---

## Important Notes

### About ZIP Files on the Server

Some file managers offer options to create/extract ZIP files "on the server."

**However:**
- FTP doesn't support managing archives on the target server
- File managers create/extract ZIPs on the file manager server, not your hosting
- Web-based file managers handle large archives poorly
- There's a 10 MB file size limit, so you may not be able to package your entire website

### About Backup Scripts and Plugins

Some CMS have built-in backup options or plugins. **We recommend against using them.**

**Problems with backup plugins:**
- They run extremely complex PHP code
- Frequently fail due to file size limits or PHP execution time limits
- Generate incomplete or corrupt backups
- Create high server load
- May create backups that can't be restored

**Always use FTP and phpMyAdmin for backups** - they're more reliable.

---

## Backup Checklist

| Component | Backup Method |
|-----------|---------------|
| Website files | FTP client download |
| Databases | phpMyAdmin Export |
| Configuration files | Included in FTP download |
| Uploads/Media | Included in FTP download |

---

## Best Practices

- Create backups regularly (weekly or before major changes)
- Store backups in multiple locations (local computer + cloud storage)
- Test your backups periodically by restoring to a test environment
- Document what each backup contains
