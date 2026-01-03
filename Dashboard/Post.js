// Post management functionality
document.addEventListener("DOMContentLoaded", function () {
  loadAndDisplayPosts();
  updatePostCount();
});

// Load and display posts
function loadAndDisplayPosts() {
  const postsContainer = document.getElementById("posts-container");
  if (!postsContainer) return;

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
        postsContainer.innerHTML = `
          <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <span class="material-symbols-outlined text-4xl opacity-50 block mb-2">draft</span>
            <p>No posts yet. Create your first post!</p>
          </div>
        `;
        updatePostCount();
        return;
      }

      postsContainer.innerHTML = posts
        .map((post) => {
          const isOwnPost = post.user_id === user.id;
          const likedClass = post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500';
          const heartIcon = post.user_liked ? 'favorite' : 'favorite_border';
          const likeTitle = post.user_liked ? 'Unlike this post' : 'Like this post';

          return `
            <div class="group post-card flex flex-col rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 p-5 lg:p-6 hover:border-primary/50">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <div class="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <span class="material-symbols-outlined text-white">description</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-text-main dark:text-white line-clamp-2 text-lg group-hover:text-primary transition-colors">
                      ${post.title}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">${post.texts}</p>
                  </div>
                </div>
                <div class="flex-shrink-0 ml-2 flex gap-1">
                  ${!isOwnPost ? `
                  <button class="${likedClass} transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5" 
                    onclick="likePost(${post.post_id})" title="${likeTitle}">
                    <span class="material-symbols-outlined">${heartIcon}</span>
                  </button>
                  ` : ''}
                  <button class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5" 
                    onclick="deletePost(${post.post_id})" title="Delete this post">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              
              <div class="flex items-center gap-3 flex-wrap text-xs">
                <span class="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                  Published
                </span>
                <span class="text-gray-500 dark:text-gray-400">${getTimeAgo(post.created_at)}</span>
                <span class="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                  <span class="material-symbols-outlined text-sm">favorite</span>
                  ${post.likes || 0}
                </span>
              </div>
            </div>
          `;
        })
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
  if (confirm("Delete this post permanently?")) {
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
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  fetch(`http://localhost:3000/api/posts/user/${user.id}`)
    .then((response) => response.json())
    .then((data) => {
      const posts = data.posts || [];

      // Calculate total likes
      const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);

      // Get post count
      const postCount = posts.length;

      // Update Active Posts count
      const activePostsElement = document.getElementById("active-posts-count");
      if (activePostsElement) {
        activePostsElement.textContent = postCount;
      }

      // Update Total Likes count with formatting
      const totalLikesElement = document.getElementById("total-likes-count");
      if (totalLikesElement) {
        totalLikesElement.textContent = formatNumber(totalLikes);
      }
    })
    .catch((error) => {
      console.error("Error updating post count:", error);
    });
}
