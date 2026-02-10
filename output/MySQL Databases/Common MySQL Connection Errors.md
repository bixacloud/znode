# Common MySQL Connection Errors

Many websites use MySQL databases, but sometimes connections fail. This article explains common error messages and provides troubleshooting tips.

---

## Common Error Messages

### "Unable to connect to database" / "Error connecting to database"

Your software can't establish a database connection but isn't showing the real reason.

**How to get more details:**

| Software | How to Enable Debug |
|----------|---------------------|
| WordPress | Enable `WP_DEBUG` in `wp-config.php` |
| MySQLi | Use `mysqli_error()` or `mysqli_connect_error()` |
| PDO | Catch `PDOException` |
| Any PHP | Enable "Display Errors" in control panel → Alter PHP Config |

### "No such file or directory"

You're using `localhost` as your database hostname. This doesn't work on Znode.

**Fix:** Use your actual database hostname (like `sql123.znode.app`) from the MySQL Databases section in your control panel.

### "Access denied for user"

Example: `Access denied for user 'znode_12345678'@'192.168.0.*' (using password: YES)`

This usually means:

1. **Wrong database name:** Your full database name looks like `znode_12345678_my_database`. Check MySQL Databases in your control panel for the exact name.

2. **Wrong password:** The database password is your hosting account password (different from your client area password). Find it in your client area → account → MySQL Details → Show Password.

---

## Troubleshooting Checklist

### ✅ Use Your Hosting Account Password

The most common issue. Your database password is your **hosting account password**, not your client area password.

**Find it:** Client area → click your account → MySQL Details → Show Password.

### ✅ Use the Correct Hostname (Not localhost)

Most hosting uses `localhost`. Znode doesn't.

**Find it:** Control panel → MySQL Databases.

### ✅ Use the Correct Database Name and Username

| What It Looks Like | Where to Find It |
|-------------------|------------------|
| Username: `znode_12345678` | MySQL Databases in Control Panel |
| Database: `znode_12345678_mydb` | MySQL Databases in Control Panel |

### ✅ Connect From Your Hosting Account

Znode databases are only accessible from within your hosting account. You cannot connect from:
- ❌ Developer tools on your computer
- ❌ Websites on other providers
- ❌ Game software
- ❌ Mobile apps

### ✅ Still Having Issues?

If you've verified everything above and still can't connect, ask for help on the community forum. Include the **full error message** from your database connection code.

---

## Quick Reference

| Setting | Where to Find It |
|---------|------------------|
| Database hostname | Control Panel → MySQL Databases |
| Database name | Control Panel → MySQL Databases |
| Database username | Control Panel → MySQL Databases |
| Database password | Client Area → Account → MySQL Details |
