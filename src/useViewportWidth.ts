import { useEffect, useState } from 'react'

/** Current window width; updates when the phone is turned or the window is resized. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  return width
}
