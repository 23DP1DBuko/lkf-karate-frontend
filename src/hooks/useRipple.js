export function createRipple(e) {
  const element = e.currentTarget
  const ripple = document.createElement('span')
  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2
  const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    transform: scale(0);
    animation: rippleAnim 0.5s ease-out forwards;
    pointer-events: none;
  `

  element.style.position = 'relative'
  element.style.overflow = 'hidden'
  element.appendChild(ripple)
  setTimeout(() => ripple.remove(), 500)
}

export function useRipple() {
  return createRipple
}