# How to Set Up a New MySQL Database

Many scripts require a MySQL database. This guide explains how to create a database and find the settings your script needs.

---

## Create a New Database

1. Log in to your client area
2. Go to **Accounts** list
3. Find your hosting account and click **Manage**
4. Click the **Control Panel** button
5. Go to **MySQL Databases**
6. Enter a short name (letters and numbers only) under **New Database**
7. Click **Create Database**

---

## Find Your Database Settings

Your script will ask for these connection details:

### Database Name, Username, and Hostname

1. Log in to your control panel
2. Go to **MySQL Databases**
3. Find your database under **Current Databases**
4. Copy:
   - MySQL DB Name
   - MySQL User Name
   - MySQL Host Name

### Database Password

1. Log in to the client area
2. Click your account
3. Scroll to **Account Password**
4. Click **Show** next to the password field
5. Copy the password

---

## Quick Reference

| Setting | Where to Find | Example |
|---------|---------------|---------|
| Hostname | Control Panel → MySQL Databases | `sql123.znode.app` |
| Database Name | Control Panel → MySQL Databases | `znode_12345678_mydb` |
| Username | Control Panel → MySQL Databases | `znode_12345678` |
| Password | Client Area → Account → Account Password | (your password) |

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Using `localhost` as hostname | Use the actual hostname from MySQL Databases |
| Using client area password | Use hosting account password |
| Incomplete database name | Use full name including prefix |

---

## That's It!

These four settings—hostname, database name, username, and password—are everything your script needs to connect to the database.
