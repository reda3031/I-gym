import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative w-10 h-10 rounded-xl bg-bg-hover flex items-center justify-center hover:opacity-90 transition-all border border-border ${className}`}
      title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-warning" />
      ) : (
        <Moon className="w-5 h-5 text-info" />
      )}
    </button>
  )
}
