const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const pwaLogic = `  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

`;

code = code.replace("  const [showGoalModal, setShowGoalModal] = useState(false);", pwaLogic + "  const [showGoalModal, setShowGoalModal] = useState(false);");

const buttonCode = `{isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#10b981] hover:bg-[#10b981]/10 transition-all flex items-center gap-2 font-bold text-xs"
                  title="Install App"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}`;

code = code.replace(
  /<button \n\s*onClick=\{\(\) => \{\n\s*setTempGoal\(dailyGoal.toString\(\)\);\n\s*setTempBaseRate\(baseRate.toString\(\)\);\n\s*setTempPremiumRate\(premiumRate.toString\(\)\);\n\s*setShowGoalModal\(true\);\n\s*\}\}\n\s*className="p-2.5 rounded-lg border border-slate-200/g,
  buttonCode + '\n                <button \n                  onClick={() => {\n                    setTempGoal(dailyGoal.toString());\n                    setTempBaseRate(baseRate.toString());\n                    setTempPremiumRate(premiumRate.toString());\n                    setShowGoalModal(true);\n                  }}\n                  className="p-2.5 rounded-lg border border-slate-200'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched pwa');
