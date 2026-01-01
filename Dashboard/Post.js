// Post management functionality
document.addEventListener("DOMContentLoaded", function () {
  loadAndDisplayPosts();
  setupPostCreation();
  updatePostCount();
});

// Setup post creation form
function setupPostCreation() {
  const postTitleInput = document.getElementById("post-title");
  const postContentInput = document.getElementById("post-content");
  const postButtons = document.querySelectorAll("button");
  const postButton = Array.from(postButtons).find(btn => btn.textContent.trim() === "Post");

  if (postButton) {
    postButton.addEventListener("click", createPost);
  }

  // Allow Enter key to post (from content field)
  if (postContentInput) {
    postContentInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && e.ctrlKey === false) {
        createPost();
      }
    });
  }
}

// Create new post
function createPost() {
  const postTitleInput = document.getElementById("post-title");
  const postContentInput = document.getElementById("post-content");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("Please login first!");
    return;
  }

  if (!postTitleInput || !postTitleInput.value.trim()) {
    alert("Please enter a post title!");
    return;
  }

  if (!postContentInput || !postContentInput.value.trim()) {
    alert("Please write something to post!");
    return;
  }

  const title = postTitleInput.value.trim();
  const texts = postContentInput.value.trim();

  // Send to server
  fetch("http://localhost:3000/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: user.id,
      title: title,
      texts: texts,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message.includes("successfully")) {
        postTitleInput.value = "";
        postContentInput.value = "";
        alert("Post created successfully!");
        loadAndDisplayPosts();
        updatePostCount();
      } else {
        alert(data.message || "Error creating post!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to create post!");
    });
}

// Load and display posts
function loadAndDisplayPosts() {
  // Find the Recent Posts section and get its posts container
  const sections = document.querySelectorAll("section");
  let postsContainer = null;

  for (let section of sections) {
    const heading = section.querySelector("h3");
    if (heading && heading.textContent.includes("Recent Posts")) {
      postsContainer = section.querySelector(".flex.flex-col.gap-3");
      break;
    }
  }

  if (!postsContainer) return;

  // Get current user
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    postsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Please login to view posts</p>';
    return;
  }

  // Fetch only the current user's posts with like status
  fetch(`http://localhost:3000/api/posts/user/${user.id}?current_user_id=${user.id}`)
    .then((response) => response.json())
    .then((data) => {
      const posts = data.posts || [];

      if (posts.length === 0) {
        postsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No posts yet. Create one!</p>';
        updatePostCount();
        return;
      }

      postsContainer.innerHTML = posts
        .map(
          (post) => {
            // Determine if this is the user's own post
            const isOwnPost = post.user_id === user.id;
            // Determine like button style based on like status
            const likedClass = post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500';
            const heartIcon = post.user_liked ? 'favorite' : 'favorite_border';
            const likeTitle = post.user_liked ? 'Unlike this post' : 'Like this post';

            return `
      <div class="group flex items-center gap-4 rounded-xl bg-surface-light dark:bg-surface-dark p-3 pr-4 shadow-sm transition-all hover:shadow-md hover:translate-x-1">
        <div class="h-16 w-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
          <span class="material-symbols-outlined text-white">description</span>
        </div>
        <div class="flex flex-1 flex-col justify-center">
          <h4 class="font-bold text-text-main dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
            ${post.title}
          </h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">${post.texts}</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="rounded bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
              Published
            </span>
            <span class="text-xs text-gray-500">${getTimeAgo(post.created_at)}</span>
            <span class="text-xs text-red-500 font-semibold">${post.likes || 0} likes</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${!isOwnPost ? `
          <button class="${likedClass} transition-colors" onclick="likePost(${post.post_id})" title="${likeTitle}">
            <span class="material-symbols-outlined">${heartIcon}</span>
          </button>
          ` : ''}
          <button class="text-gray-400 hover:text-red-500 transition-colors" onclick="deletePost(${post.post_id})" title="Delete this post">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
          }
        )
        .join("");

      updatePostCount();
    })
    .catch((error) => {
      console.error("Error loading posts:", error);
      postsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Error loading posts</p>';
    });
}

// Delete post
function deletePost(postId) {
  if (confirm("Delete this post?")) {
    fetch(`http://localhost:3000/api/posts/${postId}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message.includes("successfully")) {
          alert("Post deleted successfully!");
          loadAndDisplayPosts();
          updatePostCount();
        } else {
          alert(data.message || "Error deleting post!");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to delete post!");
      });
  }
}

// Like/Unlike post (toggle)
function likePost(postId) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Please login first!");
    return;
  }

  fetch(`http://localhost:3000/api/posts/${postId}/like`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: user.id,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message.includes("successfully")) {
        // Refresh posts to show updated like status
        loadAndDisplayPosts();
        updatePostCount();
      } else {
        alert(data.message || "Error processing like!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to process like!");
    });
}

// Calculate relative time
function getTimeAgo(dateString) {
  const now = new Date();
  const posted = new Date(dateString);
  const seconds = Math.floor((now - posted) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Format numbers for display (1200 -> 1.2k)
function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

// Update active posts count and total likes
function updatePostCount() {
  // Get current user
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  // Fetch only the current user's posts
  fetch(`http://localhost:3000/api/posts/user/${user.id}`)
    .then((response) => response.json())
    .then((data) => {
      const posts = data.posts || [];

      // Calculate total likes (sum of all likes from the user's posts)
      const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);

      // Get post count from database
      const postCount = posts.length;

      // Update Active Posts count using ID
      const activePostsElement = document.getElementById("active-posts-count");
      if (activePostsElement) {
        activePostsElement.textContent = postCount;
      }

      // Update Total Likes count using ID with formatting
      const totalLikesElement = document.getElementById("total-likes-count");
      if (totalLikesElement) {
        totalLikesElement.textContent = formatNumber(totalLikes);
      }
    })
    .catch((error) => {
      console.error("Error updating post count:", error);
    });
}
