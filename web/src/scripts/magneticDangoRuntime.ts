const DESKTOP_NAV_LOGO_X_POSITION = 200
const DESKTOP_NAV_LOGO_SHIFT_START = 1200
const MOBILE_NAV_LOGO_X_POSITION = 30
const NAV_LOGO_SHIFT_END = 770
const STROKE_WIDTH = 0.5
const VISCOUS_LERP_SPEED = 0.08
const DRAG_LERP_SPEED = 0.04
const SAG_MULTIPLIER = 30
const SAG_DIRECTION_LERP_SPEED = 0.005
const UPWARD_WAVE_DAMPENING_STRENGTH = 10
const WAVE_PARAM_LERP_SPEED = 0.01
const MIN_AMPLITUDE = 10
const MAX_AMPLITUDE = 15
const MIN_FREQUENCY = 6
const MAX_FREQUENCY = 8
const MIN_WAVE_SPEED = 0.005
const MAX_WAVE_SPEED = 0.01
const MIN_CHANGE_INTERVAL_FRAMES = 1000
const MAX_CHANGE_INTERVAL_FRAMES = 10000
const BLOT_SCALE_FACTOR = 1.2
const LINE_COUNT = 5
const SPACING = 6.5
const Y_SCALE = 20
const ANCHOR_X_PERCENT = 0
const WAVY_LINE_RIGHT_MARGIN = 0
const BUTTON_DOT_SPACING = 7
const RIGHT_DECORATIVE_LINE_X_START_PERCENT = 0.9
const DECORATIVE_LINE_OFFSET_Y = -10
const DECORATIVE_LINE_OFFSET_START_PERCENT = 0
const DECORATIVE_MIN_DOT_SPACING = 6.0
const MOBILE_LOGO_Y_START = 20
const LEFT_ELEMENT_Y_POSITIONS_PERCENT = [0.75, 0.7, 0.8, 0.96, 0.85, 0.72, 0.9, 0.95]
const LEFT_BUTTON_INDICES = [0, 2, 4, 6, 7]
const LOGO_Y_OFFSET = 250
const DECORATIVE_LINE_Y_POSITIONS_PERCENT = [
  0.1,
  0.16,
  0.19,
  0.22,
  0.285,
  0.38,
  0.44,
  0.48,
  0.55,
  0.6,
  0.67,
  0.75,
  0.83,
  0.9,
]
const TOTAL_DECORATIVE_LINES = DECORATIVE_LINE_Y_POSITIONS_PERCENT.length

const BLOT_PATHS = [
  'M4.3,2.3c0.1,1-0.5,1.9-1.4,2.2c-0.9,0.3-1.9-0.1-2.4-0.9c-0.5-0.8-0.2-1.9,0.6-2.5c0.8-0.6,1.9-0.4,2.5,0.4C4,1.8,4.2,2,4.3,2.3z',
  'M4.4,2.8c-0.2,0.9-1,1.5-1.9,1.5c-0.9,0-1.7-0.8-1.7-1.7c0-0.9,0.8-1.7,1.7-1.7c0.5,0,1,0.2,1.3,0.6C4.2,1.8,4.5,2.3,4.4,2.8z',
  'M4.1,1.5c0.4,0.8,0.2,1.8-0.5,2.4c-0.7,0.6-1.7,0.6-2.4,0c-0.7-0.6-0.8-1.6-0.2-2.3c0.6-0.7,1.6-0.8,2.3-0.2C3.5,1,3.8,1.2,4.1,1.5z',
  'M3.9,4.1c-0.8,0.4-1.8,0.2-2.4-0.5c-0.6-0.7-0.6-1.7,0-2.4c0.6-0.7,1.6-0.8,2.3-0.2c0.7,0.6,0.8,1.6,0.2,2.3C3.9,3.5,3.9,3.8,3.9,4.1z',
  'M2.4,4.4C1.5,4.5,0.8,4,0.4,3.3c-0.4-0.7-0.2-1.6,0.5-2.2c0.7-0.6,1.6-0.6,2.2-0.1c0.6,0.5,0.8,1.4,0.4,2.1C3.3,3.7,2.9,4.2,2.4,4.4z',
]

