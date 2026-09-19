const STORAGE_KEY = "signal-workspace";

const defaultState = {
  artist: "Nova Vale",
  release: "Afterglow",
  date: "2026-10-01",
  goal: "Grow repeat listeners",
  url: "https://open.spotify.com/track/afterglow-nova-vale",
};

const prompts = [
  {
    title: "The “I almost deleted this” story",
    copy: "Open with: “I nearly deleted the song that taught me how to be patient.” Cut between a raw voice note, the first demo, and the finished chorus. End with one line about what changed.",
    hooks: [
      "“This song took three years to sound like 3 minutes.”",
      "“The version I almost deleted is the reason this exists.”",
      "“I wrote this for the version of me who needed a sign.”",
    ],
  },
  {
    title: "The one-line lyric test",
    copy: "Put your most specific lyric on screen with no context. Let the first two seconds breathe, then show the room, street, or person that inspired it. Ask people what line found them.",
    hooks: [
      "“I wrote this line before I knew who it was for.”",
      "“The lyric I was most afraid to keep.”",
      "“What does this line sound like to you?”",
    ],
  },
  {
    title: "A tiny live-room version",
    copy: "Strip the song back to one instrument and one take. Keep the breath before the first note. Add a caption explaining what changed when the song left the studio.",
    hooks: [
      "“The song sounds different when there’s nowhere to hide.”",
      "“One mic. One take. Same feeling.”",
      "“This is how Afterglow sounds at 1am.”",
    ],
  },
];

function loadState() {
  try {
    return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
  } catch {
    return { ...defaultState };
  }
}

let state = loadState();

const showToast = (message) => {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2500);
};

const copyText = async (text, feedbackElement) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  if (feedbackElement) {
    feedbackElement.textContent = "Copied";
    window.setTimeout(() => { feedbackElement.textContent = ""; }, 1800);
  }
  showToast("Copied to clipboard");
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.querySelector(".sync-status").innerHTML = '<span class="status-dot"></span> Saved locally';
}

function navigate(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.viewPanel === viewName);
  });
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });
  const activeItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  document.querySelector("#page-breadcrumb").textContent = activeItem ? activeItem.textContent.trim() : "Overview";
  history.replaceState(null, "", `#${viewName}`);
  document.querySelector(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateForm() {
  document.querySelector("#artist-name").value = state.artist;
  document.querySelector("#release-title").value = state.release;
  document.querySelector("#release-date").value = state.date;
  document.querySelector("#campaign-goal").value = state.goal;
  document.querySelector("#spotify-url").value = state.url;
  document.querySelector("#link-destination").value = state.url;
}

function generatedLink() {
  const source = document.querySelector("#link-source").value.toLowerCase();
  const campaign = document.querySelector("#link-campaign").value.trim() || "release";
  return `signal.fm/${campaign}?src=${source}`;
}

function updateGeneratedLink() {
  document.querySelector(".generated-link span").textContent = generatedLink();
}

document.addEventListener("click", (event) => {
  const navTarget = event.target.closest("[data-navigate]");
  if (navTarget) navigate(navTarget.dataset.navigate);
  const navItem = event.target.closest(".nav-item[data-view]");
  if (navItem) {
    event.preventDefault();
    navigate(navItem.dataset.view);
  }
});

document.querySelector("#campaign-form").addEventListener("submit", (event) => {
  event.preventDefault();
  state = {
    artist: document.querySelector("#artist-name").value.trim() || defaultState.artist,
    release: document.querySelector("#release-title").value.trim() || defaultState.release,
    date: document.querySelector("#release-date").value || defaultState.date,
    goal: document.querySelector("#campaign-goal").value,
    url: document.querySelector("#spotify-url").value.trim() || defaultState.url,
  };
  saveState();
  populateForm();
  document.querySelector("#form-feedback").textContent = "Saved";
  window.setTimeout(() => { document.querySelector("#form-feedback").textContent = ""; }, 1800);
  showToast("Release details saved");
});

document.querySelectorAll(".task-item input, .phase-card input").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.closest(".task-item")) checkbox.closest(".task-item").querySelector(".task-text").classList.toggle("done", checkbox.checked);
    showToast(checkbox.checked ? "Task marked complete" : "Task reopened");
  });
});

