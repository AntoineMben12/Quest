// Multi-workspace collaboration with invite system
let currentWorkspaceId = null;
let currentUser = null;
let isLoading = false;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const userJSON = localStorage.getItem('user');
  if (!userJSON) {
    showError('Please login first!');
    setTimeout(() => {
      window.location.href = '../Auth/Login/Login.html';
    }, 1500);
    return;
  }
  currentUser = JSON.parse(userJSON);
  initData();
  renderWorkspaces();
  setupHandlers();
  setupWorkspaceRefresh();
});

function initData() {
  const existing = localStorage.getItem('collab_data');
  if (!existing) {
    const initial = { workspaces: [], nextWorkspaceId: 1 };
    localStorage.setItem('collab_data', JSON.stringify(initial));
  }
}

function getCollabData() {
  return JSON.parse(localStorage.getItem('collab_data') || '{}');
}

function saveCollabData(data) {
  localStorage.setItem('collab_data', JSON.stringify(data));
}

function setupHandlers() {
  // Create Workspace Modal
  document.getElementById('create-workspace-btn').addEventListener('click', () => {
    document.getElementById('create-workspace-modal').classList.remove('hidden');
    document.getElementById('workspace-name').focus();
  });

  document.getElementById('create-workspace-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('workspace-name').value.trim();
    const desc = document.getElementById('workspace-desc').value.trim();
    if (!name) {
      showError('Workspace name is required');
      return;
    }
    if (name.length > 100) {
      showError('Workspace name must be less than 100 characters');
      return;
    }
    await createWorkspace(name, desc);
    document.getElementById('create-workspace-form').reset();
    closeCreateWorkspaceModal();
  });

  // Search users form
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
      showError('Enter a search term');
      return;
    }
    if (query.length < 2) {
      showError('Search term must be at least 2 characters');
      return;
    }
    searchUsers(query);
  });

  // Invite user form
  document.getElementById('invite-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('invite-email').value.trim();
    if (!email) {
      showError('Enter email to invite');
      return;
    }
    if (!isValidEmail(email)) {
      showError('Enter a valid email address');
      return;
    }
    await inviteUserToWorkspace(currentWorkspaceId, email);
    document.getElementById('invite-form').reset();
  });

  // Create post form
  document.getElementById('collab-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('collab-post-title').value.trim();
    const content = document.getElementById('collab-post-content').value.trim();
    if (!title) {
      showError('Enter post title');
      return;
    }
    if (!content) {
      showError('Enter post content');
      return;
    }
    if (title.length > 255) {
      showError('Title must be less than 255 characters');
      return;
    }
    if (content.length > 5000) {
      showError('Content must be less than 5000 characters');
      return;
    }
    await createWorkspacePost(currentWorkspaceId, title, content);
    document.getElementById('collab-post-form').reset();
  });

  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCreateWorkspaceModal();
      closeWorkspaceModal();
    }
  });
}

function createWorkspace(name, desc) {
  const data = getCollabData();
  const ws = {
    workspaceId: data.nextWorkspaceId++,
    name,
    description: desc,
    ownerId: currentUser.id,
    ownerName: currentUser.name,
    members: [{ userId: currentUser.id, userEmail: currentUser.email, userName: currentUser.name, joinedAt: new Date().toISOString() }],
    posts: [],
    createdAt: new Date().toISOString()
  };
  data.workspaces.push(ws);
  saveCollabData(data);
  renderWorkspaces();
  showSuccess(`Workspace "${name}" created successfully!`);
}

function inviteUserToWorkspace(wsId, email) {
  const data = getCollabData();
  const ws = data.workspaces.find(w => w.workspaceId === wsId);
  if (!ws) {
    showError('Workspace not found');
    return;
  }

  // Validate email format
  if (!isValidEmail(email)) {
    showError('Invalid email format');
    return;
  }

  // Check if already invited
  if (ws.members.some(m => m.userEmail === email)) {
    showError('User already a member of this workspace');
    return;
  }

  // Check if trying to invite themselves
  if (email === currentUser.email) {
    showError('You are already a member of this workspace');
    return;
  }

  // Add member (in real app, you'd verify user exists in your system)
  ws.members.push({
    userId: `invited_${email}_${Date.now()}`,
    userEmail: email,
    userName: email.split('@')[0],
    joinedAt: new Date().toISOString()
  });
  saveCollabData(data);
  renderWorkspaceModal(wsId);

  // Send notification via backend
  fetch('http://localhost:3000/api/notifications/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      workspaceName: ws.name,
      inviterName: currentUser.name
    })
  }).catch(err => console.error('Failed to send invite notification:', err));

  showSuccess(`Invitation sent to ${email}!`);
}

