// Post display functionality
document.addEventListener("DOMContentLoaded", function () {
    loadAllPosts();
    setupSearch();
    setCurrentYear();
    setupSidebar();
});

// Store all posts for search functionality
let allPosts = [];
let displayedPosts = [];
let currentSidebarPostId = null;

// Load all posts from server
function loadAllPosts() {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user ? user.id : null;

    // Build URL with optional user_id for like status
    const url = userId
        ? `http://localhost:3000/api/posts?current_user_id=${userId}`
        : "http://localhost:3000/api/posts";

    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            allPosts = data.posts || [];

            // Limit to first 30 posts
            displayedPosts = allPosts.slice(0, 30);

            displayPosts(displayedPosts);
            updateStats();
        })
        .catch((error) => {
            console.error("Error loading posts:", error);
            document.getElementById("posts-container").innerHTML =
                '<div class="col-span-full text-center py-12"><p class="text-red-500">Error loading posts. Please try again.</p></div>';
        });
}

// Display posts in grid
function displayPosts(posts) {
    const container = document.getElementById("posts-container");
    const noResults = document.getElementById("no-results");
    const user = JSON.parse(localStorage.getItem("user"));

    if (posts.length === 0) {
        container.innerHTML = "";
        container.classList.add("hidden");
        noResults.classList.remove("hidden");
        return;
    }

    container.classList.remove("hidden");
    noResults.classList.add("hidden");

    container.innerHTML = posts
        .map((post) => {
            const isOwnPost = user && post.user_id === user.id;
            const likedClass = post.user_liked
                ? "text-red-500"
                : "text-gray-400 hover:text-red-500";
            const heartIcon = post.user_liked ? "favorite" : "favorite_border";
            const likeTitle = post.user_liked ? "Unlike this post" : "Like this post";

            return `
        <article class="group rounded-2xl bg-surface-light dark:bg-surface-dark p-6 shadow-sm hover:shadow-md transition-all">
          <!-- Post Header -->
          <div class="flex items-center gap-3 mb-4">
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span class="material-symbols-outlined text-white text-xl">person</span>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-text-main dark:text-white">${post.name}</h3>
              <p class="text-xs text-gray-500">${getTimeAgo(post.created_at)}</p>
            </div>
          </div>

          <!-- Post Content -->
          <div class="mb-4">
            <h2 class="text-xl font-bold text-text-main dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              ${post.title}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              ${post.texts}
            </p>
          </div>

          <!-- Post Footer -->
          <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mb-4">
            <div class="flex items-center gap-4">
              ${!isOwnPost && user
                    ? `
              <button class="${likedClass} transition-colors flex items-center gap-1" onclick="likePost(${post.post_id})" title="${likeTitle}">
                <span class="material-symbols-outlined">${heartIcon}</span>
                <span class="text-sm font-semibold">${post.likes || 0}</span>
              </button>
              `
                    : `
              <div class="flex items-center gap-1 text-gray-400">
                <span class="material-symbols-outlined">favorite_border</span>
                <span class="text-sm font-semibold">${post.likes || 0}</span>
              </div>
              `
                }
              <button class="text-gray-400 hover:text-primary transition-colors flex items-center gap-1" onclick="toggleComments(${post.post_id})" title="View comments">
                <span class="material-symbols-outlined">comment</span>
                <span class="text-sm font-semibold" id="comment-count-${post.post_id}">0</span>
              </button>
            </div>
            <span class="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide">
              Published
            </span>
          </div>

          <!-- Comments Section -->
          <div id="comments-section-${post.post_id}" class="hidden">
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <!-- Comments List -->
              <div id="comments-list-${post.post_id}" class="mb-4 max-h-64 overflow-y-auto">
                <p class="text-sm text-gray-500 text-center py-2">Loading comments...</p>
              </div>

              <!-- Add Comment Form -->
              ${user ? `
              <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                <textarea id="comment-input-${post.post_id}" placeholder="Add a comment..." maxlength="500"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark text-text-main dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none" rows="2"></textarea>
                <button onclick="submitComment(${post.post_id})" class="mt-2 px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:bg-primary-dark transition-colors text-sm w-full">
                  Post Comment
                </button>
              </div>
              ` : `
              <div class="text-center py-4">
                <p class="text-sm text-gray-500"><a href="../Auth/Login/Login.html" class="text-primary hover:underline">Login</a> to comment</p>
              </div>
              `}
            </div>
          </div>
        </article>
      `;
        })
        .join("");

    // Update displayed count
    document.getElementById("displayed-count").textContent = posts.length;
}

