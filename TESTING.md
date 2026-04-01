# Pre-Commit Testing Guide

This guide walks through how to test the site before making a Git commit.

You do not need to know much command line to use this. Just follow the steps in order.

## What This Helps You Test

- Changes on your Mac before you push anything
- Changes on your iPhone before you deploy
- PWA updates and service worker behavior
- Whether the installed home screen app is loading the newest version

## Before You Start

Make sure you are in this project folder:

```bash
cd /Users/johnseggman/Codex
```

## Part 1: Test Locally On Your Mac

### Step 1: Start the local preview

Run:

```bash
./dev-preview.sh
```

What this does:

- Starts a small local web server
- Lets you preview the app in your browser without deploying

### Step 2: Open the app on your Mac

Open this in your browser:

```text
http://localhost:4173
```

### Step 3: Check your changes

Go through the app and test the parts you changed.

Examples:

- Open each main tab
- Click buttons you changed
- Check forms and filters
- Make sure images load
- Make sure no obvious layout is broken

### Step 4: Hard refresh if something looks stale

If the page looks like the old version:

- In Chrome on Mac: `Cmd + Shift + R`
- In Safari on Mac: `Cmd + Option + R`

This forces the browser to request the latest files again.

### Step 5: Stop the local preview

Go back to the terminal window where `./dev-preview.sh` is running and press:

```text
Ctrl + C
```

That stops the local server.

## Part 2: Test On iPhone Over HTTPS

Use this when you want to test PWA behavior, service workers, or "Add to Home Screen" before deploying.

### Step 1: Start the HTTPS preview tunnel

Run:

```bash
./dev-preview.sh --tunnel
```

What this does:

- Starts the local server
- Creates a temporary HTTPS URL
- Prints a link ending in `trycloudflare.com`

It will look something like this:

```text
https://something-random.trycloudflare.com
```

### Step 2: Open that HTTPS URL on your iPhone

Important:

- You do not need to be on the same Wi-Fi
- Your Mac must stay on
- The terminal must keep running

### Step 3: Test the site in Safari on iPhone

Check the things you changed.

Also test:

- Scrolling
- Button taps
- Layout on the phone screen
- Forms and inputs
- Loading speed

### Step 4: Test the PWA install flow

In Safari on iPhone:

1. Open the HTTPS tunnel link
2. Tap the Share button
3. Tap `Add to Home Screen`
4. Open the installed app from your home screen

Now test the installed version of the app, not just the browser tab.

### Step 5: Test the app update flow

Use this when you changed the app and want to confirm the installed PWA updates correctly.

1. Keep the installed app on your phone
2. Make another code change on your Mac
3. Save the file
4. Keep `./dev-preview.sh --tunnel` running
5. Re-open the HTTPS tunnel URL on iPhone
6. Wait for the `Update Ready` banner
7. Tap `Refresh`

If that works, the PWA update flow is behaving correctly.

## Part 3: What To Do If You Still See An Old Version

If the Mac browser looks old:

- Hard refresh the page
- Close the tab and reopen it

If the iPhone browser looks old:

- Reload the page
- Close Safari and reopen it
- Open the tunnel URL again

If the installed iPhone PWA looks old:

- Open the installed app while online
- Wait a few seconds
- Look for the `Update Ready` banner
- Tap `Refresh`

## Part 4: When You Need To Fully Clear Old PWA Data

Only do this if the app still refuses to update.

### On Mac Chrome

1. Open the app
2. Open DevTools
3. Go to `Application`
4. Check `Service Workers`
5. Check `Storage`
6. Clear site data if needed

### On iPhone Safari

If needed, clear website data for the site in Safari settings and then test again.

Use this as a last resort, not your first step.

## Part 5: Basic Pre-Commit Checklist

Before making a Git commit, try to confirm all of these:

- The app opens on your Mac
- The part you changed works
- No obvious buttons or tabs are broken
- The console does not show obvious errors
- The iPhone browser version works if your change affects mobile
- The installed PWA works if your change affects the PWA or caching

## Part 6: How To Stop The Background Preview

If the preview is running in the terminal you can see:

- Press `Ctrl + C`

If you need to stop it from another terminal:

```bash
pkill -f "dev-preview.sh --tunnel"
```

For the normal local preview, you can also stop it with:

```bash
pkill -f "dev-preview.sh"
```

## Part 7: Quick Commands Reference

Start local preview:

```bash
./dev-preview.sh
```

Start HTTPS tunnel preview:

```bash
./dev-preview.sh --tunnel
```

Stop the tunnel preview from another terminal:

```bash
pkill -f "dev-preview.sh --tunnel"
```

## Part 8: Recommended Beginner Workflow

When you make a change, use this order:

1. Save your code
2. Run `./dev-preview.sh`
3. Test on your Mac
4. If the change affects mobile or PWA behavior, stop the first preview
5. Run `./dev-preview.sh --tunnel`
6. Test on iPhone in Safari
7. Test the installed PWA if needed
8. Stop the preview
9. Make your Git commit

That is the safest and simplest routine to follow.
