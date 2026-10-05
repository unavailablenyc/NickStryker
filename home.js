const wordmark = document.querySelector(".wordmark");
const letters = document.querySelector(".letters");
const hero = document.querySelector("main#main > section.hero");

function gap() {
  return 3 + Math.floor(Math.random() * 3);
}

let until = gap();
let strikeFrame = 0;
let introduced = false;

function playStrike() {
  // Defer the class so this animationend does not replay the letter rise.
  cancelAnimationFrame(strikeFrame);
  letters.classList.remove("strike");
  strikeFrame = requestAnimationFrame(() => {
    strikeFrame = requestAnimationFrame(() => {
      letters.classList.add("strike");
    });
  });
}

wordmark.addEventListener("animationiteration", (event) => {
  if (event.animationName !== "unavailable") return;
  if (!introduced) return;
  until -= 1;
  if (until > 0) return;
  until = gap();
  playStrike();
});

const glyphs = [...letters.querySelectorAll("span")];
let settled = 0;

glyphs.forEach((span) => {
  span.addEventListener("animationend", (event) => {
    if (event.animationName !== "rise") return;
    if (span.style.animation === "none") return;
    span.style.animation = "none";
    span.style.opacity = "1";
    span.style.transform = "none";
    settled += 1;
    if (settled < glyphs.length) return;
    introduced = true;
    until = gap();
    playStrike();
  });
});

letters.addEventListener("animationend", (event) => {
  if (event.pseudoElement !== "::after" || event.animationName !== "unavailable") return;
  letters.classList.remove("strike");
});

function heroFullyVisible(entry) {
  const box = entry.boundingClientRect;
  const root = entry.rootBounds;
  if (box.width <= 0 || box.height <= 0) return false;
  if (!root) return entry.intersectionRatio >= 1;

  const slop = 4;
  const top = box.top >= root.top - slop;
  const bottom = box.bottom <= root.bottom + slop;
  const left = box.left >= root.left - slop;
  const right = box.right <= root.right + slop;
  if (top && bottom && left && right) return true;

  const tooTall = box.height > root.height + slop;
  const tooWide = box.width > root.width + slop;
  if (!tooTall && !tooWide) return false;

  const coversHeight = tooTall
    ? box.top <= root.top + slop && box.bottom >= root.bottom - slop
    : top && bottom;
  const coversWidth = tooWide
    ? box.left <= root.left + slop && box.right >= root.right - slop
    : left && right;
  return coversHeight && coversWidth;
}

function introduce() {
  letters.classList.add("is-in");
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && hero && "IntersectionObserver" in window) {
  const threshold = [];
  for (let step = 0; step <= 100; step += 1) threshold.push(step / 100);
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some(heroFullyVisible)) return;
    introduce();
    observer.disconnect();
  }, { threshold });
  observer.observe(hero);
}
