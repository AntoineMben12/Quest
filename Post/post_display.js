// Post display functionality
document.addEventListener("DOMContentLoaded", function () {
    loadAllPosts();
    setupSearch();
    setCurrentYear();
});

// Store all posts for search functionality
let allPosts = [];
let displayedPosts = [];

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
          <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
            </div>
            <span class="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide">
              Published
            </span>
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
