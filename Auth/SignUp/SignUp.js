
// Function called when the form is submitted
async function submitNewUser(event) {
  event.preventDefault(); // Prevent form default submission

  // Get form values when the function is called
  const UserName = document.querySelector(".SignUpUserName").value.trim();
  const UserEmail = document.querySelector(".SignUpEmail").value.trim();
  const UserPassword = document.querySelector(".SignUpUserPassword").value.trim();

  // Basic form validation
  if (!UserName || !UserEmail || !UserPassword) {
    alert("Please fill in all fields!");
    return;
  }

  if (!UserEmail.includes("@")) {
    alert("Please enter a valid email!");
    return;
  }

  if (UserPassword.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }

  try {
    // Send data to backend API endpoint
    const response = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: UserName,
        email: UserEmail,
        password: UserPassword,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Account created successfully!");
      console.log("welcome: ", UserName);
      // Store user info and redirect to dashboard
      localStorage.setItem("user", JSON.stringify({
        id: data.userId,
        name: UserName,
        email: UserEmail,
      }));
      window.location.href = "../../Dashboard/Dashboard.html";
    } else {
      alert(data.message || "Signup failed!");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during signup. Please try again.");
  }
}

// Set current year in footer
document.addEventListener("DOMContentLoaded", function () {
  const yearElement = document.querySelector(".getTime");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

