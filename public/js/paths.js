const path = require('path');
const os = require('os');

function getPythonCommand() {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(__dirname, '..', '..', '.python', 'python.exe');
  }

  // For Linux/macOS, assumes Python is installed
  return 'python3';
}

module.exports = getPythonCommand;