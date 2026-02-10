# Installation Failed: Critical Error on Your Website

WordPress supports installing and updating plugins/themes through the admin interface. However, large plugins (like WooCommerce) or themes may fail with this error:

```
Installation failed: There has been a critical error on your website.
Please check your site admin email inbox for instructions.
```

This means the installation crashed and may have left your website broken.

---

## Step 1: Identify the Broken Plugin or Theme

### If You Know What Failed

Skip to Step 2.

### If You're Unsure (Bulk Update or Auto-Update)

Enable debug mode to find the culprit:

1. Connect via FTP or file manager
2. Navigate to your website folder (`htdocs`)
3. Open `wp-config.php`
4. Find the line with `WP_DEBUG`
5. Change `false` to `true`:
   ```php
   define('WP_DEBUG', true);
   ```
6. Save and refresh your website

Look for error messages containing:
- `wp-content/plugins/` → The word after is the broken plugin folder
- `wp-content/themes/` → The word after is the broken theme folder

**Important:** Disable `WP_DEBUG` after identifying the problem—don't leave it enabled on live sites.

---

## Step 2: Deactivate the Broken Plugin

### If WordPress Admin Works

Deactivate the plugin from Plugins → Installed Plugins.

### If WordPress Admin Is Broken

Deactivate manually via FTP:

1. Connect via FTP or file manager
2. Navigate to `htdocs/wp-content/plugins`
   (or `example.com/htdocs/wp-content/plugins`)
3. Find the broken plugin's folder
4. Right-click → **Delete**

Your WordPress site should now be accessible.

---

## Step 3: Deactivate a Broken Theme

### If WordPress Admin Works

Switch themes from Appearance → Themes.

### If WordPress Admin Is Broken

Change the theme via database:

1. Note another theme folder name from `wp-content/themes` (e.g., `twentytwentyfour`)
2. Log in to control panel → **phpMyAdmin**
3. Connect to your WordPress database
4. Open the table ending with `_options`
5. Find the row where `option_name` = `template`
6. Edit `option_value` to your working theme's folder name
7. Save

Your site should now use the working theme.

---

## Step 4: Install the Plugin/Theme Manually

After removing the broken addon, install it properly via FTP:

### Download the Files

| Source | How |
|--------|-----|
| Third-party | You probably already have the zip |
| WordPress.org | Download from [Plugin Store](https://wordpress.org/plugins/) or [Theme Store](https://wordpress.org/themes/) |

### Upload via FTP

1. Extract the zip on your computer
2. Connect via FTP
3. Navigate to:
   - Plugins: `htdocs/wp-content/plugins`
   - Themes: `htdocs/wp-content/themes`
4. Upload the extracted folder
5. Wait for upload to complete
6. Activate from WordPress admin

**Note:** Downloaded packages sometimes contain documentation folders. Make sure you upload the correct plugin/theme folder.

---

## Why This Happens

Large plugins/themes can exceed PHP memory or time limits during web-based installation. Manual FTP upload bypasses these limits.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Enable WP_DEBUG to find broken addon |
| 2 | Delete broken plugin folder via FTP |
| 3 | Change theme via database if needed |
| 4 | Upload addon manually via FTP |
| 5 | Activate from WordPress admin |
