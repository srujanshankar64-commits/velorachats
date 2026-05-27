if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

function playChatAlert(senderName, messageText) {
  const audio = new Audio('/notification.mp3'); 
  audio.play().catch(err => console.log("Audio waiting for user gesture"));

  if (Notification.permission === "granted") {
    new Notification(`New message from ${senderName}`, {
      body: messageText,
      icon: '/favicon.ico',
      tag: 'shhchats-dm',
      renotify: true
    });
  }
}
