# How to Avoid SQL Injection Attacks

SQL injection is a common vulnerability that new PHP developers accidentally create. It can be extremely dangerous, allowing hackers to read, modify, or delete your entire database. This article explains what SQL injection is and how to prevent it.

---

## What Is SQL Injection?

Consider this simple newsletter subscription code:

```php
<?php
$email = $_POST['email'];
$sql = "INSERT INTO subscribers (email) VALUES ('$email')";
$result = mysqli_query($connection, $sql);
```

If someone enters `john@example.com`, the query becomes:
```sql
INSERT INTO subscribers (email) VALUES ('john@example.com');
```

This works fine. But if someone enters `'; DROP TABLE subscribers; --`, the query becomes:
```sql
INSERT INTO subscribers (email) VALUES (''); DROP TABLE subscribers; -- ');
```

The `--` is a comment, so MySQL will:
1. Insert an empty row
2. **Delete your entire table**

Using this technique, hackers can execute any query—creating admin users, reading sensitive data, or destroying your database.

---

## How to Prevent SQL Injection

### Method 1: Prepared Statements (Recommended)

Prepared statements completely separate query logic from data, making SQL injection impossible.

```php
<?php
$email = $_POST['email'];

// Create query with placeholder
$sql = "INSERT INTO subscribers (email) VALUES (?)";
$statement = mysqli_prepare($connection, $sql);

// Bind data to placeholder
mysqli_stmt_bind_param($statement, 's', $email);

// Execute
$result = mysqli_stmt_execute($statement);
```

The query text is always the same—no user data goes into it directly. This makes injection impossible.

### Method 2: Escape Functions

Another approach is escaping special characters in user input:

```php
<?php
$email = mysqli_real_escape_string($connection, $_POST['email']);
$sql = "INSERT INTO subscribers (email) VALUES ('$email')";
$result = mysqli_query($connection, $sql);
```

**Note:** PDO doesn't have escape functions—use prepared statements instead.

---

## Common Pitfalls

### ❌ Putting Data in Prepared Statements

This is still vulnerable:

```php
<?php
$email = $_POST['email'];
$sql = "INSERT INTO subscribers (email) VALUES ('$email')";
$statement = mysqli_prepare($connection, $sql);
$result = mysqli_stmt_execute($statement);
```

**Always** bind user data to parameters—never include it in the query text.

### ❌ Using the Wrong Escape Function

| Function | Use For |
|----------|---------|
| `mysqli_real_escape_string()` | ✅ Database queries (MySQLi) |
| `addslashes()` | ❌ Not for database queries |
| `filter_var()` | ❌ Not for database queries |
| `htmlspecialchars()` | ❌ Not for database queries |

Using the wrong function can leave your code vulnerable or corrupt your data.

### ❌ Escaping Multiple Times or Not at All

As code becomes complex across multiple files and functions, it's easy to:
- Escape data twice (resulting in garbage data)
- Forget to escape (leaving vulnerabilities)

**Best practice:** Be consistent about where you escape data, or use prepared statements which handle this automatically.

---

## Summary

| Method | Library | Recommendation |
|--------|---------|----------------|
| Prepared statements | MySQLi | ✅ Recommended |
| Prepared statements | PDO | ✅ Recommended |
| `mysqli_real_escape_string()` | MySQLi | ⚠️ Acceptable |
| Escape functions | PDO | ❌ Not available—use prepared statements |

**Bottom line:** Use prepared statements whenever possible. They're the safest and most foolproof method.