function searchUsers(query) {
  const data = getCollabData();
  const results = new Set(); // Use Set to avoid duplicates
  const currentWorkspaceData = data.workspaces.find(w => w.workspaceId === currentWorkspaceId);
  const currentMembers = new Set(currentWorkspaceData?.members.map(m => m.userEmail) || []);

  // Search through all workspaces to find users and their posts
  data.workspaces.forEach(ws => {
    // Search by user name in members
    ws.members.forEach(member => {
      if (
        member.userName.toLowerCase().includes(query.toLowerCase()) &&
        !currentMembers.has(member.userEmail) &&
        member.userId !== currentUser.id
      ) {
        results.add(JSON.stringify({
          type: 'user',
          userId: member.userId,
          userName: member.userName,
          userEmail: member.userEmail
        }));
      }
    });

    // Search by post title and find post authors
    ws.posts.forEach(post => {
      if (post.title.toLowerCase().includes(query.toLowerCase())) {
        const postAuthor = ws.members.find(m => m.userId === post.authorId);
        if (
          postAuthor &&
          !currentMembers.has(postAuthor.userEmail) &&
          postAuthor.userId !== currentUser.id
        ) {
          results.add(JSON.stringify({
            type: 'user_from_post',
            userId: postAuthor.userId,
            userName: postAuthor.userName,
            userEmail: postAuthor.userEmail,
            postTitle: post.title
          }));
        }
      }
    });
  });

  displaySearchResults(Array.from(results).map(r => JSON.parse(r)));
}

