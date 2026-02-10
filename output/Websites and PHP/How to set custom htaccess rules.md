# How to Set Custom .htaccess Rules

**Category:** Websites and PHP

---

`.htaccess` rules are a powerful way to control how your website behaves. You can use them to set pretty URLs, define error pages, restrict access, and more.

This article explains how to add `.htaccess` rules to your website.

## Create the .htaccess File

Every domain name on your account has a `htdocs` directory:
- **First domain:** `htdocs/`
- **Addon domains and subdomains:** `example.com/htdocs/`

Create a new file named `.htaccess` in the `htdocs` folder of your domain and add your rules there.

### Tips for Creating .htaccess Files

- **Use the file manager:** Since the file name starts with a dot and has no name before the "extension," some computers handle it strangely. Windows is notorious for having problems with such file names.
- **Most scripts include one:** If your script (like WordPress) already includes a `.htaccess` file, edit that file instead of creating a new one.

## Don't Edit the Main .htaccess File

The root folder of your account also contains a `.htaccess` file. **You should not edit this file.**

The rules in the main `.htaccess` file set defaults for directory indexing and error pages. They don't really affect how your website behaves. If you don't like their behavior, you can override them using your own `.htaccess` file in the `htdocs` folder.

If you accidentally remove this file, don't worry—it only removes the default error pages and won't break your website.

## Summary

| Location | Purpose |
|----------|---------|
| `htdocs/.htaccess` | Your custom rules (edit this) |
| Root `.htaccess` | System defaults (don't edit) |

## Learn More

There are plenty of guides available online to teach you everything you can do with `.htaccess` rules. Search for specific use cases like:
- URL rewriting
- Custom error pages
- Password protection
- Redirects
