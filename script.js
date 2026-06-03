const PILOT_REGISTRATION_END_DATE = "2026-06-08T12:00:00+03:00";
const SHEETS_WEB_APP_URL = "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// Security note: Do not put private emails, passwords, API keys, or secrets in frontend code.
// The frontend should only call the Google Apps Script Web App URL.

const targetDate = new Date(PILOT_REGISTRATION_END_DATE);
const countdownTitle = document.querySelector("#countdown-title");
const countdown = document.querySelector("[data-countdown]");
const form = document.querySelector("#signup-form");
const submitButton = form.querySelector(".cta-button");
const buttonText = form.querySelector(".button-text");
const message = document.querySelector("#form-message");
const privacyModal = document.querySelector("#privacy-modal");
const privacyDialog = document.querySelector(".privacy-dialog");
const privacyOpenButtons = document.querySelectorAll("[data-privacy-open]");
const privacyCloseButtons = document.querySelectorAll("[data-privacy-close]");
const signupScrollButton = document.querySelector("[data-scroll-to-signup]");
const signupCard = document.querySelector(".signup-card");

function pad(value) {
  return String(value).padStart(2, "0");
}

function getTimeParts() {
  const distance = Math.max(0, targetDate.getTime() - Date.now());

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
    isClosed: distance === 0,
  };
}

function renderCountdown() {
  const parts = getTimeParts();

  if (parts.isClosed) {
    countdownTitle.textContent = "ההרשמה לפיילוט נסגרה";
  }

  ["days", "hours", "minutes", "seconds"].forEach((unit) => {
    const node = countdown.querySelector(`[data-unit="${unit}"]`);
    node.textContent = unit === "days" ? pad(parts[unit]) : pad(parts[unit]);
  });
}

function normalizePhone(phone) {
  return phone.replace(/[\s-]/g, "").replace(/^\+972/, "0").replace(/^972/, "0");
}

function isValidIsraeliPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^0\d{8,9}$/.test(normalized);
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  buttonText.textContent = isLoading ? "שולח..." : "אני רוצה להצטרף לפיילוט";
}

function showMessage(text) {
  message.textContent = text;
}

async function submitLead(payload) {
  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Lead submission failed");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const fullName = form.fullName.value.trim();
  const phone = form.phone.value.trim();

  if (!fullName) {
    showMessage("נא להזין שם מלא.");
    form.fullName.focus();
    return;
  }

  if (!isValidIsraeliPhone(phone)) {
    showMessage("נא להזין מספר טלפון ישראלי תקין.");
    form.phone.focus();
    return;
  }

  const payload = {
    fullName,
    phone: normalizePhone(phone),
    wantsUpdates: form.wantsUpdates.checked,
    source: "landing-page",
    createdAt: new Date().toISOString(),
  };

  try {
    setLoading(true);
    await submitLead(payload);
    form.innerHTML = '<p class="success-message">נרשמת לפיילוט. אם תיכנס/י לרשימה — ניצור קשר בקרוב.</p>';
  } catch (error) {
    showMessage("משהו השתבש. נסו שוב בעוד רגע.");
  } finally {
    setLoading(false);
  }
});

function openPrivacyModal() {
  privacyModal.classList.add("is-open");
  privacyModal.setAttribute("aria-hidden", "false");
  privacyDialog.focus();
}

function closePrivacyModal() {
  privacyModal.classList.remove("is-open");
  privacyModal.setAttribute("aria-hidden", "true");
}

privacyOpenButtons.forEach((button) => {
  button.addEventListener("click", openPrivacyModal);
});

privacyCloseButtons.forEach((button) => {
  button.addEventListener("click", closePrivacyModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && privacyModal.classList.contains("is-open")) {
    closePrivacyModal();
  }
});

