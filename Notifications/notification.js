let currentUser = null;
let notifications = [];
let refreshInterval = null;
let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  const userJSON = localStorage.getItem('user');
  if (!userJSON) {
    showToast('Please login first!', 'error');
    setTimeout(() => {
      window.location.href = '../Auth/Login/Login.html';
    }, 1500);
    return;
  }

  try {
    currentUser = JSON.parse(userJSON);
    if (!currentUser.id) {
      throw new Error('Invalid user data');
    }

    initializeNotifications();
  } catch (error) {
    console.error('Error initializing:', error);
    showToast('Error loading user data', 'error');
  }
});

function initializeNotifications() {
  if (isInitialized) return;
  isInitialized = true;

  loadNotifications();
  setupRefreshInterval();
  setupEventListeners();
}

function setupEventListeners() {
  // Manual refresh button
  const markAllBtn = document.querySelector('button');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', loadNotifications);
  }

  // Listen for visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (refreshInterval) clearInterval(refreshInterval);
    } else {
      loadNotifications();
      setupRefreshInterval();
    }
  });
}

function setupRefreshInterval() {
  if (refreshInterval) clearInterval(refreshInterval);
  // Auto-refresh notifications every 4 seconds
  refreshInterval = setInterval(loadNotifications, 4000);
}

async function loadNotifications() {
  if (!currentUser || !currentUser.id) return;

  try {
    const response = await fetch(`http://localhost:3000/api/notifications/${currentUser.id}`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    notifications = Array.isArray(data.notifications) ? data.notifications : [];
    renderNotifications();
  } catch (error) {
    console.error('Error loading notifications:', error);

    // Show error message if it's a connection issue
    if (notifications.length === 0) {
      const container = document.getElementById('notifications-container');
      if (container) {
        container.innerHTML = `
          <div class="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl text-center border border-yellow-200 dark:border-yellow-900">
            <span class="material-symbols-outlined text-4xl text-yellow-600 dark:text-yellow-400 block mb-3">warning</span>
            <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-2">Cannot Connect to Server</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Make sure Node.js server is running on port 3000</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary-dark transition-colors">
              Try Again
            </button>
          </div>
        `;
      }
    }
  }
}

function renderNotifications() {
  const container = document.getElementById('notifications-container');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
        <span class="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 block mb-3">notifications_none</span>
        <h3 class="font-semibold text-gray-600 dark:text-gray-400 mb-2">No Notifications</h3>
        <p class="text-sm text-gray-500">When your team posts in your workspaces, you'll see them here</p>
      </div>
    `;
    return;
  }

  const notificationHTML = notifications.map((notif, index) => {
    // Basic validation
    if (!notif.title || !notif.created_at) {
      return '';
    }

    const createdDate = new Date(notif.created_at);
    const formattedDate = formatDate(createdDate);
    const timeString = createdDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    let icon = 'notifications';
    let iconColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

    if (notif.type === 'invite') {
      icon = 'group_add';
      iconColor = 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    } else if (notif.type === 'post') {
      icon = 'article';
      iconColor = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    }

    return `
      <div class="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl shadow-sm flex gap-4 items-start border-l-4 border-primary animate-slideIn"
           style="animation-delay: ${Math.min(index * 50, 200)}ms">
        <div class="h-12 w-12 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-lg">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <h3 class="font-semibold text-base text-text-main dark:text-white break-words">
                ${escapeHtml(notif.title)}
              </h3>
            </div>
            <span class="text-xs text-gray-400 whitespace-nowrap">${timeString}</span>
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-300 break-words">
            ${escapeHtml(notif.content)}
          </div>
          <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>${formattedDate}</span>
          </div>
        </div>
      </div>
    `;
  }).filter(html => html !== '').join('');

  container.innerHTML = notificationHTML || `
    <div class="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl text-center">
      <p class="text-gray-500">No valid notifications to display</p>
    </div>
  `;
}

function formatDate(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.getElementById('toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';

  toast.className = `fixed top-6 right-6 ${bgColor} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-slideInRight`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-sm">${icon}</span>
    <span class="text-sm">${escapeHtml(message)}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-slideOutRight');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(400px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(400px);
    }
  }
  
  .animate-slideIn {
    animation: slideIn 0.3s ease-out forwards;
  }

  .animate-slideInRight {
    animation: slideInRight 0.3s ease-out forwards;
  }

  .animate-slideOutRight {
    animation: slideOutRight 0.3s ease-out forwards;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(style);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
});
