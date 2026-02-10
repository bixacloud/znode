# Unable to Access phpMyAdmin

Some users experience problems accessing phpMyAdmin from their control panel. This typically happens after changing the hosting account password.

**Symptoms:**
- `ERR_TOO_MANY_REDIRECTS`
- "The page isn't redirecting properly"
- "Redirected you too many times"

---

## Solution 1: Clear Browser Cache and Cookies

When you change your account password, you may still be logged into phpMyAdmin with old credentials. Since these are no longer valid, phpMyAdmin breaks.

**Fix:** Clear cache and cookies for:
- Control panel domain (`cpanel.znode.app`)
- phpMyAdmin domain (`185.27.134.10`)

---

## Solution 2: Use Private/Incognito Mode

If clearing cache doesn't work, try accessing phpMyAdmin through:
- **Chrome:** Incognito mode (Ctrl+Shift+N)
- **Firefox:** Private browsing (Ctrl+Shift+P)
- **Edge:** InPrivate mode (Ctrl+Shift+N)

Private browsing bypasses all browser caches.

---

## Solution 3: Change the Account Password

Sometimes password changes don't process correctly on the database server.

### Steps

1. Change your hosting account password through the client area
2. **Use a different password** (you can change it back afterward)
3. Wait **at least 15 minutes** for changes to propagate
4. Clear cache and cookies
5. Try accessing phpMyAdmin again

---

## Quick Troubleshooting

| Try This | Why It Helps |
|----------|--------------|
| Clear browser cache | Removes old credentials |
| Private browsing | Bypasses all caches |
| Change password | Forces credential reset |
| Wait 15 minutes | Allows system synchronization |