signupScrollButton?.addEventListener("click", () => {
  signupCard?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function initHourglass() {
  const root = document.getElementById("hg");
  if (!root) return;

  const rotor = document.getElementById("hgRotor");
  const topSand = document.getElementById("hgTopSand");
  const botSand = document.getElementById("hgBotSand");
  const stream = document.getElementById("hgStream");
  const glowTop = document.getElementById("hgGlowTop");
  const glowBot = document.getElementById("hgGlowBot");
  const shine = document.getElementById("hgShine");
  const canvas = document.getElementById("hgFx");
  const ctx = canvas?.getContext("2d");

  if (!rotor || !topSand || !botSand || !stream || !glowTop || !glowBot || !shine || !ctx) {
    return;
  }

  const CX = 150;
  const CY = 210;
  const TOP_Y = 50;
  const NECK1 = 200;
  const NECK2 = 220;
  const BOT_Y = 370;
  const OUT = 80;
  const grains = [];
  const sparks = [];
  const sandColors = ["#FF8FF0", "#F340DF", "#C56BFF", "#B960FF", "#FFFFFF"];
  const drainDuration = 7600;
  const waitDuration = 5000;
  const flipDuration = 1150;

  let sx = 1;
  let sy = 1;
  let dpr = 1;
  let phase = "drain";
  let startTime = performance.now();
  let progress = 0;
  let rotation = 0;
  let grainAcc = 0;
  let lastFrame = performance.now();

  function topWallX(y, right) {
    const t = (y - TOP_Y) / (NECK1 - TOP_Y);
    return right ? 238 - OUT * t : 62 + OUT * t;
  }

  function botWallX(y, right) {
    const u = (y - NECK2) / (BOT_Y - NECK2);
    return right ? 158 + OUT * u : 142 - OUT * u;
  }

  function topPath(p) {
    const sandY = TOP_Y + (NECK1 - TOP_Y) * p;
    const leftX = topWallX(sandY, false);
    const rightX = topWallX(sandY, true);
    const crater = 20 * Math.sin(Math.PI * p);

    return `M ${leftX.toFixed(1)} ${sandY.toFixed(1)} L 150 ${(sandY + crater).toFixed(1)} L ${rightX.toFixed(1)} ${sandY.toFixed(1)} L 158 200 L 142 200 Z`;
  }

  function botPath(p) {
    const baseY = BOT_Y - (BOT_Y - NECK2) * p;
    const leftX = botWallX(baseY, false);
    const rightX = botWallX(baseY, true);
    const mound = 20 * Math.sin(Math.PI * p);

    return `M ${leftX.toFixed(1)} ${baseY.toFixed(1)} L 150 ${(baseY - mound).toFixed(1)} L ${rightX.toFixed(1)} ${baseY.toFixed(1)} L 238 370 L 62 370 Z`;
  }

  function botSurfaceY(p) {
    const baseY = BOT_Y - (BOT_Y - NECK2) * p;
    return baseY - 20 * Math.sin(Math.PI * p);
  }

  function resize() {
    const rect = root.getBoundingClientRect();
    if (!rect.width) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    sx = rect.width / 300;
    sy = rect.height / 440;
    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);
  }

  function spawnGrain() {
    grains.push({
      x: CX + (Math.random() - 0.5) * 3.2,
      y: 203,
      vx: (Math.random() - 0.5) * 0.25,
      vy: 1.5 + Math.random() * 1.3,
      r: 0.7 + Math.random() * 0.9,
      c: sandColors[(Math.random() * sandColors.length) | 0],
    });
  }

  function spawnSpark(p) {
    let x;
    let y;

    if (Math.random() < 0.5 && p < 0.95) {
      const sandY = TOP_Y + (NECK1 - TOP_Y) * p;
      y = sandY + Math.random() * (NECK1 - sandY) * 0.92 + 4;
      const half = (topWallX(y, true) - topWallX(y, false)) / 2 - 3;
      x = CX + (Math.random() - 0.5) * 2 * Math.max(half, 2);
    } else {
      const top = botSurfaceY(p) + 4;
      y = top + Math.random() * (BOT_Y - top) * 0.92;
      const half = (botWallX(y, true) - botWallX(y, false)) / 2 - 3;
      x = CX + (Math.random() - 0.5) * 2 * Math.max(half, 2);
    }

    sparks.push({ x, y, life: 1, max: 0.5 + Math.random() * 0.6 });
  }

  function easeInOutBack(x) {
    const c1 = 1.4;
    const c2 = c1 * 1.525;

    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  }

  function frame(now) {
    const delta = Math.min(now - lastFrame, 50);
    lastFrame = now;
    const elapsed = now - startTime;

    if (phase === "drain") {
      progress = Math.min(elapsed / drainDuration, 1);
      if (progress >= 1) {
        phase = "wait";
        startTime = now;
      }

      grainAcc += (0.85 + 0.7 * Math.sin(Math.PI * progress)) * (delta / 16.7);
      while (grainAcc >= 1) {
        spawnGrain();
        grainAcc -= 1;
      }
      if (Math.random() < delta / 260) spawnSpark(progress);
    } else if (phase === "wait") {
      progress = 1;
      if (elapsed >= waitDuration) {
        phase = "flip";
        startTime = now;
      }
      if (Math.random() < delta / 320) spawnSpark(1);
    } else if (phase === "flip") {
      const flipProgress = Math.min(elapsed / flipDuration, 1);
      rotation = 180 * easeInOutBack(flipProgress);

      if (flipProgress >= 1) {
        phase = "drain";
        startTime = now;
        progress = 0;
        rotation = 0;
        grains.length = 0;
        grainAcc = 0;
      }
    }

    topSand.setAttribute("d", topPath(progress));
    botSand.setAttribute("d", botPath(progress));
    rotor.setAttribute("transform", `rotate(${rotation.toFixed(2)} ${CX} ${CY})`);

    const draining = phase === "drain" && progress > 0.012 && progress < 0.992;
    if (draining) {
      const wobble = Math.sin(now / 90) * 0.5;
      const surface = Math.min(botSurfaceY(progress) + 2, 364);
      const width = 2.1;
      stream.setAttribute(
        "d",
        `M ${(CX - width).toFixed(1)} 205 L ${(CX + width).toFixed(1)} 205 L ${(CX + width * 0.55 + wobble).toFixed(1)} ${surface.toFixed(1)} L ${(CX - width * 0.55 + wobble).toFixed(1)} ${surface.toFixed(1)} Z`
      );
      stream.setAttribute("opacity", "0.92");
    } else {
      stream.setAttribute("opacity", "0");
    }

    glowTop.setAttribute("opacity", (0.85 * (1 - progress)).toFixed(2));
    glowBot.setAttribute("opacity", (0.85 * progress).toFixed(2));
    glowTop.setAttribute("cy", (((TOP_Y + (NECK1 - TOP_Y) * progress) + NECK1) / 2).toFixed(1));
    glowBot.setAttribute("cy", ((botSurfaceY(progress) + BOT_Y) / 2).toFixed(1));
    shine.setAttribute("opacity", (0.35 + 0.25 * Math.sin(now / 1400)).toFixed(2));

    ctx.clearRect(0, 0, 300, 440);
    if (phase !== "flip") {
      const surface = botSurfaceY(progress);

      for (let i = grains.length - 1; i >= 0; i -= 1) {
        const grain = grains[i];
        grain.vy += 0.05 * (delta / 16.7);
        grain.x += grain.vx * (delta / 16.7);
        grain.y += grain.vy * (delta / 16.7);

        const land = surface + Math.abs(grain.x - CX) * 0.45;
        if (grain.y >= land || grain.y > 366) {
          grains.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = grain.c;
        ctx.beginPath();
        ctx.arc(grain.x, grain.y, grain.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i];
        spark.life -= delta / 1000 / spark.max;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const alpha = Math.sin(spark.life * Math.PI);
        const radius = 0.8 + alpha * 1.1;

        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = "#FFE3FB";
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = "#FF9DE8";
        ctx.fillRect(spark.x - radius * 2.4, spark.y - 0.25, radius * 4.8, 0.5);
        ctx.fillRect(spark.x - 0.25, spark.y - radius * 2.4, 0.5, radius * 4.8);
      }

      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(root);
  } else {
    window.addEventListener("resize", resize);
  }

  resize();
  requestAnimationFrame(frame);
}

initHourglass();
renderCountdown();
setInterval(renderCountdown, 1000);
