# Allowed Memory Size Exhausted Error

**Category:** Websites and PHP

---

When running PHP code on your website, you may see an error message like this:

```
Fatal error: Allowed memory size of 33554432 bytes exhausted (tried to allocate 74 bytes) in /folder/path/to/file
```

This means your website code is trying to use more memory than allowed.

## Why Does This Happen?

To prevent a single page view from consuming too much system memory, there is a limit on how much memory a PHP script can use. The current limit is **158 MB**.

If your code tries to use more memory than this, the system will refuse to provide it, and your code will crash with the error shown above.

## How to Fix This

### Reduce Code Complexity

Try to reduce the complexity of your code:

- **Remove unused plugins** from your website
- **Switch to a lighter theme**
- **Optimize database queries** to fetch only needed data
- **Process large datasets in smaller batches**

Unfortunately, there's no easy way to see how much memory each piece of code uses, so finding the culprit requires some trial and error.

### Identify Memory-Hungry Components

1. Disable plugins one by one to identify which one uses the most memory.
2. Switch to a default theme temporarily to see if your theme is the problem.
3. Check if the error occurs on specific pages only.

## Need More Memory?

If you need more system memory to execute your code, consider upgrading to **premium hosting**, where you can set your own PHP memory limits.

## Summary

| Aspect | Details |
|--------|---------|
| Default memory limit | 158 MB |
| Can it be increased on free hosting? | No |
| Solution | Optimize code or upgrade to premium |
