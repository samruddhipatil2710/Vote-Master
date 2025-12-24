# 🔍 Poll Link Checker - User Guide

## What Is It?

A **testing and verification page** where you can check if poll links are working and view all poll data.

## How to Access

### URL
```
http://localhost:5173/check-link
```

In production:
```
https://yourdomain.com/check-link
```

## How to Use

### Step 1: Open the Link Checker
Navigate to `/check-link` in your browser

### Step 2: Enter Poll Link or Name
You can enter either:
- **Poll name only**: `election-2024`
- **Full URL**: `https://yourdomain.com/election-2024`

### Step 3: Click "Check Link"
Or press Enter

### Step 4: View Results

If poll exists, you'll see:
- ✅ Success message
- Poll ID and unique link
- Question and leader name
- All options
- Fake results settings
- Real stats (views, votes)
- Full poll link with copy button
- Button to open poll in new tab
- Technical details (raw JSON data)

If poll doesn't exist:
- ❌ Error message
- "Poll not found"

## Features

### 🔍 Search Flexibility
- Enter just the poll name: `my-poll`
- Or paste full URL: `https://domain.com/my-poll`
- System extracts the poll name automatically

### 📋 Complete Data Display
See everything about the poll:
- Basic information
- Options and fake results
- Real statistics
- Technical JSON data

### 🚀 Quick Actions
- **Copy Link**: One-click copy to clipboard
- **Open Poll**: Test the poll in new tab
- **View JSON**: See raw database data

### ✅ Validation
- Checks if poll exists in database
- Shows error if not found
- Displays all poll details if found

## Use Cases

### 1. Testing New Polls
After creating a poll:
1. Go to `/check-link`
2. Enter your poll name
3. Verify all data is correct
4. Test the link

### 2. Debugging Issues
If a poll link isn't working:
1. Check if it exists in database
2. View the exact link format
3. Check for typos or errors
4. Verify data integrity

### 3. Verifying Data
Before sharing a poll:
1. Check the fake results
2. Verify options are correct
3. Ensure question displays properly
4. Test the live link

### 4. Quick Testing
During development:
1. Create poll in dashboard
2. Immediately test in link checker
3. Fix any issues
4. Re-test

## Example Usage

### Example 1: Check Election Poll
1. Enter: `election-2024`
2. Click "Check Link"
3. See all poll data
4. Click "Open Poll" to test
5. Verify everything works

### Example 2: Debug Problem Link
1. User reports link not working
2. Copy their link: `https://domain.com/my-vote`
3. Paste into checker
4. See if poll exists
5. If yes, check data
6. If no, recreate poll

### Example 3: Verify Before Sharing
1. Created new poll: `team-survey`
2. Check in link checker
3. Verify fake results: 45%, 55%
4. Test live link
5. Share with confidence

## What You Can See

### Poll Information
- Poll ID (database ID)
- Unique Link (URL slug)
- Question
- Leader Name
- Input Type (radio/slider)
- Status

### Options
- All poll options
- Option numbers
- Clean display

### Fake Results
- What voters will see
- Percentage or number mode
- Per-option breakdown

### Real Stats
- Total views
- Total votes
- Live data from database

### Full Link
- Complete poll URL
- Copy button
- Open in new tab button

### Technical Details
- Raw JSON data
- All database fields
- Debugging information

## Tips

### ✅ Best Practices
- Test every new poll before sharing
- Verify data after editing
- Use for debugging issues
- Keep link checker bookmarked

### 🎯 Quick Testing Workflow
1. Create poll in dashboard
2. Copy poll name
3. Open `/check-link` in new tab
4. Paste and check
5. Test live link
6. Share if all good

### 🔧 Debugging Workflow
1. Receive link from user
2. Paste in checker
3. Check if exists
4. Verify all data
5. Test live link
6. Identify issue

## Important Notes

### Public Access
- Link checker is **publicly accessible**
- Anyone can check any poll link
- No login required

### Why Public?
- Easy testing
- Quick verification
- No authentication needed
- Developer-friendly

### Security Note
- Shows all poll data
- Including fake results
- Consider this when sharing check-link URL
- Maybe restrict in production if needed

## Keyboard Shortcuts

- **Enter**: Check link (while in input field)
- **Click input**: Auto-select for copy
- **Copy button**: Copy link to clipboard

## Mobile Friendly

Works on mobile devices:
- Responsive design
- Touch-friendly buttons
- Easy to use on phone

## Browser Compatibility

Works on:
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## Error Messages

### "Poll not found"
- Poll doesn't exist in database
- Check spelling
- Verify poll was created
- Try creating the poll

### "Please enter a poll link or name"
- Input field is empty
- Enter something
- Minimum 1 character

### Network Errors
- Check internet connection
- Verify Firebase is accessible
- Check browser console

## Access Control (Optional)

If you want to restrict access, you can:
1. Add authentication check
2. Make it admin/leader only
3. Remove route in production

Current: **Public access** (no restrictions)

## Summary

**What**: Poll link testing and verification page  
**Where**: `/check-link`  
**Who**: Anyone (public access)  
**Why**: Test polls, debug issues, verify data  
**How**: Enter poll name, click check, view data

## Quick Reference

```
URL: /check-link
Input: Poll name or full URL
Output: Complete poll data
Actions: Copy link, Open poll, View JSON
Access: Public (no login)
```

**Start testing your poll links now! 🚀**
