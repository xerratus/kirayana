export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, dark: boolean) {
      ctx.fillStyle = dark ? '#0b1220' : '#f5f8fc'
      ctx.fillRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(width / 2, height * .45, 30, width / 2, height * .45, Math.max(width, height) * .65)
      glow.addColorStop(0, dark ? '#142a44' : '#d4e7fb'); glow.addColorStop(.6, dark ? '#0f1d31' : '#e8f1fc'); glow.addColorStop(1, dark ? '#0b1220' : '#f5f8fc')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height)
      const dotRadius = Math.hypot(width / 2, height * .55)
      const dots = ctx.createRadialGradient(width / 2, height * .45, dotRadius * .22, width / 2, height * .45, dotRadius)
      dots.addColorStop(0, dark ? '#6d9dcb40' : '#4779b53c')
      dots.addColorStop(.65, dark ? '#6d9dcb20' : '#4779b520')
      dots.addColorStop(1, dark ? '#6d9dcb00' : '#4779b500')
      ctx.fillStyle = dots
      for (let x = 18; x < width; x += 31) for (let y = 18; y < height; y += 31) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill() }
}
