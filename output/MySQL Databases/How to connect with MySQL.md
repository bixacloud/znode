# How to Connect with MySQL

Both PDO and MySQLi libraries are available on all accounts and PHP versions. However, you need to configure a few things before using a database.

---

## Step 1: Create a Database

Before using a database, create one through your control panel:

1. Go to **MySQL Databases**
2. Enter a name in the text box
3. Click **Create Database**

---

## Step 2: Find Your Connection Details

Your database connection requires four parameters:

| Parameter | Where to Find It |
|-----------|------------------|
| Database name | MySQL Databases → Current Databases |
| Database username | MySQL Databases → Current Databases |
| Database hostname | MySQL Databases → Current Databases |
| Database password | Same as your control panel/FTP password |

**Finding your password:** If you don't remember it, reset it through your client area.

---

## Important Notes

### Don't Use "localhost"

Many scripts default to `localhost` for the database hostname. **This won't work on Znode.**

Use the exact hostname listed under Current Databases (e.g., `sql123.znode.app`).

### No External Connections

You **cannot** connect to free hosting databases from outside the hosting platform. This means:

- ❌ Desktop applications
- ❌ Mobile apps
- ❌ Applications hosted elsewhere
- ❌ Direct external connections

You can only access databases through:
- ✅ PHP scripts on your hosting account
- ✅ phpMyAdmin

---

## Example Connection (MySQLi)

```php
$mysqli = new mysqli(
    'sql123.znode.app',       // Hostname
    'znode_12345678',         // Username
    'your_password',          // Password
    'znode_12345678_mydb'     // Database name
);

if ($mysqli->connect_error) {
    die('Connection failed: ' . $mysqli->connect_error);
}
```

---

## Example Connection (PDO)

```php
$dsn = 'mysql:host=sql123.znode.app;dbname=znode_12345678_mydb;charset=utf8mb4';
$pdo = new PDO($dsn, 'znode_12345678', 'your_password');
```
