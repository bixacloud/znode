# Redirected to Znode 500 Error Page

**Category:** Websites and PHP

---

When working on your website, you may be redirected to the Znode 500 error page. This article explains why this happens and how to fix it.

## Bad .htaccess Rules

The most common cause of this error is a problem in your `.htaccess` file.

`.htaccess` rules are very sensitive to errors, and when they break, servers don't provide clear error messages.

### Diagnose the Problem

1. Rename your `.htaccess` file to `.htaccess.bak`.
2. Try to access the page again.
3. If you see something other than the 500 error page, the `.htaccess` rules are definitely the problem.

## Tips for Fixing Bad .htaccess Rules

### Check Recent Changes

Did you recently modify your `.htaccess` file? Those changes may be causing the issue. Try:
- Reverting the changes
- Commenting out the new lines by adding `#` at the start of each line

### Disable Blocks of Rules

If your `.htaccess` file contains many rules from different sources, narrow down which part is causing the issue by commenting out entire blocks.

**Important:** Comment out complete blocks—incomplete code snippets can also cause the server to crash.

### Common Block Types

**IfModule blocks:**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule . /index.php
</IfModule>
```
These blocks can be disabled entirely. A block start without a matching block end will break.

**RewriteRule and RewriteCond:**
`RewriteCond` directives apply to the first `RewriteRule` that follows. When disabling rules, make sure to disable both the `RewriteCond` and `RewriteRule` together.

**Options statements:**
Lines starting with `Options` are standalone and can be disabled individually.

### Ensure Correct Copying

If you copied rules from a document or web page:
- Make sure you copied completely and correctly.
- `.htaccess` rules are sensitive to typos, whitespace, and line endings.
- View the file through the web-based file manager, not just your local editor.
- **Disable translation tools** before copying code snippets—translators may mangle the code.

### Try Different Examples

If you copied an example from the internet and it doesn't work, search for different examples. The original example may have errors or may not be compatible with Znode.

## PHP Errors

Another reason for 500 errors is a problem in your PHP code. However, PHP errors usually display the "HTTP ERROR 500" page in your browser rather than the Znode 500 error page.

See the [HTTP Error 500](#) article for more information on dealing with PHP errors.
