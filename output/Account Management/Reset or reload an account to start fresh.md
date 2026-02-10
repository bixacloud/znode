# Reset or Reload an Account to Start Fresh

Sometimes you may want to completely clean up your account and start from scratch—for example, when installing a fresh script and removing all traces of old code.

Some hosting platforms offer an "Account Reset" or "Reload Account" option. **Znode doesn't have this feature**, but you can clean your account yourself.

---

## Option 1: Clean the Account Manually

To thoroughly clean an account, follow these steps:

### Step 1: Remove Domain Configurations

Go to the control panel and delete all entries in:
- **Addon Domains**
- **Parked Domains**
- **Subdomains**

### Step 2: Remove Databases

Go to **MySQL Databases** and delete all databases.

### Step 3: Remove Installed Scripts

Go to **Softaculous** → **Installed Apps** and delete everything in the list.

### Step 4: Clean Website Files

Go to the file manager and:
1. Navigate to the `htdocs` directory
2. Delete everything inside it
3. Repeat for the `htdocs` directory in every domain folder

**Note:** Some content like domain directories may remain because they contain protected files.

---

## Option 2: Create a New Account

Another method is to simply create a new hosting account from your client area. This gives you a completely fresh, clean account.

### Important Considerations

| Scenario | What to Do |
|----------|------------|
| Using a domain from another account | Remove it from the old account first |
| Same domain on multiple accounts | Not allowed—domains can only be on one account at a time |

---

## Comparison

| Method | Pros | Cons |
|--------|------|------|
| Manual cleaning | Keep same account/settings | Some content may remain |
| New account | Completely fresh | Must reconfigure domains |