document.querySelector("#refresh-prompt").addEventListener("click", () => {
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  document.querySelector("#prompt-title").textContent = prompt.title;
  document.querySelector("#prompt-copy").textContent = prompt.copy;
  document.querySelector("#hook-list").innerHTML = prompt.hooks.map((hook) => `<li>${hook}</li>`).join("");
});

document.querySelector("#copy-prompt").addEventListener("click", () => {
  const title = document.querySelector("#prompt-title").textContent;
  const copy = document.querySelector("#prompt-copy").textContent;
  copyText(`${title}\n\n${copy}`, document.querySelector("#copy-feedback"));
});

document.querySelector("#copy-release-link").addEventListener("click", () => copyText(state.url));
document.querySelector("#copy-generated-link").addEventListener("click", () => copyText(generatedLink()));
document.querySelector("#link-source").addEventListener("change", updateGeneratedLink);
document.querySelector("#link-campaign").addEventListener("input", updateGeneratedLink);
document.querySelectorAll(".cta-item").forEach((item) => {
  item.addEventListener("click", () => copyText(item.querySelector("span").textContent));
});
document.querySelector("#add-metric").addEventListener("click", () => showToast("Snapshot form coming next — keep the habit with a weekly check-in."));
document.querySelector(".mobile-menu").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));

const instagramApi = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Instagram service request failed");
  return payload;
};

const formatQueueDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date pending" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[character]));

function renderInstagramQueue(items) {
  const queue = document.querySelector("#instagram-queue");
  const count = document.querySelector("#instagram-queue-count");
  count.textContent = String(items.length).padStart(2, "0");
  if (!items.length) {
    queue.innerHTML = '<p class="empty-state">No posts queued yet. Generate your first image above.</p>';
    return;
  }
  queue.innerHTML = items.map((item) => `
    <div class="instagram-queue-item">
      ${item.imageUrl ? `<img class="instagram-thumb" src="${escapeHtml(item.imageUrl)}" alt="" />` : '<span class="instagram-thumb"></span>'}
      <div><strong>${escapeHtml(item.caption || "Untitled post")}</strong><span>${escapeHtml(formatQueueDate(item.scheduledFor))}</span></div>
      <span class="queue-status">${escapeHtml(item.status || "queued")}</span>
    </div>
  `).join("");
}

async function loadInstagramStudio() {
  const status = document.querySelector("#instagram-status");
  try {
    const [account, queue] = await Promise.all([
      instagramApi("/instagram/status"),
      instagramApi("/queue"),
    ]);
    status.textContent = account.connected ? `Connected · @${account.username}` : "Instagram setup required";
    renderInstagramQueue(queue.items || []);
  } catch (error) {
    status.textContent = "Backend unavailable";
    renderInstagramQueue([]);
    showToast(error.message);
  }
}

document.querySelector("#instagram-generator-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = document.querySelector("#instagram-feedback");
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  feedback.textContent = "Generating…";
  try {
    const result = await instagramApi("/queue", {
      method: "POST",
      headers: { "Idempotency-Key": window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}` },
      body: JSON.stringify({
        prompt: document.querySelector("#instagram-prompt").value.trim(),
        caption: document.querySelector("#instagram-caption").value.trim(),
        scheduledFor: `${document.querySelector("#instagram-date").value}T${document.querySelector("#instagram-time").value}`,
      }),
    });
    feedback.textContent = "Queued";
    renderInstagramQueue(result.items || []);
    showToast("Image generated and queued");
  } catch (error) {
    feedback.textContent = "Could not queue";
    showToast(error.message);
  } finally {
    button.disabled = false;
    window.setTimeout(() => { feedback.textContent = ""; }, 2200);
  }
});

document.querySelector('[data-view="instagram"]').addEventListener("click", loadInstagramStudio);
document.querySelector("#instagram-date").value = new Date().toISOString().slice(0, 10);
document.querySelector("#instagram-time").value = `${String(Math.min(new Date().getHours() + 1, 23)).padStart(2, "0")}:00`;

const initialView = window.location.hash.slice(1);
populateForm();
updateGeneratedLink();
if (initialView && document.querySelector(`[data-view-panel="${initialView}"]`)) navigate(initialView);
