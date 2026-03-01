import {expect, test, type Page} from '@playwright/test'

const VIEWPORTS = [
  {name: 'mobile-390x844', width: 390, height: 844},
  {name: 'tablet-768x1024', width: 768, height: 1024},
  {name: 'desktop-1024x1366', width: 1024, height: 1366},
  {name: 'desktop-1440x900', width: 1440, height: 900},
  {name: 'desktop-1680x1050', width: 1680, height: 1050},
  {name: 'desktop-1920x1080', width: 1920, height: 1080},
]

const SCROLL_STATES = [
  {name: 'top', ratio: 0},
  {name: 'quarter', ratio: 0.25},
  {name: 'middle', ratio: 0.5},
  {name: 'three-quarters', ratio: 0.75},
  {name: 'end', ratio: 1},
]

async function settleForSnapshot(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => !document.fonts || document.fonts.status === 'loaded')
  await page.waitForTimeout(350)
}

async function scrollToRatio(page: Page, ratio: number) {
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  await page.locator('[data-scroll-container]').evaluate((element, r) => {
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    element.scrollTop = maxScroll * r
  }, clampedRatio)
}

for (const viewport of VIEWPORTS) {
  test(`homepage ${viewport.name}`, async ({page}) => {
    await page.addInitScript(() => {
      let seed = 24681357
      Math.random = () => {
        seed = (seed * 48271) % 2147483647
        return (seed - 1) / 2147483646
      }
    })

    await page.setViewportSize({width: viewport.width, height: viewport.height})
    await page.goto('/', {waitUntil: 'networkidle'})
    await settleForSnapshot(page)

    for (const scrollState of SCROLL_STATES) {
      await scrollToRatio(page, scrollState.ratio)
      await settleForSnapshot(page)
      await expect(page).toHaveScreenshot(`${viewport.name}-${scrollState.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
    }

    const navButtons = page.locator('[data-nav-button]')
    const navCount = await navButtons.count()
    for (let navIndex = 0; navIndex < navCount; navIndex += 1) {
      await navButtons.nth(navIndex).click()
      await settleForSnapshot(page)
      await expect(page).toHaveScreenshot(`${viewport.name}-nav-${navIndex + 1}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
    }
  })
}
