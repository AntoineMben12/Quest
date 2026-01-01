// Check if user is logged in on page load
document.addEventListener("DOMContentLoaded", function () {
  // Get user from localStorage
  const userJSON = localStorage.getItem("user");

  if (!userJSON) {
    // If no user, redirect to login
    alert("Please login first!");
    window.location.href = "../Auth/Login/Login.html";
    return;
  }

  const user = JSON.parse(userJSON);
  initializeDashboard(user);
  setCurrentYear();
});

// Initialize dashboard with user data
function initializeDashboard(user) {
  // Sidebar profile
  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.textContent = user.name;

  const profileId = document.getElementById("profile-id");
  if (profileId) profileId.textContent = `User #${user.id}`;

  // User badge
  const userBadge = document.getElementById("user-badge");
  if (userBadge) userBadge.innerHTML = `<b>${user.id}</b>`;

  // Main profile heading
  const profileHeading = document.getElementById("profile-heading");
  if (profileHeading) profileHeading.textContent = user.name;

  // Main profile email
  const profileEmail = document.getElementById("profile-email");
  if (profileEmail) profileEmail.textContent = user.email;
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
