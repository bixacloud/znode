# How to Get Full Logs from FileZilla

When debugging FTP connection issues, it's helpful to see what FileZilla is doing under the hood. This guide explains how to enable and capture detailed debug logs.

---

## Enable Debug Logging

1. Go to **Edit** → **Settings…**
2. Scroll down to the **Debug** page
3. Ensure **"Show debug menu"** is enabled (it is by default)
4. Set **"Debug information in message log"** to **"2 - Info"**
5. Click **Save**

---

## Retry and Capture Logs

With debug logging enabled:

1. Retry your FTP action
2. Watch the box at the top of the screen fill with detailed text
3. This is the debug output showing exactly what FileZilla is doing

---

## Share the Logs

To share logs for troubleshooting:

1. Select all text in the log box
2. Copy it
3. Paste it in your forum post or support request

**Safe to share:** FileZilla hides sensitive details like passwords by default, so the information is safe to share publicly.

---

## What the Logs Show

Debug logs include:
- Connection attempts
- Server responses
- File transfer progress
- Error messages with details
- Timing information

This information helps diagnose:
- Connection failures
- Authentication problems
- Transfer errors
- Network issues