type LeftElement =
  | {
      key: string
      type: 'button'
      label: string
      y: number
      underlineY: number
      dotPositions: number[]
    }
  | {
      key: string
      type: 'deco'
      y: number
      dotPositions: number[]
    }

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

function groupDots(x: number[], y: number[], threshold: number) {
  const groupedY = [...y]
  const groups: Array<{indices: number[]; startX: number; endX: number; centerY: number}> = []
  const groupedIndices = new Set<number>()
  let i = 0
  while (i < x.length) {
    const groupIndices = [i]
    for (let j = i + 1; j < x.length && groupIndices.length < 6; j += 1) {
      if (Math.abs(y[j] - y[i]) < threshold) {
        groupIndices.push(j)
      } else {
        break
      }
    }
    if (groupIndices.length > 1) {
      const avgY = groupIndices.reduce((acc, idx) => acc + y[idx], 0) / groupIndices.length
      groupIndices.forEach((idx) => {
        groupedY[idx] = avgY
        groupedIndices.add(idx)
      })
      groups.push({
        indices: groupIndices,
        startX: x[groupIndices[0]],
        endX: x[groupIndices[groupIndices.length - 1]],
        centerY: avgY,
      })
    }
    i += groupIndices.length
  }
  return {groupedY, groups, groupedIndices}
}

function getMetaballPathString(group: {indices: number[]; startX: number; endX: number; centerY: number}) {
  const count = group.indices.length
  const spacing = count > 1 ? (group.endX - group.startX) / (count - 1) : 0
  const r = 2 * BLOT_SCALE_FACTOR
  let d = ''

  for (let i = 0; i < count; i += 1) {
    const currentX = group.startX + i * spacing
    const currentY = group.centerY
    if (i === 0) {
      d += `M ${currentX - r} ${currentY} A ${r} ${r} 0 0 1 ${currentX} ${currentY - r} `
    }
    if (i < count - 1) {
      const nextX = currentX + spacing
      const midX = (currentX + nextX) / 2
      const pinchRadius = r * 0.95
      d += `A ${r} ${r} 0 0 1 ${currentX + r * 0.8} ${currentY - r * 0.6} `
      d += `Q ${midX} ${currentY - pinchRadius} ${nextX - r * 0.8} ${currentY - r * 0.6} `
      d += `A ${r} ${r} 0 0 1 ${nextX} ${currentY - r} `
    } else {
      d += `A ${r} ${r} 0 0 1 ${currentX + r} ${currentY} `
    }
  }

  for (let i = count - 1; i >= 0; i -= 1) {
    const currentX = group.startX + i * spacing
    const currentY = group.centerY
    if (i === count - 1) {
      d += `A ${r} ${r} 0 0 1 ${currentX} ${currentY + r} `
    }
    if (i > 0) {
      const prevX = currentX - spacing
      const midX = (currentX + prevX) / 2
      const pinchRadius = r * 0.95
      d += `A ${r} ${r} 0 0 1 ${currentX - r * 0.8} ${currentY + r * 0.6} `
      d += `Q ${midX} ${currentY + pinchRadius} ${prevX + r * 0.8} ${currentY + r * 0.6} `
      d += `A ${r} ${r} 0 0 1 ${prevX} ${currentY + r} `
    } else {
      d += `A ${r} ${r} 0 0 1 ${currentX - r} ${currentY} `
    }
  }
  d += 'Z '
  return d
}

function calculatePiecewiseDotPositions(startX: number, endX: number, totalDots: number) {
  if (totalDots < 2) return totalDots === 1 ? [startX] : []
  const idealNormalizedPositions = Array.from({length: totalDots}, (_, index) => {
    const progress = index / (totalDots - 1)
    return easeInOutCubic(progress)
  })
  const totalWidth = endX - startX
  let positions = idealNormalizedPositions.map((position) => startX + position * totalWidth)
  for (let index = 1; index < positions.length; index += 1) {
    const requiredPosition = positions[index - 1] + DECORATIVE_MIN_DOT_SPACING
    if (positions[index] < requiredPosition) {
      positions[index] = requiredPosition
    }
  }
  const lastPosition = positions[positions.length - 1]
  const currentTotalWidth = lastPosition - startX
  if (currentTotalWidth > totalWidth) {
    const scaleFactor = totalWidth / currentTotalWidth
    positions = positions.map((position) => startX + (position - startX) * scaleFactor)
  }
  positions[positions.length - 1] = endX
  return positions
}

