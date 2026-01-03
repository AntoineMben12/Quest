-- Create post_comment table to store comments on posts
CREATE TABLE IF NOT EXISTS post_comment (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to link comments to posts
    FOREIGN KEY (post_id) REFERENCES post(post_id) ON DELETE CASCADE,
    
    -- Foreign key constraint to link comments to users
    FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE,
    
    -- Index for efficient queries
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
