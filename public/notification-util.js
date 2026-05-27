// Request browser permission for notifications safely
function initChatNotifications() {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notifications.");
    return;
  }
  
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      console.log("Notification permission status:", permission);
    });
  }
}

// Global function to trigger the sound and the banner alert
function playChatAlert(senderName, messageText) {
  // 1. Play the notification sound from the public folder
  const audio = new Audio('/notification.mp3');
  
  audio.play().catch(error => {
    // Chrome blocks audio if the user hasn't clicked on the page yet
    console.log("Audio playback deferred until user interacts with the app:", error);
  });

  // 2. Display the Chrome system notification banner
  if (window.Notification && Notification.permission === "granted") {
    const options = {
      body: messageText || "Sent a message",
      icon: '/favicon.ico', 
      tag: 'shhchats-message', // Groups notifications so your desktop doesn't flood
      renotify: true           // Forces phone/computer to vibrate or alert for new messages
    };

    try {
      new Notification(`New message from ${senderName || 'Someone'}`, options);
    } catch (e) {
      console.error("Failed to create desktop notification:", e);
    }
  }
}

// Auto-run permission request when the script loads in the browser
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatNotifications);
} else {
  initChatNotifications();
}

// Attach functions to window so Lovable's React components can easily see it
window.playChatAlert = playChatAlert;