function createDotPath(svg: SVGSVGElement, key: string, x: number, y: number, index: number) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('data-dot-key', key)
  path.dataset.dynamic = 'true'
  path.setAttribute('d', BLOT_PATHS[index % BLOT_PATHS.length])
  path.setAttribute('fill', 'transparent')
  path.setAttribute('stroke', 'rgba(0, 0, 0, 0.25)')
  path.setAttribute('stroke-width', String(STROKE_WIDTH))
  path.setAttribute('vector-effect', 'non-scaling-stroke')
  path.setAttribute('transform', `translate(${x}, ${y}) scale(${BLOT_SCALE_FACTOR})`)
  svg.appendChild(path)
  return path
}

function initMagneticShell(root: HTMLElement) {
  const svgNode = root.querySelector<SVGSVGElement>('[data-magnetic-svg]')
  const metaballPathNode = root.querySelector<SVGPathElement>('[data-metaball-path]')
  const scrollContainerNode = root.querySelector<HTMLElement>('[data-scroll-container]')
  const contentWrapperNode = root.querySelector<HTMLElement>('[data-content-wrapper]')
  const logoNode = root.querySelector<HTMLElement>('[data-site-logo]')
  const navButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-nav-button]'))

  if (!svgNode || !metaballPathNode || !scrollContainerNode || !contentWrapperNode || !logoNode) {
    return
  }

  const svgElement: SVGSVGElement = svgNode
  const metaballPathElement: SVGPathElement = metaballPathNode
  const scrollContainerElement: HTMLElement = scrollContainerNode
  const contentWrapperElement: HTMLElement = contentWrapperNode
  const logoElementNode: HTMLElement = logoNode

  const sectionById = new Map<string, HTMLElement>()
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-section-id]'))
  for (const section of sections) {
    const id = section.dataset.sectionId
    if (id) {
      sectionById.set(id, section)
    }
  }

  const labels = navButtons.map((button) => button.textContent?.trim() || 'SECTION')
  let activeSection = labels[0] || ''
  let frame = 0
  let nextChangeFrame = 0
  let targetAmplitude = 3.0
  let currentAmplitude = 3.0
  let targetFrequency = 5.0
  let currentFrequency = 5.0
  let targetWaveSpeed = 0.008
  let currentWaveSpeed = 0.008
  let windowWidth = window.innerWidth
  let windowHeight = window.innerHeight
  let isMobile = windowWidth < 770
  let navXPosition = MOBILE_NAV_LOGO_X_POSITION
  let dotCount = 0
  let scrollTop = 0
  let animationMaxScroll = 0
  let lastScrollTop = 0
  let lastScrollDirection: 'down' | 'up' = 'down'
  let smoothSagDirection = 1
  let anchorYPositions: number[] = []
  let decorativeLineYPixels: number[] = []
  let rightDecorativeLines: Array<{y: number; dotPositions: number[]}> = []
  let leftElements: LeftElement[] = []

  let dotRefsArray: SVGPathElement[][] = Array.from({length: LINE_COUNT}, () => [])
  let dotYPositions: number[][] = []
  let draggedYPositions: number[] = []
  let frameHandle: number | null = null

  function setActiveNav(label: string) {
    activeSection = label
    for (const button of navButtons) {
      const buttonLabel = button.textContent?.trim() || ''
      button.classList.toggle('is-active', buttonLabel === activeSection)
    }
  }

  function calculateAnimationMaxScroll() {
    const maxScroll = Math.max(0, contentWrapperElement.scrollHeight - scrollContainerElement.clientHeight)
    animationMaxScroll = maxScroll
  }

  function resetDots() {
    for (const path of svgElement.querySelectorAll<SVGPathElement>('path[data-dot-key]')) {
      path.remove()
    }

    dotRefsArray = Array.from({length: LINE_COUNT}, () => [])

    for (let lineIndex = 0; lineIndex < LINE_COUNT; lineIndex += 1) {
      for (let dotIndex = 0; dotIndex < dotCount; dotIndex += 1) {
        const path = createDotPath(svgElement, `wavy-${lineIndex}-${dotIndex}`, 0, 0, lineIndex + dotIndex)
        dotRefsArray[lineIndex][dotIndex] = path
      }
    }

    dotYPositions = Array.from({length: LINE_COUNT}, (_, lineIndex) =>
      Array.from({length: dotCount}, () => anchorYPositions[lineIndex] ?? 0),
    )
    draggedYPositions = [...anchorYPositions]
  }

  function renderDecorativeDots() {
    for (const path of svgElement.querySelectorAll<SVGPathElement>('path[data-decorative="true"]')) {
      path.remove()
    }

    rightDecorativeLines.forEach((line, lineIndex) => {
      const isOffsetApplicable = lineIndex < rightDecorativeLines.length - 6
      line.dotPositions.forEach((xPosition, dotIndex) => {
        let finalY = line.y
        const progress = line.dotPositions.length > 1 ? dotIndex / (line.dotPositions.length - 1) : 1
        if (isOffsetApplicable && progress >= DECORATIVE_LINE_OFFSET_START_PERCENT) {
          finalY += DECORATIVE_LINE_OFFSET_Y
        }

        const path = createDotPath(svgElement, `right-${lineIndex}-${dotIndex}`, xPosition, finalY, dotIndex)
        path.dataset.decorative = 'true'
      })
    })

    leftElements.forEach((element, elementIndex) => {
      const yPosition = element.type === 'button' ? element.underlineY : element.y
      element.dotPositions.forEach((xPosition, dotIndex) => {
        const path = createDotPath(
          svgElement,
          `left-${elementIndex}-${dotIndex}`,
          xPosition,
          yPosition,
          dotIndex,
        )
        path.dataset.decorative = 'true'
      })
    })
  }

  function buildLeftElements() {
    const elements: LeftElement[] = []
    const leftElementXStart = navXPosition
    const leftDecoLineEndX = navXPosition + 120

    LEFT_ELEMENT_Y_POSITIONS_PERCENT.forEach((percent, index) => {
      const y = windowHeight * percent
      const buttonIndex = LEFT_BUTTON_INDICES.indexOf(index)

      if (buttonIndex !== -1 && buttonIndex < navButtons.length) {
        const underlineStartX = 0
        const underlineEndX = leftDecoLineEndX
        const underlineWidth = underlineEndX - underlineStartX

        elements.push({
          key: `left-button-${index}`,
          type: 'button',
          label: navButtons[buttonIndex].textContent?.trim() || `SECTION ${buttonIndex + 1}`,
          y,
          underlineY: y + 20,
          dotPositions: calculatePiecewiseDotPositions(
            underlineStartX,
            underlineEndX,
            Math.max(2, Math.floor(underlineWidth / BUTTON_DOT_SPACING)),
          ),
        })
        return
      }

      elements.push({
        key: `left-deco-${index}`,
        type: 'deco',
        y,
        dotPositions: calculatePiecewiseDotPositions(
          leftElementXStart,
          leftDecoLineEndX,
          Math.max(2, Math.floor((leftDecoLineEndX - leftElementXStart) / BUTTON_DOT_SPACING)),
        ),
      })
    })

    if (navButtons.length > LEFT_BUTTON_INDICES.length) {
      const extraStart = windowHeight * 0.6
      const extraStep = Math.max(24, (windowHeight * 0.35) / navButtons.length)
      for (let index = LEFT_BUTTON_INDICES.length; index < navButtons.length; index += 1) {
        const y = extraStart + extraStep * (index - LEFT_BUTTON_INDICES.length)
        elements.push({
          key: `left-button-extra-${index}`,
          type: 'button',
          label: navButtons[index].textContent?.trim() || `SECTION ${index + 1}`,
          y,
          underlineY: y + 20,
          dotPositions: calculatePiecewiseDotPositions(0, navXPosition + 120, 18),
        })
      }
    }

    return elements
  }

  function updateNavLayout() {
    let buttonCounter = 0
    leftElements.forEach((element) => {
      if (element.type !== 'button') {
        return
      }

      const button = navButtons[buttonCounter]
      buttonCounter += 1
      if (!button) {
        return
      }

      button.style.top = `${element.y}px`
      button.style.left = `${navXPosition}px`
      button.style.transform = 'translateY(-50%)'
    })

    if (isMobile) {
      logoElementNode.style.top = `${MOBILE_LOGO_Y_START}px`
      logoElementNode.style.left = `${MOBILE_NAV_LOGO_X_POSITION}px`
      logoElementNode.style.width = '80px'
      logoElementNode.style.opacity = '1'
      return
    }

    const firstButton = leftElements.find((element): element is Extract<LeftElement, {type: 'button'}> =>
      element.type === 'button',
    )

    if (!firstButton) {
      return
    }

    logoElementNode.style.top = `${firstButton.y - LOGO_Y_OFFSET}px`
    logoElementNode.style.left = `${navXPosition}px`
    logoElementNode.style.width = '120px'
    logoElementNode.style.opacity = '1'
  }

  function calculateLayout() {
    windowWidth = window.innerWidth
    windowHeight = window.innerHeight
    isMobile = windowWidth < 770

    svgElement.setAttribute('viewBox', `0 0 ${windowWidth} ${windowHeight}`)

    anchorYPositions = DECORATIVE_LINE_Y_POSITIONS_PERCENT.slice(0, LINE_COUNT).map(
      (percent) => windowHeight * percent,
    )
    decorativeLineYPixels = DECORATIVE_LINE_Y_POSITIONS_PERCENT.map((percent) => windowHeight * percent)

    const anchorX = windowWidth * ANCHOR_X_PERCENT
    const targetWidth = (isMobile ? windowWidth * 0.7 : windowWidth / 2) - anchorX
    dotCount = Math.max(6, Math.floor(targetWidth / SPACING))

    const rightLinesXStart = isMobile ? windowWidth * 0.7 : windowWidth * RIGHT_DECORATIVE_LINE_X_START_PERCENT
    rightDecorativeLines = decorativeLineYPixels.map((yPosition) => ({
      y: yPosition,
      dotPositions: calculatePiecewiseDotPositions(
        rightLinesXStart,
        windowWidth,
        Math.max(2, Math.floor((windowWidth - rightLinesXStart) / BUTTON_DOT_SPACING)),
      ),
    }))

    const navShiftProgress = Math.min(
      1,
      Math.max(0, (windowWidth - NAV_LOGO_SHIFT_END) / (DESKTOP_NAV_LOGO_SHIFT_START - NAV_LOGO_SHIFT_END)),
    )

    navXPosition = lerp(MOBILE_NAV_LOGO_X_POSITION, DESKTOP_NAV_LOGO_X_POSITION, navShiftProgress)
    navXPosition = Math.max(MOBILE_NAV_LOGO_X_POSITION, navXPosition)

    leftElements = buildLeftElements()
    updateNavLayout()
    resetDots()
    renderDecorativeDots()
    calculateAnimationMaxScroll()
  }

  function updateActiveSection(scrollTopValue: number) {
    const scrollOffset = scrollTopValue + scrollContainerElement.clientHeight * 0.3
    let currentLabel = labels[0] || ''

    for (const button of navButtons) {
      const sectionTarget = button.dataset.sectionTarget
      if (!sectionTarget) {
        continue
      }
      const section = sectionById.get(sectionTarget)
      if (section && section.offsetTop <= scrollOffset) {
        currentLabel = button.textContent?.trim() || currentLabel
      }
    }

    if (currentLabel && currentLabel !== activeSection) {
      setActiveNav(currentLabel)
    }
  }

  function onFrame() {
    frame += 1

    if (
      windowHeight === 0 ||
      anchorYPositions.length < LINE_COUNT ||
      draggedYPositions.length < LINE_COUNT ||
      decorativeLineYPixels.length < TOTAL_DECORATIVE_LINES ||
      !dotYPositions[0] ||
      dotYPositions[0].length !== dotCount
    ) {
      frameHandle = window.requestAnimationFrame(onFrame)
      return
    }

    const scrollDelta = scrollTop - lastScrollTop
    const atBottom = animationMaxScroll > 0 && scrollTop >= animationMaxScroll - 2
    const atTop = scrollTop <= 2

    if (atBottom) lastScrollDirection = 'down'
    else if (atTop) lastScrollDirection = 'up'
    else if (scrollDelta > 0.5) lastScrollDirection = 'down'
    else if (scrollDelta < -0.5) lastScrollDirection = 'up'

    lastScrollTop = scrollTop

    const scrollProgress = animationMaxScroll > 0 ? Math.min(1, scrollTop / animationMaxScroll) : 0
    const easedScrollProgress = easeInOutCubic(scrollProgress)
    const anchorX = windowWidth * ANCHOR_X_PERCENT
    const topThreshold = 3
    const bottomThreshold = 7
    const dynamicThreshold = lerp(topThreshold, bottomThreshold, scrollProgress)

    if (frame > nextChangeFrame) {
      targetAmplitude = randomInRange(MIN_AMPLITUDE, MAX_AMPLITUDE)
      targetFrequency = randomInRange(MIN_FREQUENCY, MAX_FREQUENCY)
      targetWaveSpeed = randomInRange(MIN_WAVE_SPEED, MAX_WAVE_SPEED)
      nextChangeFrame = frame + randomInRange(MIN_CHANGE_INTERVAL_FRAMES, MAX_CHANGE_INTERVAL_FRAMES)
    }

    currentAmplitude = lerp(currentAmplitude, targetAmplitude, WAVE_PARAM_LERP_SPEED)
    currentFrequency = lerp(currentFrequency, targetFrequency, WAVE_PARAM_LERP_SPEED)
    currentWaveSpeed = lerp(currentWaveSpeed, targetWaveSpeed, WAVE_PARAM_LERP_SPEED)

    const dots = dotCount
    const startStateX =
      windowWidth * (isMobile ? 0.7 : RIGHT_DECORATIVE_LINE_X_START_PERCENT) - WAVY_LINE_RIGHT_MARGIN

    let allMetaballsPath = ''

    for (let lineIndex = 0; lineIndex < LINE_COUNT; lineIndex += 1) {
      if (dots === 0 || !decorativeLineYPixels[decorativeLineYPixels.length - LINE_COUNT + lineIndex]) continue

      const currentWidth = startStateX - anchorX
      const x = Array.from({length: dots}, (_, index) => {
        const ratio = dots > 1 ? index / (dots - 1) : 0
        return anchorX + ratio * currentWidth
      })

      const lineRatio = LINE_COUNT > 1 ? lineIndex / (LINE_COUNT - 1) : 0
      const targetLeftY = lerp(anchorYPositions[0], windowHeight * 0.4, lineRatio)
      let currentLeftY = lerp(anchorYPositions[lineIndex], targetLeftY, scrollProgress)
      if (lineIndex === 0) currentLeftY = anchorYPositions[lineIndex]

      const endYTarget = decorativeLineYPixels[decorativeLineYPixels.length - LINE_COUNT + lineIndex]
      const targetRightY = lerp(anchorYPositions[lineIndex], endYTarget, easedScrollProgress)

      if (easedScrollProgress >= 1) {
        draggedYPositions[lineIndex] = endYTarget
      } else if (easedScrollProgress <= 0) {
        draggedYPositions[lineIndex] = anchorYPositions[lineIndex]
      } else {
        draggedYPositions[lineIndex] = lerp(draggedYPositions[lineIndex], targetRightY, DRAG_LERP_SPEED)
      }

      const currentRightY = draggedYPositions[lineIndex]

      const waveComponent = x.map((_, dotIndex) => {
        const ratio = dots > 1 ? dotIndex / (dots - 1) : 0
        const sine =
          Math.sin(currentFrequency * ratio + frame * currentWaveSpeed + lineIndex * 0.15) * ratio
        let baseWave = currentAmplitude * sine
        if (baseWave < 0) {
          baseWave *= Math.pow(1 - easedScrollProgress, UPWARD_WAVE_DAMPENING_STRENGTH)
        }
        const targetDirection = lastScrollDirection === 'up' ? -1 : 1
        smoothSagDirection = lerp(smoothSagDirection, targetDirection, SAG_DIRECTION_LERP_SPEED)
        const baseSag = SAG_MULTIPLIER * ratio * ratio * scrollProgress
        const sag = baseSag * smoothSagDirection
        return (baseWave + sag) * Y_SCALE * (1 - ratio)
      })

      const naturalY = x.map((_, dotIndex) => currentLeftY + waveComponent[dotIndex])
      const rightEndNaturalY = naturalY[naturalY.length - 1] || currentLeftY
      const correctionAtRight = currentRightY - rightEndNaturalY

      const targetYPositions = naturalY.map((yPosition, dotIndex) => {
        const ratio = dots > 1 ? dotIndex / (dots - 1) : 0
        let finalY = yPosition + correctionAtRight * ratio
        if (scrollProgress === 0) finalY += 1
        if (scrollProgress >= 1) finalY += 3
        return finalY
      })

      const currentLineY = dotYPositions[lineIndex]
      const newYPositions: number[] = []

      for (let dotIndex = 0; dotIndex < dots; dotIndex += 1) {
        const newY = lerp(currentLineY[dotIndex], targetYPositions[dotIndex], VISCOUS_LERP_SPEED)
        newYPositions.push(newY)
      }

      dotYPositions[lineIndex] = newYPositions

      let groupedY: number[]
      let groups: Array<{indices: number[]; startX: number; endX: number; centerY: number}>
      let groupedIndices: Set<number>

      if (dots < 3) {
        ;({groupedY, groups, groupedIndices} = groupDots(x, newYPositions, dynamicThreshold))
      } else {
        const mainX = x.slice(0, -2)
        const mainY = newYPositions.slice(0, -2)
        const groupedMain = groupDots(mainX, mainY, dynamicThreshold)
        const endAverage = (newYPositions[dots - 2] + newYPositions[dots - 1]) / 2
        const endGroup = {
          indices: [dots - 2, dots - 1],
          startX: x[dots - 2],
          endX: x[dots - 1],
          centerY: endAverage,
        }
        groups = [...groupedMain.groups, endGroup]
        groupedY = [...groupedMain.groupedY, endAverage, endAverage]
        groupedIndices = new Set(groupedMain.groupedIndices)
        groupedIndices.add(dots - 2)
        groupedIndices.add(dots - 1)
      }

      x.forEach((xPosition, dotIndex) => {
        const dot = dotRefsArray[lineIndex]?.[dotIndex]
        if (!dot) {
          return
        }

        dot.setAttribute('transform', `translate(${xPosition}, ${groupedY[dotIndex]}) scale(${BLOT_SCALE_FACTOR})`)
        dot.style.display = groupedIndices.has(dotIndex) ? 'none' : 'block'
      })

      groups.forEach((group) => {
        allMetaballsPath += getMetaballPathString(group)
      })
    }

    metaballPathElement.setAttribute('d', allMetaballsPath)
    frameHandle = window.requestAnimationFrame(onFrame)
  }

  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollTop = target.scrollTop
    updateActiveSection(scrollTop)
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const sectionTarget = button.dataset.sectionTarget
      if (!sectionTarget) {
        return
      }

      const section = sectionById.get(sectionTarget)
      if (!section) {
        return
      }

      section.scrollIntoView({behavior: 'smooth', block: 'start'})
    })
  })

  scrollContainerElement.addEventListener('scroll', handleScroll)
  const resizeObserver = new ResizeObserver(calculateAnimationMaxScroll)
  resizeObserver.observe(contentWrapperElement)

  calculateLayout()
  setActiveNav(activeSection)
  updateActiveSection(scrollContainerElement.scrollTop)

  window.addEventListener('resize', calculateLayout)
  frameHandle = window.requestAnimationFrame(onFrame)

  root.dataset.magneticInitialized = 'true'

  window.addEventListener('beforeunload', () => {
    if (frameHandle !== null) {
      window.cancelAnimationFrame(frameHandle)
    }
    resizeObserver.disconnect()
    scrollContainerElement.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', calculateLayout)
  })
}

function bootMagneticRuntime() {
  const shells = Array.from(document.querySelectorAll<HTMLElement>('[data-page-shell]'))
  shells.forEach((shell) => {
    if (shell.dataset.magneticInitialized === 'true') {
      return
    }
    initMagneticShell(shell)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootMagneticRuntime)
} else {
  bootMagneticRuntime()
}
