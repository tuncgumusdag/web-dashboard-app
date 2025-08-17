function copyToClipboard(inputId) {
  const input = document.getElementById(inputId);
  if (!input?.value) {
    showToast('Nothing to copy.', 'error');
    return;
  }

  navigator.clipboard.writeText(input.value)
    .then(() => showToast('Copied to clipboard.', 'success'))
    .catch(err => {
      console.error('Copy failed:', err);
      showToast('Copy failed.', 'error');
    });
}

function showToast(message, type = 'success', duration = 3000) {
  const toaster = document.getElementById('toaster');
  toaster.textContent = message;
  toaster.className = `show ${type}`;
  setTimeout(() => toaster.className = '', duration);
}

async function postJSON(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Request failed');
    return text.trim();
  } catch (err) {
    console.error(`POST ${url} failed:`, err);
    throw err;
  }
}

function renderDropdown(listId, data, onSelect) {
  const list = document.getElementById(listId);
  list.innerHTML = '';

  data.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.dataset.index = index;
    li.onclick = () => onSelect(item, index);
    list.appendChild(li);
  });
}

function getInput(id) {
  return document.getElementById(id)?.value?.trim() || '';
}