// Setup search functionality
function setupSearch() {
    const searchInputDesktop = document.getElementById("search-input");
    const searchInputMobile = document.getElementById("search-input-mobile");

    // Desktop search
    if (searchInputDesktop) {
        searchInputDesktop.addEventListener("input", (e) => {
            performSearch(e.target.value);
            // Sync mobile input
            if (searchInputMobile) searchInputMobile.value = e.target.value;
        });
    }

    // Mobile search
    if (searchInputMobile) {
        searchInputMobile.addEventListener("input", (e) => {
            performSearch(e.target.value);
            // Sync desktop input
            if (searchInputDesktop) searchInputDesktop.value = e.target.value;
        });
    }
}

// Perform search based on keywords
function performSearch(query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        // Show first 30 posts if search is empty
        displayedPosts = allPosts.slice(0, 30);
        displayPosts(displayedPosts);
        return;
    }

    // Filter posts based on title, content, or author name
    const filtered = allPosts.filter((post) => {
        return (
            post.title.toLowerCase().includes(searchTerm) ||
            post.texts.toLowerCase().includes(searchTerm) ||
            post.name.toLowerCase().includes(searchTerm)
        );
    });

    // Limit to first 30 matching results
    displayedPosts = filtered.slice(0, 30);
    displayPosts(displayedPosts);
}

// Like/Unlike post (toggle)
function likePost(postId) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login to like posts!");
        window.location.href = "../Auth/Login/Login.html";
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
                // Reload posts to show updated like status
                loadAllPosts();
            } else {
                alert(data.message || "Error processing like!");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to process like!");
        });
}

// Update statistics
function updateStats() {
    const totalPosts = allPosts.length;
    const totalLikes = allPosts.reduce((sum, post) => sum + (post.likes || 0), 0);

    document.getElementById("total-posts-count").textContent = totalPosts;
    document.getElementById("total-likes-all").textContent = formatNumber(totalLikes);
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
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
}

// Format numbers for display (1200 -> 1.2k)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
}

// Set current year in footer
function setCurrentYear() {
    const yearElement = document.getElementById("current-year");
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Toggle comments section
function toggleComments(postId) {
    currentSidebarPostId = postId;
    const post = allPosts.find(p => p.post_id === postId);
    
    // Set sidebar title to the post title
    if (post) {
        document.getElementById("comments-sidebar-title").textContent = `Comments on "${post.title}"`;
    }
    
    // Show sidebar
    const sidebar = document.getElementById("comments-sidebar");
    const overlay = document.getElementById("comments-sidebar-overlay");
    sidebar.classList.remove("translate-x-full");
    overlay.classList.remove("hidden");
    
    // Load comments
    loadCommentsSidebar(postId);
}

// Load comments for a post
function loadComments(postId) {
    fetch(`http://localhost:3000/api/comments/${postId}`)
        .then((response) => response.json())
        .then((data) => {
            const commentsList = document.getElementById(`comments-list-${postId}`);
            const commentCount = document.getElementById(`comment-count-${postId}`);
            const comments = data.comments || [];

            // Update comment count
            commentCount.textContent = comments.length;

            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-2">No comments yet. Be the first to comment!</p>';
                return;
            }

            const user = JSON.parse(localStorage.getItem("user"));

            commentsList.innerHTML = comments
                .map((comment) => {
                    const isOwnComment = user && comment.user_id === user.id;
                    return `
                    <div class="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                          <p class="text-sm font-semibold text-text-main dark:text-white">${comment.name}</p>
                          <p class="text-xs text-gray-500 mb-1">${getTimeAgo(comment.created_at)}</p>
                          <p class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(comment.comment_text)}</p>
                        </div>
                        ${isOwnComment ? `
                        <button onclick="deleteComment(${comment.comment_id})" class="text-gray-400 hover:text-red-500 transition-colors" title="Delete comment">
                          <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                })
                .join("");
        })
        .catch((error) => {
            console.error("Error loading comments:", error);
            const commentsList = document.getElementById(`comments-list-${postId}`);
            commentsList.innerHTML = '<p class="text-sm text-red-500 text-center py-2">Error loading comments</p>';
        });
}

