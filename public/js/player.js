// public/js/player.js
document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("audio-player");
  const titleEl = document.getElementById("current-track-title");
  const buttons = document.querySelectorAll(".play-btn");

  if (!audio || !titleEl) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.dataset.src;
      const title = btn.dataset.title || "Unknown track";

      if (!src) return;

      audio.src = src;
      audio.play();
      titleEl.textContent = "Now playing: " + title;
    });
  });
});
