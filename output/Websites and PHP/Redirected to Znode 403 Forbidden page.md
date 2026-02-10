# Redirected to Znode 403 Forbidden Page

**Category:** Websites and PHP

---

A 403 error means the server is refusing to display your webpage. Here are the most common causes and how to fix them.

## 1. Website Files Are in the Wrong Location

### The Issue
Your domain might be pointing to an empty or non-existent folder.

### How to Check
1. Log into your Znode client area.
2. Go to **Accounts → [Select your account] → Domains → [Find your domain] → Manage**.
3. Find the **Directory Status** card and note the directory displayed there.

### Understanding the Folder Structure
- Your first domain uses the `htdocs` folder.
- Additional domains get their own folders (e.g., `example.com/htdocs`).
- If you delete and re-add your original domain, it will be treated as an additional domain and assigned a new folder.

### How to Fix
Upload your website files to the exact folder shown in your client area. If the folder is empty or missing, that's why you're seeing the 403 error.

---

## 2. Missing Index File

### The Issue
When someone visits your site (like `http://example.com/` or `http://example.com/blog/`), the server looks for a default file to display. If it can't find one, you get a 403 error.

### What the Server Looks For
The server searches for these files in this exact order:
1. `index.php`
2. `index.html`
3. `index.htm`
4. `index2.html`

**Important notes:**
- File names are case-sensitive—`Index.php` or `index.HTML` won't work.
- The server only looks in the specific folder being accessed, not subfolders.

### How to Fix

**Option 1 (Recommended): Create an index file**
- Add an `index.html` or `index.php` file to your main folder.
- This file will be displayed when people visit your site.

**Option 2: Show a file listing**
- Create a file called `.htaccess` in the folder.
- Add this line: `Options +Indexes`
- Visitors will see a list of files instead of your webpage.

**Option 3: Set a custom default file**
- Create a file called `.htaccess` in the folder.
- Add this line: `DirectoryIndex yourfile.html index.php index.html index.htm`
- Replace `yourfile.html` with your actual filename.

---

## 3. Blocked Keywords in Your URL

### The Issue
Certain keywords in your URL are automatically blocked by Znode.

### Blocked Keywords

**"chat"** - Live chat scripts constantly refresh pages, creating excessive server load.
- Examples: `chat.php`, `/livechat/`, `/support/chat/`

**"includes"** - This folder typically contains scripts meant to be loaded by other PHP files, not accessed directly by browsers (security measure).
- Examples: `/includes/functions.php`, `/includes/config.php`

### How to Fix
Rename your files or folders to something else:
- For chat: `talk`, `messages`, `contact`, `support`
- For includes: `pages`, `functions`, `scripts`

**Important:** Even if you rename chat-related files, hosting live chat scripts is still prohibited.

---

## 4. Your IP Address Is Blocked

### The Issue
Your website's `.htaccess` file might be blocking your own IP address.

### How to Check
1. Access your website files via file manager or FTP.
2. Look for a file named `.htaccess` in your website folder.
3. Open the file and look for lines starting with `deny from` or `allow from`.

### How to Fix

**If you don't want IP restrictions:**
- Remove all lines starting with `deny from` or `allow from`.

**If you see `allow from all`:**
- Look for lines like `deny from [your IP address]` and delete them.

**If you see `deny from all`:**
- Add a new line: `allow from [your IP address]`
- You can find your IP address by searching "what is my IP" in Google.

---

## Still Having Trouble?

Double-check that your files are in the exact folder path shown in your Znode client area under Domains. Most 403 errors are caused by files being in the wrong location.
