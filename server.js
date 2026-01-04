require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
// bcrypt removed - passwords stored in plain text

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
});

// Sign Up API endpoint
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Invalid email format!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters!" });
    }

    // Get connection from pool
    const connection = await pool.getConnection();

    try {
      // Check if email already exists
      const [existingUser] = await connection.execute(
        "SELECT email FROM USERS WHERE email = ?",
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already registered!" });
      }

      // WARNING: Storing password in plain text (NOT SECURE)
      // Insert new user with plain text password
      const [result] = await connection.execute(
        "INSERT INTO USERS (name, email, password) VALUES (?, ?, ?)",
        [name, email, password]
      );

      console.log("New user created:", name, "with ID:", result.insertId);

      res.status(201).json({
        message: "User registered successfully!",
        userId: result.insertId,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Login API endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required!" });
    }

    // Get connection from pool
    const connection = await pool.getConnection();

    try {
      // Check if user exists
      const [users] = await connection.execute(
        "SELECT id, name, email, password FROM USERS WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: "Invalid email or password!" });
      }

      const user = users[0];

      // WARNING: Comparing plain text passwords (NOT SECURE)
      if (password !== user.password) {
        return res.status(401).json({ message: "Invalid email or password!" });
      }

      // Return user data (you can add JWT token here later)
      res.status(200).json({
        message: "Login successful!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Create Post API endpoint
app.post("/api/posts", async (req, res) => {
  try {
    const { user_id, title, texts } = req.body;

    // Validation
    if (!user_id || !title || !texts) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (title.length > 100) {
      return res.status(400).json({ message: "Title must be less than 100 characters!" });
    }

    if (texts.length > 600) {
      return res.status(400).json({ message: "Post content must be less than 600 characters!" });
    }

    // Get connection from pool
    const connection = await pool.getConnection();

    try {
      // Insert new post
      const [result] = await connection.execute(
        "INSERT INTO post (user_id, title, texts) VALUES (?, ?, ?)",
        [user_id, title, texts]
      );

      console.log("New post created with ID:", result.insertId);

      res.status(201).json({
        message: "Post created successfully!",
        postId: result.insertId,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Get all posts API endpoint
app.get("/api/posts", async (req, res) => {
  try {
    const { current_user_id } = req.query;
    const connection = await pool.getConnection();

    try {
      let query;
      let params = [];

      if (current_user_id) {
        // Include whether current user liked each post
        query = `
          SELECT 
            p.post_id, 
            p.user_id, 
            p.title, 
            p.texts, 
            p.likes, 
            p.created_at, 
            u.name,
            IF(pl.like_id IS NOT NULL, 1, 0) as user_liked
          FROM post p 
          JOIN USERS u ON p.user_id = u.id 
          LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = ?
          ORDER BY p.created_at DESC
        `;
        params = [current_user_id];
      } else {
        // Default query without like status
        query = `
          SELECT 
            p.post_id, 
            p.user_id, 
            p.title, 
            p.texts, 
            p.likes, 
            p.created_at, 
            u.name,
            0 as user_liked
          FROM post p 
          JOIN USERS u ON p.user_id = u.id 
          ORDER BY p.created_at DESC
        `;
      }

      const [posts] = await connection.execute(query, params);

      res.status(200).json({
        message: "Posts retrieved successfully!",
        posts: posts,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Get posts by user ID API endpoint
app.get("/api/posts/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { current_user_id } = req.query; // Get current user ID from query params

    const connection = await pool.getConnection();

    try {
      let query;
      let params;

      if (current_user_id) {
        // Include whether current user liked each post
        query = `
          SELECT 
            p.post_id, 
            p.user_id, 
            p.title, 
            p.texts, 
            p.likes, 
            p.created_at, 
            u.name,
            IF(pl.like_id IS NOT NULL, 1, 0) as user_liked
          FROM post p 
          JOIN USERS u ON p.user_id = u.id 
          LEFT JOIN post_likes pl ON p.post_id = pl.post_id AND pl.user_id = ?
          WHERE p.user_id = ? 
          ORDER BY p.created_at DESC
        `;
        params = [current_user_id, user_id];
      } else {
        // Default query without like status
        query = `
          SELECT 
            p.post_id, 
            p.user_id, 
            p.title, 
            p.texts, 
            p.likes, 
            p.created_at, 
            u.name,
            0 as user_liked
          FROM post p 
          JOIN USERS u ON p.user_id = u.id 
          WHERE p.user_id = ? 
          ORDER BY p.created_at DESC
        `;
        params = [user_id];
      }

      const [posts] = await connection.execute(query, params);

      res.status(200).json({
        message: "User posts retrieved successfully!",
        posts: posts,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Delete Post API endpoint
app.delete("/api/posts/:post_id", async (req, res) => {
  try {
    const { post_id } = req.params;

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        "DELETE FROM post WHERE post_id = ?",
        [post_id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Post not found!" });
      }

      console.log("Post deleted with ID:", post_id);

      res.status(200).json({
        message: "Post deleted successfully!",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Like/Unlike Post API endpoint (toggle)
app.put("/api/posts/:post_id/like", async (req, res) => {
  try {
    const { post_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required!" });
    }

    const connection = await pool.getConnection();

    try {
      // Check if the user is trying to like their own post
      const [postCheck] = await connection.execute(
        "SELECT user_id FROM post WHERE post_id = ?",
        [post_id]
      );

      if (postCheck.length === 0) {
        return res.status(404).json({ message: "Post not found!" });
      }

      if (postCheck[0].user_id === parseInt(user_id)) {
        return res.status(403).json({ message: "You cannot like your own post!" });
      }

      // Check if user already liked this post
      const [existingLike] = await connection.execute(
        "SELECT like_id FROM post_likes WHERE post_id = ? AND user_id = ?",
        [post_id, user_id]
      );

      if (existingLike.length > 0) {
        // Unlike: Remove from post_likes and decrement count
        await connection.execute(
          "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?",
          [post_id, user_id]
        );

        await connection.execute(
          "UPDATE post SET likes = GREATEST(likes - 1, 0) WHERE post_id = ?",
          [post_id]
        );

        console.log(`Post ${post_id} unliked by user ${user_id}`);

        res.status(200).json({
          message: "Post unliked successfully!",
          action: "unliked",
          liked: false,
        });
      } else {
        // Like: Add to post_likes and increment count
        await connection.execute(
          "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
          [post_id, user_id]
        );

        await connection.execute(
          "UPDATE post SET likes = likes + 1 WHERE post_id = ?",
          [post_id]
        );

        console.log(`Post ${post_id} liked by user ${user_id}`);

        res.status(200).json({
          message: "Post liked successfully!",
          action: "liked",
          liked: true,
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Like/Unlike post error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Comment API endpoints
// Create a comment on a post
app.post("/api/comments", async (req, res) => {
  try {
    const { post_id, user_id, comment_text } = req.body;

    // Validation
    if (!post_id || !user_id || !comment_text) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (comment_text.trim().length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty!" });
    }

    const connection = await pool.getConnection();

    try {
      // Check if post exists
      const [postCheck] = await connection.execute(
        "SELECT post_id FROM post WHERE post_id = ?",
        [post_id]
      );

      if (postCheck.length === 0) {
        return res.status(404).json({ message: "Post not found!" });
      }

      // Insert comment
      const [result] = await connection.execute(
        "INSERT INTO post_comment (post_id, user_id, comment_text, created_at) VALUES (?, ?, ?, NOW())",
        [post_id, user_id, comment_text.trim()]
      );

      console.log("Comment created with ID:", result.insertId);

      res.status(201).json({
        message: "Comment added successfully!",
        comment_id: result.insertId,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Get comments for a post
app.get("/api/comments/:post_id", async (req, res) => {
  try {
    const { post_id } = req.params;

    const connection = await pool.getConnection();

    try {
      const [comments] = await connection.execute(
        `SELECT 
          pc.comment_id,
          pc.post_id,
          pc.user_id,
          pc.comment_text,
          pc.created_at,
          u.name
        FROM post_comment pc
        JOIN USERS u ON pc.user_id = u.id
        WHERE pc.post_id = ?
        ORDER BY pc.created_at DESC`,
        [post_id]
      );

      res.status(200).json({
        message: "Comments retrieved successfully!",
        comments: comments,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Delete a comment
app.delete("/api/comments/:comment_id", async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required!" });
    }

    const connection = await pool.getConnection();

    try {
      // Check if comment exists and belongs to the user
      const [commentCheck] = await connection.execute(
        "SELECT user_id FROM post_comment WHERE comment_id = ?",
        [comment_id]
      );

      if (commentCheck.length === 0) {
        return res.status(404).json({ message: "Comment not found!" });
      }

      if (commentCheck[0].user_id !== parseInt(user_id)) {
        return res.status(403).json({ message: "You can only delete your own comments!" });
      }

      // Delete comment
      const [result] = await connection.execute(
        "DELETE FROM post_comment WHERE comment_id = ?",
        [comment_id]
      );

      console.log("Comment deleted with ID:", comment_id);

      res.status(200).json({
        message: "Comment deleted successfully!",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Collaboration Post API endpoints
// Create collaboration post
app.post("/api/collaboration-posts", async (req, res) => {
  try {
    const { workspaceId, title, content, authorId, authorName, authorEmail, workspaceOwnerId } = req.body;

    if (!workspaceId || !title || !content || !authorId || !authorName) {
      return res.status(400).json({ message: "Required fields missing!" });
    }

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        "INSERT INTO post_collaboration (workspace_id, title, content, author_id, author_name, author_email, workspace_owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [workspaceId, title, content, authorId, authorName, authorEmail, workspaceOwnerId]
      );

      console.log("Collaboration post created with ID:", result.insertId);

      res.status(201).json({
        message: "Collaboration post created successfully!",
        postId: result.insertId,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Collaboration post creation error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Get collaboration posts for a workspace
app.get("/api/collaboration-posts/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required!" });
    }

    const connection = await pool.getConnection();

    try {
      const [posts] = await connection.execute(
        "SELECT * FROM post_collaboration WHERE workspace_id = ? ORDER BY created_at DESC",
        [workspaceId]
      );

      res.status(200).json({
        message: "Collaboration posts retrieved successfully!",
        posts: posts,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get collaboration posts error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Get notifications for a user (collaboration posts from their workspaces)
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required!" });
    }

    const connection = await pool.getConnection();

    try {
      // Get collaboration posts where user is the workspace owner
      const [notifications] = await connection.execute(
        "SELECT * FROM post_collaboration WHERE workspace_owner_id = ? ORDER BY created_at DESC LIMIT 50",
        [userId]
      );

      res.status(200).json({
        message: "Notifications retrieved successfully!",
        notifications: notifications,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Delete collaboration post
app.delete("/api/collaboration-posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const connection = await pool.getConnection();

    try {
      const [result] = await connection.execute(
        "DELETE FROM post_collaboration WHERE post_id = ?",
        [postId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Post not found!" });
      }

      console.log("Collaboration post deleted with ID:", postId);

      res.status(200).json({
        message: "Collaboration post deleted successfully!",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Delete collaboration post error:", error);
    res.status(500).json({ message: "Server error! Please try again." });
  }
});

// Notifications API Endpoints

// Create a notification (Generic)
app.post("/api/notifications", async (req, res) => {
  try {
    const { userId, type, title, content } = req.body;

    if (!userId || !type || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        "INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)",
        [userId, type, title, content]
      );
      res.status(201).json({ message: "Notification created", id: result.insertId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Send Invite Notification (Lookup by email)
app.post("/api/notifications/invite", async (req, res) => {
  try {
    const { email, workspaceName, inviterName } = req.body;

    if (!email || !workspaceName || !inviterName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const connection = await pool.getConnection();
    try {
      // Find user by email
      const [users] = await connection.execute(
        "SELECT id FROM USERS WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const userId = users[0].id;
      const title = "New Workspace Invitation";
      const content = `${inviterName} invited you to join the workspace "${workspaceName}"`;

      const [result] = await connection.execute(
        "INSERT INTO notifications (user_id, type, title, content) VALUES (?, ?, ?, ?)",
        [userId, "invite", title, content]
      );

      res.status(201).json({ message: "Invite notification sent", id: result.insertId });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Invite notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get notifications for a user
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await pool.getConnection();
    try {
      const [notifications] = await connection.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        [userId]
      );
      res.status(200).json({ notifications });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Server listening
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
