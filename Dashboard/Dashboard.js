// Check if user is logged in on page load
document.addEventListener("DOMContentLoaded", function () {
  const userJSON = localStorage.getItem("user");

  if (!userJSON) {
    alert("Please login first!");
    window.location.href = "../Auth/Login/Login.html";
    return;
  }

  const user = JSON.parse(userJSON);
  initializeDashboard(user);
  setupPostForm();
  setCurrentYear();
});

// Initialize dashboard with user data
function initializeDashboard(user) {
  // Sidebar profile
  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.textContent = user.name;

  const profileId = document.getElementById("profile-id");
  if (profileId) profileId.textContent = `User #${user.id}`;

  // Main profile heading
  const profileHeading = document.getElementById("profile-heading");
  if (profileHeading) profileHeading.textContent = user.name;

  // Main profile email
  const profileEmail = document.getElementById("profile-email");
  if (profileEmail) profileEmail.textContent = user.email;
}

// Setup post form toggle and submission
function setupPostForm() {
  const simpleInput = document.getElementById("post-simple-input");
  const expandedForm = document.getElementById("expanded-post-form");
  const postInputView = document.getElementById("post-input-view");
  const cancelBtn = document.getElementById("cancel-post-btn");
  const submitBtn = document.getElementById("submit-post-btn");
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");
  const charCount = document.getElementById("char-count");

  if (!simpleInput || !expandedForm) return;

  // Show expanded form when clicking simple input
  simpleInput.addEventListener("click", function () {
    expandedForm.classList.remove("hidden");
    postInputView.classList.add("hidden");
    titleInput?.focus();
  });

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      expandedForm.classList.add("hidden");
      postInputView.classList.remove("hidden");
      titleInput.value = "";
      contentInput.value = "";
      charCount.textContent = "0";
    });
  }

  // Character counter for content
  if (contentInput) {
    contentInput.addEventListener("input", function () {
      charCount.textContent = this.value.length;
    });
  }

  // Submit button
  if (submitBtn) {
    submitBtn.addEventListener("click", createPost);
  }

  // Allow Ctrl+Enter to submit
  if (contentInput) {
    contentInput.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key === "Enter") {
        createPost();
      }
    });
  }
}

// Create new post
function createPost() {
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("Please login first!");
    return;
  }

  if (!titleInput?.value.trim()) {
    alert("Please enter a post title!");
    titleInput?.focus();
    return;
  }

  if (!contentInput?.value.trim()) {
    alert("Please write something to post!");
    contentInput?.focus();
    return;
  }

  const title = titleInput.value.trim();
  const texts = contentInput.value.trim();

  // Disable button during submission
  const submitBtn = document.getElementById("submit-post-btn");
  if (submitBtn) submitBtn.disabled = true;

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
        titleInput.value = "";
        contentInput.value = "";
        document.getElementById("char-count").textContent = "0";
        document.getElementById("expanded-post-form").classList.add("hidden");
        document.getElementById("post-input-view").classList.remove("hidden");
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
    })
    .finally(() => {
      if (submitBtn) submitBtn.disabled = false;
    });
}

// Set current year in footer
function setCurrentYear() {
  const yearElement = document.querySelector(".getTime");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("user");
    alert("Logged out successfully!");
    window.location.href = "../Auth/Login/Login.html";
  }
}
