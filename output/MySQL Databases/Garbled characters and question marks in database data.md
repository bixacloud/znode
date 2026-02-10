# Garbled Characters and Question Marks in Database Data

Are you coding your own website with PHP and MySQL? If you're seeing garbled characters or question marks when:
- Displaying data from phpMyAdmin on your website
- Viewing website-submitted data in phpMyAdmin

This article explains the cause and how to fix it.

---

## What You Might See

### Data Submitted Through phpMyAdmin

Appears as question marks on your website:
```
Input: Héllo Wörld
Output: H?llo W?rld
```

### Data Submitted Through Your Website

Appears garbled in phpMyAdmin:
```
Input: Héllo Wörld
Output: HÃ©llo WÃ¶rld
```

---

## What Causes This?

This issue relates to the **charset** of your MySQL database connection—how characters are converted to binary data for storage.

### The Problem

| Tool | Default Charset |
|------|-----------------|
| phpMyAdmin | `utf8mb4` |
| PHP on Znode | `latin1` |

`utf8mb4` and `latin1` are **not compatible**, causing character encoding issues.

---

## How to Fix It

Change the charset used in PHP to connect to your database. Set this for **every database connection on every page**.

### ⚠️ Important Warning

**Changing the charset will break data previously inserted through PHP.**

When you switch from `latin1` to `utf8mb4`, text will display as it appears in phpMyAdmin. Data inserted via PHP before the change will appear garbled.

**Recommendation:** Fix this early in development when you can safely discard invalid data and start over.

---

## Setting the Charset

### With MySQLi (Object-Oriented)

```php
$mysqli = new mysqli('sql999.znode.app', 'znode_12345678', 'password', 'znode_12345678_mydb');
$mysqli->set_charset('utf8mb4');

$result = $mysqli->query('SELECT * FROM my_table');
```

### With MySQLi (Procedural)

```php
$mysqli = mysqli_connect('sql999.znode.app', 'znode_12345678', 'password', 'znode_12345678_mydb');
mysqli_set_charset($mysqli, 'utf8mb4');

$result = mysqli_query($mysqli, 'SELECT * FROM my_table');
```

### With PDO

```php
$dsn = 'mysql:host=sql999.znode.app;dbname=znode_12345678_mydb;charset=utf8mb4';
$pdo = new PDO($dsn, 'znode_12345678', 'password');

$stmt = $pdo->query('SELECT * FROM my_table');
```

---

## Frequently Asked Questions

### Why Don't You Change This on the Servers?

Many existing websites don't set the charset and use the default `latin1`. Changing the server default would break all special characters in their databases.

We can't change it only for new accounts either.

### Why Don't You Change This in phpMyAdmin?

Most website software (including WordPress) already uses `utf8` or `utf8mb4`. Changing phpMyAdmin's default would impact most users' ability to manage their databases.

### Can't I Just Change the Database Collation?

No. Collation only affects how data is **compared and sorted**, not how it's **written or retrieved**.

You should choose a collation matching your charset for correct sorting, but you still need to set the charset for the connection.

---

## Summary

| Fix | How |
|-----|-----|
| MySQLi | Use `mysqli_set_charset()` or `$mysqli->set_charset()` |
| PDO | Add `charset=utf8mb4` to DSN |
| Apply to | Every database connection on every page |
