const REFRESH_MS = 90 * 1000; // 90 seconds

const storyListEl = document.getElementById('storyList');
const loadingEl = document.getElementById('loading');
const lastUpdatedEl = document.getElementById('lastUpdated');
const filterRelevantEl = document.getElementById('filterRelevant');

let lastItems = [];

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function render(items, onlyRelevant) {
  const list = onlyRelevant
    ? items.filter((i) => i.relevance > 0)
    : items;

  if (list.length === 0) {
    storyListEl.innerHTML = '<li class="story"><p class="story-desc">No matching stories right now. Uncheck the filter to see all Middle East news.</p></li>';
    return;
  }

  storyListEl.innerHTML = list
    .map(
      (item) => `
    <li class="story">
      <a class="story-link" href="${item.link || '#'}" target="_blank" rel="noopener noreferrer">
        <div class="story-meta">
          ${item.relevance > 0 ? '<span class="story-badge">Iran / Gulf / UAE</span>' : ''}
          <span class="story-source">${escapeHtml(item.source)}</span>
          <span class="story-time">${formatTime(item.pubDate)}</span>
        </div>
        <h2 class="story-title">${escapeHtml(item.title)}</h2>
        ${item.description ? `<p class="story-desc">${escapeHtml(item.description)}</p>` : ''}
      </a>
    </li>
  `
    )
    .join('');
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function fetchNews() {
  try {
    const res = await fetch('/api/news');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');

    loadingEl.classList.add('hidden');
    lastUpdatedEl.textContent = `Updated ${formatTime(data.updated)}`;
    lastUpdatedEl.classList.add('live');

    lastItems = data.items || [];
    render(lastItems, filterRelevantEl.checked);
  } catch (err) {
    loadingEl.textContent = 'Unable to load news. Retrying…';
    lastUpdatedEl.textContent = 'Update failed';
    lastUpdatedEl.classList.remove('live');
    console.error(err);
  }
}

filterRelevantEl.addEventListener('change', () => {
  render(lastItems, filterRelevantEl.checked);
});

fetchNews();
setInterval(fetchNews, REFRESH_MS);
