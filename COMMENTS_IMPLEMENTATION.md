# Post Comment System Implementation

## Overview
A complete comment system has been implemented for posts in the Questing application. Users can now add, view, and delete comments on posts.

## Database Setup

### Create the post_comment Table
Run the following SQL command to create the table:

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

**Key Features:**
- `comment_id`: Unique identifier for each comment
- `post_id`: Foreign key linking to the post (CASCADE delete)
- `user_id`: Foreign key linking to the user who commented (CASCADE delete)
- `comment_text`: The comment content (up to 500 characters)
- `created_at`: Timestamp of when the comment was created
- Indexes for efficient queries on post_id, user_id, and created_at

## API Endpoints

### 1. Create a Comment
**POST** `/api/comments`

**Request Body:**
```json
{
  "post_id": 1,
  "user_id": 5,
  "comment_text": "Great post!"
}
```

**Response:**
```json
{
  "message": "Comment added successfully!",
  "comment_id": 42
}
```

### 2. Get Comments for a Post
**GET** `/api/comments/:post_id`

**Response:**
```json
{
  "message": "Comments retrieved successfully!",
  "comments": [
    {
      "comment_id": 42,
      "post_id": 1,
      "user_id": 5,
      "comment_text": "Great post!",
      "created_at": "2026-01-03T10:30:00.000Z",
      "name": "John Doe"
    }
  ]
}
```

### 3. Delete a Comment
**DELETE** `/api/comments/:comment_id`

**Request Body:**
```json
{
  "user_id": 5
}
```

**Response:**
```json
{
  "message": "Comment deleted successfully!"
}
```

**Validation:** Users can only delete their own comments.

## Frontend Features

### Post Display
- Each post now displays a comment icon with the total number of comments
- Click the comment icon to toggle the comments section

### Comments Section
- **View Comments**: Displays all comments for a post in reverse chronological order (newest first)
- **Add Comment**: Logged-in users can type and submit comments (max 500 characters)
- **Delete Comment**: Users can delete their own comments with a confirmation prompt
- **User Info**: Each comment shows:
  - Commenter's name
  - Time since comment was posted (e.g., "2 hours ago")
  - Comment text

### User Experience
- Comments section is hidden by default (can be toggled)
- Non-logged-in users see a login prompt in the comment area
- Real-time update of comment count
- Responsive design with scrollable comment list (max-height: 256px)
- XSS protection with HTML escaping

## Files Modified

### Backend
- **server.js**: Added three new API endpoints:
  - `POST /api/comments` - Create comment
  - `GET /api/comments/:post_id` - Fetch comments
  - `DELETE /api/comments/:comment_id` - Delete comment

### Frontend
- **Post/post_display.js**: 
  - Updated `displayPosts()` to include comment UI
  - Added `toggleComments(postId)` - Show/hide comments section
  - Added `loadComments(postId)` - Fetch and display comments
  - Added `submitComment(postId)` - Post new comment
  - Added `deleteComment(commentId)` - Remove comment
  - Added `escapeHtml(text)` - Security function for XSS prevention

## Security Features
✅ **Authentication**: Only logged-in users can comment
✅ **Authorization**: Users can only delete their own comments
✅ **Input Validation**: Comment text is trimmed and validated
✅ **XSS Protection**: HTML special characters are escaped
✅ **Database Constraints**: Foreign key constraints with CASCADE delete
✅ **Error Handling**: Comprehensive error messages and logging

## Testing Checklist
- [ ] Database table created successfully
- [ ] Server restarted to load new endpoints
- [ ] Can view comments on posts
- [ ] Can submit new comments as logged-in user
- [ ] Comment count updates correctly
- [ ] Can delete own comments
- [ ] Cannot delete others' comments
- [ ] Non-logged-in users see login prompt
- [ ] Comments display in correct order (newest first)
- [ ] Time ago formatting works correctly
- [ ] HTML special characters are escaped

## Styling
The comment UI uses Tailwind CSS with:
- Dark mode support
- Primary color theme (GreenYellow)
- Responsive design
- Smooth transitions and hover effects
- Consistent with existing Questing design

## Future Enhancements
- Comment editing functionality
- Nested/threaded comments
- Comment reactions/likes
- Comment search/filtering
- Pagination for posts with many comments
- Email notifications for comment replies
