let encryptedData = [];
let selectedDropdownIndex = null;

// Initial load
loadDropdown();

// Load dropdown data
function loadDropdown() {
  fetch('/data/user-keys.json')
    .then(res => res.json())
    .then(data => {
      encryptedData = data;
      renderDropdown('dropdownList', data, (item, index) => {
        document.getElementById('dropdownSearch').value = item.label;
        selectedDropdownIndex = index;
      });
    })
    .catch(err => {
      console.error('Failed to load dropdown data:', err);
      document.getElementById('dropdownList').innerHTML = '<li style="color:red;">Error loading options</li>';
    });
}

// Encrypt and copy to clipboard
async function encryptAndCopy() {
  const password = getInput('passwordInput');
  const message = getInput('encryptInput');

  if (!password || !message) {
    showToast('Please enter both password and message.', 'error');
    return;
  }

  try {
    const cipher = await postJSON('/crypto', {
      mode: 'simple-encrypt',
      password,
      message
    });

    if (!cipher) throw new Error('Empty encryption result.');
    navigator.clipboard.writeText(cipher);
    showToast('Encrypted message copied to clipboard.', 'success');
  } catch (err) {
    showToast(err.message || 'Encryption failed.', 'error');
  }
}

// Save encrypted message
async function saveEncrypted() {
  const password = getInput('passwordInput');
  const message = getInput('encryptInput');
  const label = getInput('labelInput');

  if (!password || !message || !label) {
    showToast('Please enter password, message, and label.', 'error');
    return;
  }

  try {
    const cipher = await postJSON('/crypto', {
      mode: 'simple-encrypt',
      password,
      message
    });

    if (!cipher) throw new Error('Empty cipher received from encryption.');

    const saveMsg = await postJSON('/save', { label, cipher });
    showToast(saveMsg || 'Saved successfully.', 'success');
    loadDropdown();
  } catch (err) {
    showToast(err.message || 'Failed to save.', 'error');
  }
}

// Decrypt and copy to clipboard
async function decryptAndCopy() {
  const password = getInput('passwordInput');
  if (!password) {
    showToast('Please enter a password.', 'error');
    return;
  }

  const selected = encryptedData[selectedDropdownIndex];
  if (!selected || !selected.cipher) {
    showToast('Invalid selection.', 'error');
    return;
  }

  try {
    const output = await postJSON('/crypto', {
      mode: 'simple-decrypt',
      password,
      ciphertext: selected.cipher
    });

    if (output.startsWith("ERROR:")) {
      showToast(output.replace("ERROR:", "").trim(), 'error');
      return;
    }

    if (!output) {
      showToast('Decryption returned nothing.', 'error');
      return;
    }

    document.getElementById('result').value = output;
    copyToClipboard('result');
  } catch (err) {
    showToast(err.message || 'Decryption failed.', 'error');
  }
}

// Delete selected entry
async function deleteSelected() {
  const selected = encryptedData[selectedDropdownIndex];
  if (!selected) {
    showToast('Please select an item to delete.', 'error');
    return;
  }

  const labelToDelete = selected.label;
  if (!confirm(`Are you sure you want to delete "${labelToDelete}"?`)) return;

  try {
    const msg = await postJSON('/delete', { label: labelToDelete });
    showToast(msg || 'Deleted successfully.', 'success');
    selectedDropdownIndex = null;
    document.getElementById('dropdownSearch').value = '';
    loadDropdown();
  } catch (err) {
    showToast(err.message || 'Failed to delete.', 'error');
  }
}

// Load encryption defaults
fetch('/js/encryption-defaults.json')
  .then(res => res.json())
  .then(data => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No encryption defaults found.');
      return;
    }

    const { tag, salt, nonce } = data[0];
    document.getElementById('customTagInput').value = tag || '';
    document.getElementById('customSaltInput').value = salt || '';
    document.getElementById('customNonceInput').value = nonce || '';
  })
  .catch(err => {
    console.error('Failed to load encryption defaults:', err);
  });