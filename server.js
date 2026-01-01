const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "questing",
  waitForConnections: true,
  connectionLimit: 10,
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

      // Insert new user
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

      // Simple password check (in production, use bcrypt!)
      if (user.password !== password) {
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

// Server listening
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
