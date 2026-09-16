const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

document.addEventListener("DOMContentLoaded", () => {
  let gameStarted = false;
  let gameFinished = false;
  let previousScore = 0;

  function track(eventName, data = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        game_name: "serpiente",
        ...data
      });
    }
  }

  function enableAnalytics() {
    if (GA_MEASUREMENT_ID === "G-XXXXXXXXXX" || window.gtag) return;

    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(tag);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }

  function startGame(method) {
    gameStarted = true;
    gameFinished = false;
    previousScore = 0;
    track("game_start", { input_method: method });
  }

  const startBtn = document.querySelector("#startBtn");
  const againBtn = document.querySelector("#againBtn");
  const resumeBtn = document.querySelector("#resumeBtn");
  const scoreElement = document.querySelector("#score");
  const overScreen = document.querySelector("#overScreen");

  startBtn?.addEventListener("click", () => startGame("button"));
  againBtn?.addEventListener("click", () => startGame("button"));
  resumeBtn?.addEventListener("click", () => track("game_resume"));

  document.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Spacebar") {
      if (!gameStarted || gameFinished) startGame("keyboard");
      else track("game_pause_or_resume");
    }
  });

  if (scoreElement) {
    new MutationObserver(() => {
      const score = Number.parseInt(scoreElement.textContent, 10) || 0;

      if (gameStarted && score > previousScore) {
        track("food_eaten", { score });
      }

      previousScore = score;
    }).observe(scoreElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (overScreen) {
    new MutationObserver(() => {
      if (!overScreen.hidden && gameStarted && !gameFinished) {
        gameFinished = true;

        const score =
          Number.parseInt(document.querySelector("#finalScore")?.textContent, 10) || 0;

        track("game_over", { score });
      }
    }).observe(overScreen, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  enableAnalytics();
});