function displaySearchResults(results) {
  const container = document.getElementById('search-results');

  if (results.length === 0) {
    container.classList.remove('hidden');
    container.innerHTML = '<div class="text-gray-500 text-sm">No users found matching your search.</div>';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = results.map(result => {
    const label = result.type === 'user_from_post'
      ? `<div class="text-xs text-gray-500">Created post: "${escapeHtml(result.postTitle)}"</div>`
      : '';

    return `
      <div class="flex items-center justify-between bg-surface-light dark:bg-background-dark p-2 rounded text-sm border dark:border-gray-600">
        <div>
          <div class="font-semibold">${escapeHtml(result.userName)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(result.userEmail)}</div>
          ${label}
        </div>
        <button
          type="button"
          class="rounded bg-green-500 text-white px-3 py-1 text-xs font-bold hover:bg-green-600"
          onclick="inviteUserByEmail('${result.userEmail}')"
        >
          Invite
        </button>
      </div>
    `;
  }).join('');
}

function inviteUserByEmail(email) {
  inviteUserToWorkspace(currentWorkspaceId, email);
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');
}

async function createWorkspacePost(wsId, title, content) {
  if (isLoading) return;
  isLoading = true;

  const submitBtn = document.querySelector('#collab-post-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
  }

  try {
    const data = getCollabData();
    const ws = data.workspaces.find(w => w.workspaceId === wsId);
    if (!ws) {
      showError('Workspace not found');
      return;
    }

    // Send to database
    const response = await fetch('http://localhost:3000/api/collaboration-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspaceId: wsId,
        title,
        content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        workspaceOwnerId: ws.ownerId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create post');
    }

    const result = await response.json();

    // Also store locally for immediate display
    const post = {
      postId: result.postId || `post_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    ws.posts.unshift(post);
    saveCollabData(data);
    renderWorkspaceModal(wsId);

    // Send notifications to other members
    ws.members.forEach(member => {
      // Don't notify self or if userId is temporary (invited but not joined real user)
      // Note: In a real app, you'd have real userIds. Here we try to notify if it looks like a real ID or we just skip if it's the current user.
      if (member.userId !== currentUser.id && !member.userId.toString().startsWith('invited_')) {
        fetch('http://localhost:3000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.userId,
            type: 'post',
            title: `New post in ${ws.name}`,
            content: `${currentUser.name} posted: "${title}"`
          })
        }).catch(err => console.error(`Failed to notify member ${member.userId}:`, err));
      }
    });

    showSuccess('Post created successfully!');
  } catch (error) {
    console.error('Error creating post:', error);
    showError(`Failed to create post: ${error.message}`);
  } finally {
    isLoading = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  }
}

async function deleteWorkspacePost(wsId, postId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

  try {
    const response = await fetch(`http://localhost:3000/api/collaboration-posts/${postId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete post');
    }

    const data = getCollabData();
    const ws = data.workspaces.find(w => w.workspaceId === wsId);
    if (ws) {
      ws.posts = ws.posts.filter(p => p.postId !== postId);
      saveCollabData(data);
      renderWorkspaceModal(wsId);
      showSuccess('Post deleted successfully!');
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    showError(`Failed to delete post: ${error.message}`);
  }
}

function deleteWorkspace(wsId) {
  if (!confirm('Are you sure you want to delete this workspace? All posts and members will be removed. This cannot be undone.')) return;
  const data = getCollabData();
  const ws = data.workspaces.find(w => w.workspaceId === wsId);
  if (ws && ws.ownerId !== currentUser.id) {
    showError('Only the workspace owner can delete the workspace');
    return;
  }
  data.workspaces = data.workspaces.filter(w => w.workspaceId !== wsId);
  saveCollabData(data);
  closeWorkspaceModal();
  renderWorkspaces();
  showSuccess('Workspace deleted successfully!');
}

function removeMemberFromWorkspace(wsId, userId) {
  if (!confirm('Are you sure you want to remove this member from the workspace?')) return;

  const data = getCollabData();
  const ws = data.workspaces.find(w => w.workspaceId === wsId);
  if (ws) {
    if (ws.ownerId !== currentUser.id) {
      showError('Only the owner can remove members');
      return;
    }

    const member = ws.members.find(m => m.userId === userId);
    if (member && member.userId === currentUser.id) {
      showError('You cannot remove yourself as the owner');
      return;
    }

    ws.members = ws.members.filter(m => m.userId !== userId);
    saveCollabData(data);
    renderWorkspaceModal(wsId);
    showSuccess(`Member ${member?.userName || 'removed'} removed successfully!`);
  }
}

function renderWorkspaces() {
  const data = getCollabData();
  const container = document.getElementById('workspaces-container');

  // Get workspaces the current user is a member of
  const myWorkspaces = data.workspaces.filter(ws =>
    ws.members.some(m => m.userId === currentUser.id || m.userEmail === currentUser.email)
  );

  if (myWorkspaces.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 block mb-4">group</span>
        <h3 class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Workspaces Yet</h3>
        <p class="text-gray-500 dark:text-gray-500 mb-6">Create a new workspace to get started with collaboration</p>
        <button onclick="document.getElementById('create-workspace-btn').click()"
          class="rounded-xl bg-primary px-6 py-3 font-bold text-black hover:bg-primary-dark transition-all shadow-lg">
          Create Your First Workspace
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = myWorkspaces.map(ws => {
    const isOwner = ws.ownerId === currentUser.id;
    const memberCount = ws.members.length;
    const postCount = ws.posts.length;

    return `
      <div class="workspace-card rounded-xl bg-surface-light dark:bg-surface-dark p-5 shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer"
           onclick="openWorkspaceModal(${ws.workspaceId})">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-lg font-bold text-text-main dark:text-white break-words">${escapeHtml(ws.name)}</h3>
          </div>
          ${isOwner ? '<span class="bg-primary text-black px-3 py-1 text-xs font-bold rounded-full">Owner</span>' : '<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 px-3 py-1 text-xs rounded-full">Member</span>'}
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">${escapeHtml(ws.description || 'No description added')}</p>
        <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">people</span>
              <span>${memberCount}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">article</span>
              <span>${postCount}</span>
            </div>
          </div>
          <button onclick="openWorkspaceModal(${ws.workspaceId}); event.stopPropagation();"
            class="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openWorkspaceModal(wsId) {
  const data = getCollabData();
  const ws = data.workspaces.find(w => w.workspaceId === wsId);
  if (!ws) return;

  currentWorkspaceId = wsId;
  document.getElementById('workspace-modal-name').textContent = ws.name;
  renderWorkspaceModal(wsId);
  document.getElementById('workspace-modal').classList.remove('hidden');
}

function renderWorkspaceModal(wsId) {
  const data = getCollabData();
  const ws = data.workspaces.find(w => w.workspaceId === wsId);
  if (!ws) return;

  const isOwner = ws.ownerId === currentUser.id;

  // Render members
  const membersDiv = document.getElementById('workspace-members');
  membersDiv.innerHTML = ws.members.map(m => {
    const isCurrentUser = m.userId === currentUser.id || m.userEmail === currentUser.email;
    return `
      <div class="flex items-center justify-between bg-background-light dark:bg-background-dark p-2 rounded text-sm">
        <div>
          <div class="font-semibold">${escapeHtml(m.userName)}</div>
          <div class="text-xs text-gray-500">${escapeHtml(m.userEmail)}</div>
        </div>
        <div class="flex gap-2">
          ${isCurrentUser ? '<span class="text-xs bg-primary text-black px-2 py-1 rounded">You</span>' : ''}
          ${isOwner && !isCurrentUser ? `<button class="text-red-500 text-xs" onclick="removeMemberFromWorkspace(${wsId}, '${m.userId}')">Remove</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update members count
  const membersCountSpan = document.getElementById('members-count');
  if (membersCountSpan) {
    membersCountSpan.textContent = ws.members.length;
  }

  // Render posts
  const postsDiv = document.getElementById('workspace-posts');
  if (ws.posts.length === 0) {
    postsDiv.innerHTML = '<div class="text-gray-500 text-sm">No posts yet. Create one to start collaborating!</div>';
  } else {
    postsDiv.innerHTML = ws.posts.map(p => {
      const isAuthor = p.authorId === currentUser.id;
      return `
        <div class="border rounded p-3 bg-background-light dark:bg-background-dark" data-post-id="${escapeHtml(p.postId)}" data-ws-id="${wsId}">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold">${escapeHtml(p.title)}</div>
              <div class="text-xs text-gray-500">by ${escapeHtml(p.authorName)} • ${timeAgo(p.createdAt)}</div>
            </div>
            ${isAuthor ? `<button class="text-red-500 text-xs delete-post-btn">Delete</button>` : ''}
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(p.content)}</p>
        </div>
      `;
    }).join('');

    // Attach event listeners to delete buttons
    postsDiv.querySelectorAll('.delete-post-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postElement = e.target.closest('[data-post-id]');
        const postId = postElement.dataset.postId;
        const wsId = parseInt(postElement.dataset.wsId);
        deleteWorkspacePost(wsId, postId);
      });
    });
  }
}

function closeWorkspaceModal() {
  document.getElementById('workspace-modal').classList.add('hidden');
  currentWorkspaceId = null;
}

function closeCreateWorkspaceModal() {
  document.getElementById('create-workspace-modal').classList.add('hidden');
}

// Auto-refresh workspaces every 30 seconds
function setupWorkspaceRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    renderWorkspaces();
    if (currentWorkspaceId) {
      renderWorkspaceModal(currentWorkspaceId);
    }
  }, 30000);
}

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function timeAgo(iso) {
  const now = new Date();
  const d = new Date(iso);
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return 'just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

// Toast notification system
function showSuccess(message) {
  showToast(message, 'success');
}

function showError(message) {
  showToast(message, 'error');
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
    <span class="material-symbols-outlined">${icon}</span>
    <span>${escapeHtml(message)}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-slideOutRight');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animation styles
const style = document.createElement('style');
style.textContent = `
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

  .animate-slideInRight {
    animation: slideInRight 0.3s ease-out forwards;
  }

  .animate-slideOutRight {
    animation: slideOutRight 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

// Expose functions to global scope for inline handlers
window.openWorkspaceModal = openWorkspaceModal;
window.deleteWorkspacePost = deleteWorkspacePost;
window.deleteWorkspace = deleteWorkspace;
window.removeMemberFromWorkspace = removeMemberFromWorkspace;
window.closeWorkspaceModal = closeWorkspaceModal;
window.closeCreateWorkspaceModal = closeCreateWorkspaceModal;
window.inviteUserByEmail = inviteUserByEmail;
window.showError = showError;
window.showSuccess = showSuccess;
window.renderWorkspaceModal = renderWorkspaceModal;