// Submit a new comment
function submitComment(postId) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login to comment!");
        window.location.href = "../Auth/Login/Login.html";
        return;
    }

    const commentInput = document.getElementById(`comment-input-${postId}`);
    const commentText = commentInput.value.trim();

    if (!commentText) {
        alert("Comment cannot be empty!");
        return;
    }

    fetch("http://localhost:3000/api/comments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            post_id: postId,
            user_id: user.id,
            comment_text: commentText,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message.includes("successfully")) {
                commentInput.value = "";
                loadComments(postId);
            } else {
                alert(data.message || "Error posting comment!");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to post comment!");
        });
}

// Delete a comment
function deleteComment(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) {
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login to delete comments!");
        return;
    }

    fetch(`http://localhost:3000/api/comments/${commentId}`, {
        method: "DELETE",
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
                // Find the post ID from the comment and reload comments
                const allCommentSections = document.querySelectorAll('[id^="comments-list-"]');
                allCommentSections.forEach((section) => {
                    const postId = section.id.replace("comments-list-", "");
                    loadComments(postId);
                });
            } else {
                alert(data.message || "Error deleting comment!");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to delete comment!");
        });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Setup sidebar functionality
function setupSidebar() {
    const sidebar = document.getElementById("comments-sidebar");
    const overlay = document.getElementById("comments-sidebar-overlay");
    const closeBtn = document.getElementById("comments-sidebar-close");
    const submitBtn = document.getElementById("comment-submit-sidebar");
    
    // Close button
    closeBtn.addEventListener("click", closeSidebar);
    
    // Overlay click to close
    overlay.addEventListener("click", closeSidebar);
    
    // Submit comment button
    submitBtn.addEventListener("click", submitCommentSidebar);
    
    // Enter key to submit (Shift+Enter for new line)
    document.getElementById("comment-input-sidebar").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitCommentSidebar();
        }
    });
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.getElementById("comments-sidebar");
    const overlay = document.getElementById("comments-sidebar-overlay");
    sidebar.classList.add("translate-x-full");
    overlay.classList.add("hidden");
    currentSidebarPostId = null;
}

// Load comments into sidebar
function loadCommentsSidebar(postId) {
    const commentsList = document.getElementById("comments-sidebar-list");
    const commentCount = document.getElementById(`comment-count-${postId}`);
    commentsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Loading comments...</p>';
    
    fetch(`http://localhost:3000/api/comments/${postId}`)
        .then((response) => response.json())
        .then((data) => {
            const comments = data.comments || [];
            const user = JSON.parse(localStorage.getItem("user"));
            
            // Update comment count badge on the post card
            if (commentCount) {
                commentCount.textContent = comments.length;
            }
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No comments yet. Be the first!</p>';
                return;
            }
            
            commentsList.innerHTML = comments
                .map((comment) => {
                    const isOwnComment = user && comment.user_id === user.id;
                    return `
                    <div class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-text-main dark:text-white">${comment.name}</p>
                          <p class="text-xs text-gray-500 mb-1">${getTimeAgo(comment.created_at)}</p>
                          <p class="text-sm text-gray-700 dark:text-gray-300 break-words">${escapeHtml(comment.comment_text)}</p>
                        </div>
                        ${isOwnComment ? `
                        <button onclick="deleteCommentSidebar(${comment.comment_id})" class="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Delete comment">
                          <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                })
                .join("");
        })
        .catch((error) => {
            console.error("Error loading comments:", error);
            commentsList.innerHTML = '<p class="text-sm text-red-500 text-center py-4">Error loading comments</p>';
        });
}

// Submit comment from sidebar
function submitCommentSidebar() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login to comment!");
        window.location.href = "../Auth/Login/Login.html";
        return;
    }
    
    if (!currentSidebarPostId) {
        alert("No post selected!");
        return;
    }
    
    const commentInput = document.getElementById("comment-input-sidebar");
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        alert("Comment cannot be empty!");
        return;
    }
    
    fetch("http://localhost:3000/api/comments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            post_id: currentSidebarPostId,
            user_id: user.id,
            comment_text: commentText,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message.includes("successfully")) {
                commentInput.value = "";
                loadCommentsSidebar(currentSidebarPostId);
            } else {
                alert(data.message || "Error posting comment!");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to post comment!");
        });
}

// Delete comment from sidebar
function deleteCommentSidebar(commentId) {
    if (!confirm("Are you sure you want to delete this comment?")) {
        return;
    }
    
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login to delete comments!");
        return;
    }
    
    fetch(`http://localhost:3000/api/comments/${commentId}`, {
        method: "DELETE",
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
                if (currentSidebarPostId) {
                    loadCommentsSidebar(currentSidebarPostId);
                }
            } else {
                alert(data.message || "Error deleting comment!");
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Failed to delete comment!");
        });
}
