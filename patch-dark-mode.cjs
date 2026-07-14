const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const target = `  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);`;
const replacement = target + `
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tryrating_dark_mode');
    return saved !== null ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tryrating_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);`;
code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
