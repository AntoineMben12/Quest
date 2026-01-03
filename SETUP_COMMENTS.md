# SETUP INSTRUCTIONS

## Quick Setup Guide

### Step 1: Create the Database Table
Execute this SQL in your MySQL database:

```sql
CREATE TABLE IF NOT EXISTS post_comment (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES post(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

**Using MySQL Command Line:**
```bash
mysql -u root -p questing < post_comment_table.sql
```

**Or using MySQL Workbench:**
1. Open MySQL Workbench
2. Connect to your database
3. Copy and paste the SQL above
4. Execute (Ctrl+Enter)

### Step 2: Restart Your Server
Your server.js now includes comment endpoints. Simply:
```bash
node server.js
```

### Step 3: Test the Feature
1. Open http://localhost:3000/Post/post.html
2. Click the comment icon on any post
3. If logged in, you can add comments
4. Click again to hide comments

---

## What Was Added

### Database
✅ **post_comment table** with:
- comment_id (auto-increment primary key)
- post_id (foreign key to posts)
- user_id (foreign key to users)
- comment_text (the comment content)
- created_at (timestamp)
- Automatic deletion when post/user is deleted

### API Endpoints
✅ **POST /api/comments**
- Create new comments

✅ **GET /api/comments/:post_id**
- Retrieve all comments for a post

✅ **DELETE /api/comments/:comment_id**
- Delete a comment (only owner can delete)

### Frontend UI
✅ **Comment Icon** - Shows comment count on each post
✅ **Expandable Comments Section** - Toggle view with click
✅ **Comment List** - Shows all comments with user info and timestamps
✅ **Comment Form** - Add new comments (logged-in users only)
✅ **Delete Button** - Remove own comments
✅ **Time Formatting** - "2 hours ago" style display
✅ **Security** - HTML escaping and XSS protection

---

## File Changes Summary

| File | Changes |
|------|---------|
| server.js | +120 lines (3 new API endpoints) |
| Post/post_display.js | +200 lines (comment UI & functions) |
| NEW: post_comment_table.sql | SQL schema for comments |
| NEW: COMMENTS_IMPLEMENTATION.md | Full documentation |

---

## Features

### User Perspective
- 💬 Click comment icon to see all comments
- ✍️ Type and submit comments when logged in
- 🗑️ Delete your own comments
- ⏰ See when comments were posted
- 🌙 Dark mode support included

### Developer Perspective
- 🔒 Security: XSS protection, ownership validation
- 📊 Database: Proper indexes and foreign keys
- 🔄 Cascade: Automatic cleanup when posts/users deleted
- 📱 Responsive: Works on all screen sizes
- 🎨 Styled: Matches existing Questing design

---

## Validation Rules

| Action | Requirement | Error Message |
|--------|-------------|----------------|
| Create Comment | User logged in, non-empty text | "All fields are required!" |
| Create Comment | Text not empty after trim | "Comment cannot be empty!" |
| Create Comment | Post must exist | "Post not found!" |
| Delete Comment | Must be comment owner | "You can only delete your own comments!" |
| Delete Comment | Comment must exist | "Comment not found!" |

---

## Performance Considerations

✅ **Indexes** on post_id, user_id, created_at for fast queries
✅ **Pagination Ready** - Can add LIMIT/OFFSET later
✅ **Lazy Load** - Comments load only when section opened
✅ **Max height** - Comments list scrolls to prevent huge posts
✅ **Order** - Newest comments first for better UX

---

## Need Help?

1. **Table not created?** Check MySQL connection in server.js (host, user, password, database)
2. **API errors?** Check server console for detailed error messages
3. **Comments not showing?** Clear browser cache (Ctrl+Shift+Delete)
4. **Delete not working?** Ensure you're logged in as comment author

Check COMMENTS_IMPLEMENTATION.md for detailed API documentation.
