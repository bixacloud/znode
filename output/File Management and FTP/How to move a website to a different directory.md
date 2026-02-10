# How to Move a Website to a Different Directory

Every website is linked to a specific `htdocs` directory on your account. Sometimes you need to move a website from one directory to another, such as when:

- Moving to a different domain name (e.g., free subdomain to custom domain)
- Your domain was recreated and assigned to a different directory

You don't need to rebuild your website—moving files is straightforward.

---

## Method 1: Move the Directory (Fastest)

The fastest method is moving the entire `htdocs` folder. When done correctly, there's no risk of data loss.

### Step 1: Delete the New htdocs Directory

1. Open the file manager for your hosting account
2. Go to the directory of your **NEW** domain
3. Right-click the `htdocs` folder and click **Delete**

This removes the empty `htdocs` folder—we'll replace it with your existing website folder.

### Step 2: Cut the Old htdocs Folder

1. Navigate to where your old `htdocs` folder is (previous domain folder or root)
2. Right-click the `htdocs` folder
3. Click **Cut**

### Step 3: Paste in the New Directory

1. Go back to the folder where files should be moved to
2. Click anywhere in empty space
3. Choose **Paste**

**Done!** Within seconds, the `htdocs` folder with all your website files will appear in the new location.

---

## Method 2: Copy the Directory (Safer but Slower)

If you want to keep files in both locations or want extra safety, you can copy instead.

### Important Notes

- FTP doesn't support copying files on the server
- File managers download and re-upload files to "copy"
- Web-based file managers are poor at handling large transfers
- **Use a desktop FTP client like FileZilla**
- Copying doubles your disk space and inode usage—you may hit limits

### Steps

1. Download the `htdocs` directory to your computer using FTP
2. Upload the contents to the new directory on your account

---

## Helpful Tips

### Set Up a Redirect on the Old Domain

Instead of deleting the old domain, set up a redirect:

1. If you moved the directory, create a new `htdocs` folder in the old location
2. In the client area, go to your account → **Redirects**
3. Create a redirect for path `/` pointing to your new domain
4. Choose "301 Permanent" type

### Use Parked/Alias Domains

If your new domain is a custom domain, you can avoid file migration entirely:

1. When adding your domain, set it up as a **Parked Domain** (control panel) or **Alias Domain** (client area)
2. This links the new domain to the same `htdocs` directory as your old domain
3. Both domains will show the same website

**Note:** Once the old domain is deleted, you cannot link a different domain to the same directory.

### Additional Configuration May Be Needed

Moving files may not be the only step:

| If You're... | You May Need To... |
|--------------|-------------------|
| Changing domain names | Update website URL settings |
| Using WordPress | Follow the [WordPress migration guide](https://developer.wordpress.org/advanced-administration/upgrade/migrating/) |
| Changing directory paths | Update any hardcoded paths in configuration |

Most websites don't need additional configuration for directory changes, only for domain name changes.
