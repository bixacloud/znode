# HTTP Error 500

**Category:** Websites and PHP

---

When trying to access your website, you may see a page with the status code "500" or "HTTP ERROR 500" in your browser.

There are typically two causes for this error:
1. The PHP code has crashed.
2. The `.htaccess` file contains invalid rules.

## Fixing Crashing PHP Code

An HTTP ERROR 500 tells you that PHP code has crashed but gives no information about why.

### Getting the Real Error Message

First, enable error messages on your website:

1. Log in to your control panel.
2. Go to **Alter PHP Config**.
3. Select the domain name you're debugging and click **Alter PHP Directives**.
4. Set **"Display Errors"** to **"On"** and save.

Refresh the page—you should now see an error message.

### If You Don't See an Error Message

Your script may be suppressing error messages. Try these solutions:

**Check for debug mode:** Many applications have a debug mode option or log file. For example, WordPress has a `WP_DEBUG` setting. Learn more in the [WordPress documentation](https://wordpress.org/support/article/debugging-in-wordpress/).

**Check for error suppression in code:** Look for these lines in your PHP code and comment them out:

```php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
```

### Fixing the Actual Error

Once you have an error message, here's how to fix it:

1. **Check the file path:** Does it refer to a specific plugin or theme? Try disabling it to see if the error disappears.

2. **Search the web:** Look up your error message along with the script, plugin, or theme generating it. Others may have already found a solution.

3. **Ask for help:** Post your question on the plugin/theme's support channel, StackOverflow, or the Znode forum.

---

## Fixing Invalid .htaccess Rules

If your `.htaccess` file has an error, it can cause HTTP ERROR 500. Unfortunately, there's no way to get a specific error message in this case.

### Diagnose the Problem

1. Rename your `.htaccess` file to `.htaccess.backup`.
2. Refresh the page.
3. If the error disappears, the `.htaccess` file was the problem.

### Fix the Problem

**Option 1: Replace with a fresh copy**
Download a fresh `.htaccess` file from your software's source and replace your current file.

**Option 2: Use binary search to find the broken line**

1. Comment out half of the lines in your `.htaccess` file (add `#` at the start of each line).
2. If the site works, the problem is in the commented-out half.
3. If it still breaks, the problem is in the uncommented half.
4. Repeat this process, narrowing down until you find the broken line.

### Important Notes About .htaccess

- **IfModule blocks:** Blocks that start with `<IfModule>` and end with `</IfModule>` must be complete.

- **RewriteRule and RewriteCond:** `RewriteCond` directives apply to the first `RewriteRule` that follows. When disabling rules, make sure to disable both together.

- **Copy carefully:** `.htaccess` rules are sensitive to typos, whitespace, and line endings. Different operating systems use different line endings, so what looks fine on your computer may break on the server.

- **Avoid translation tools:** Translation systems may mangle code snippets. Disable translators before copying code.
