# How to Fix a Corrupted WordPress Installation

WordPress releases frequent updates that you can install through the admin interface. Usually this works smoothly, but sometimes big upgrades fail midway, leaving you with a broken website.

You can fix this without losing any data. Here's how.

---

## Step 1: Download Fresh WordPress Files

1. Go to [wordpress.org/download](https://wordpress.org/download/)
2. Download the `.zip` file
3. Extract the archive on your computer
4. Keep track of the `wordpress` folder—you'll need it later

---

## Step 2: Set Up FTP Connection

You need an FTP client and connection to upload files.

See: [How to upload files with FTP](../File%20Management%20and%20FTP/How%20to%20upload%20files%20with%20FTP.md)

**Recommended:** FileZilla (free, available for most operating systems)

---

## Step 3: Navigate to Your Website Folder

In your FTP client, find the folder containing your WordPress files:

| Domain Type | Location |
|-------------|----------|
| Original/main domain | `htdocs` |
| Addon domains | `example.com/htdocs` |
| Subdomains | `subdomain.example.com/htdocs` |
| Subfolder installation | `htdocs/blog` (for example.com/blog) |

**How to identify WordPress files:** Look for folders named `wp-admin`, `wp-content`, and `wp-includes`, plus PHP files starting with `wp-`.

---

## Step 4: Overwrite WordPress Files

Now replace the corrupted files with fresh ones:

1. On your computer, open the `wordpress` folder from the extracted zip
2. In FileZilla: left pane shows your computer, right pane shows your website
3. Select **all contents** of the `wordpress` folder
4. Drag them to your website folder (right pane)
5. When prompted, select **"Overwrite"**
6. Check the box to apply to all uploads
7. Wait for all uploads to complete (this may take a while)

---

## Step 5: Check WordPress Admin

After uploads complete:

1. Go to your WordPress admin area
2. Follow any on-screen instructions to complete the upgrade
3. Your website should now be fully functional and updated

---

## What Gets Preserved

| Preserved | Not Affected |
|-----------|--------------|
| Your content (posts, pages) | ✅ |
| Your media files | ✅ |
| Your themes | ✅ |
| Your plugins | ✅ |
| Your database | ✅ |
| Your `wp-config.php` settings | ✅ |

Only the core WordPress files are replaced—your content stays intact.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still seeing errors | Clear browser cache and try again |
| Database connection error | Check `wp-config.php` settings |
| White screen | Enable `WP_DEBUG` in `wp-config.php` |
| Specific plugin/theme errors | Deactivate problematic addons |
