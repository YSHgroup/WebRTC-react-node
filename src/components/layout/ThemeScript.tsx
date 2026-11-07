/** Runs before paint so the saved theme never flashes. */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
