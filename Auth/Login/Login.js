// Function called when the login form is submitted
async function submitLogin(event) {
  event.preventDefault();

  // Get form values
  const LoginEmail = document.querySelector(".LoginEmail").value.trim();
  const LoginPassword = document.querySelector(".LoginPassword").value.trim();

  // Basic form validation
  if (!LoginEmail || !LoginPassword) {
    alert("Please fill in all fields!");
    return;
  }

  if (!LoginEmail.includes("@")) {
    alert("Please enter a valid email!");
    return;
  }

  try {
    // Send data to backend API endpoint
    const response = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: LoginEmail,
        password: LoginPassword,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Welcome back, ${data.user.name}!`);
      console.log("User logged in:", data.user);
      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      // Redirect to dashboard
      window.location.href = "../../Dashboard/Dashboard.html";
    } else {
      alert(data.message || "Login failed!");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during login. Please try again.");
  }
}

// Set current year in footer
document.addEventListener("DOMContentLoaded", function () {
  const yearElement = document.querySelector(".getTime");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});
