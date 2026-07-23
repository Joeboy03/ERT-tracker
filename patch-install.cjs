const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldInstall = `  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };`;

const newInstall = `  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Install prompt is not ready. You may need to open the app in a new tab.");
      return;
    }
    
    if (window !== window.parent) {
      alert("To install the app, please open it in a new tab by clicking the arrow icon in the top right corner of the preview window.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } catch (err) {
      console.error(err);
      alert("Installation prompt failed. Please try opening the app in a new tab.");
    }
  };`;

code = code.replace(oldInstall, newInstall);
fs.writeFileSync('src/App.tsx', code);
console.log('patched install click');
