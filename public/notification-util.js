// Auto-request notification permission when user lands
function initChatNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// Unlock audio on first user interaction (Chrome requirement)
function unlockAudio() {
  const silent = new Audio('/notification.mp3');
  silent.volume = 0;
  silent.play().then(() => {
    silent.pause();
    silent.currentTime = 0;
  }).catch(() => {});
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
}

// Trigger sound + system notification on new DM
function playChatAlert(senderName, messageText) {
  // Play sound
  const audio = new Audio('/notification.mp3');
  audio.volume = 1.0;
  audio.play().catch(() => {});

  // Show system notification
  if (window.Notification && Notification.permission === "granted") {
    const options = {
      body: messageText || "Sent a message",
      icon: '/favicon.svg',
      tag: 'shhchats-message',
      renotify: true
    };
    try {
      new Notification(`New message from ${senderName || 'Someone'}`, options);
    } catch (e) {}
  }
}

// Run on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatNotifications);
} else {
  initChatNotifications();
}

// Unlock audio on first tap/click
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

// Expose to React components
window.playChatAlert = playChatAlert;