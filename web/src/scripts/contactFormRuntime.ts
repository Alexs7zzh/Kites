type TurnstileWidgetId = string | number

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => TurnstileWidgetId
  reset: (widgetId: TurnstileWidgetId) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

type FormStatus =
  | 'IDLE'
  | 'AWAITING_CAPTCHA'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR'
  | 'TURNSTILE_CONFIG_ERROR'

const STATUS_MESSAGE: Record<Exclude<FormStatus, 'IDLE'>, string> = {
  AWAITING_CAPTCHA: 'Please complete the CAPTCHA challenge.',
  SUBMITTING: 'Sending...',
  SUCCESS: 'Thank you!',
  ERROR: 'Oops! There was a problem.',
  TURNSTILE_CONFIG_ERROR: 'CAPTCHA is not configured.',
}

function ensureTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script="true"]',
    )

    const script = existingScript || document.createElement('script')
    const handleLoad = () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      resolve()
    }
    const handleError = () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      reject(new Error('Failed to load Turnstile script.'))
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    if (!existingScript) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstileScript = 'true'
      document.body.appendChild(script)
    }
  })
}

function setStatus(statusElement: HTMLElement, status: FormStatus, customMessage?: string) {
  if (status === 'IDLE') {
    statusElement.textContent = ''
    statusElement.hidden = true
    statusElement.dataset.status = status
    return
  }

  statusElement.hidden = false
  statusElement.dataset.status = status
  statusElement.textContent = customMessage || STATUS_MESSAGE[status]
}

function initContactForm(form: HTMLFormElement) {
  const statusElement = form.querySelector<HTMLElement>('[data-form-status]')
  const turnstileWrapper = form.querySelector<HTMLElement>('[data-turnstile-wrapper]')
  const turnstileContainer = form.querySelector<HTMLElement>('[data-turnstile-container]')

  if (!statusElement || !turnstileWrapper || !turnstileContainer) {
    return
  }

  const siteKey = (form.dataset.turnstileSiteKey || '').trim()
  const formAction = (form.dataset.formAction || '').trim()

  let widgetId: TurnstileWidgetId | null = null
  let turnstileToken = ''
  let pendingFormData: FormData | null = null

  const requestTurnstileScript = async () => {
    if (!siteKey) {
      return
    }

    try {
      await ensureTurnstileScript()
    } catch {
      setStatus(statusElement, 'ERROR')
    }
  }

  const ensureWidget = async () => {
    if (!siteKey) {
      setStatus(statusElement, 'TURNSTILE_CONFIG_ERROR')
      return false
    }

    await requestTurnstileScript()

    if (!window.turnstile) {
      setStatus(statusElement, 'ERROR')
      return false
    }

    turnstileWrapper.hidden = false

    if (widgetId !== null) {
      window.turnstile.reset(widgetId)
      return true
    }

    widgetId = window.turnstile.render(turnstileContainer, {
      sitekey: siteKey,
      callback: (token: string) => {
        turnstileToken = token

        if (pendingFormData) {
          void submitFormData(pendingFormData)
          pendingFormData = null
        }
      },
      'expired-callback': () => {
        turnstileToken = ''
      },
      'error-callback': () => {
        setStatus(statusElement, 'ERROR')
      },
    })

    return true
  }

  const submitFormData = async (formData: FormData) => {
    if (!formAction) {
      setStatus(statusElement, 'ERROR')
      return
    }

    if (!siteKey) {
      setStatus(statusElement, 'TURNSTILE_CONFIG_ERROR')
      return
    }

    if (!turnstileToken) {
      pendingFormData = formData
      setStatus(statusElement, 'AWAITING_CAPTCHA')
      const ready = await ensureWidget()
      if (!ready) {
        pendingFormData = null
      }
      return
    }

    formData.set('cf-turnstile-response', turnstileToken)
    setStatus(statusElement, 'SUBMITTING')

    try {
      const response = await fetch(formAction, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        form.reset()
        turnstileToken = ''
        setStatus(statusElement, 'SUCCESS')
        turnstileWrapper.hidden = true
        if (window.turnstile && widgetId !== null) {
          window.turnstile.reset(widgetId)
        }
        return
      }

      let message = STATUS_MESSAGE.ERROR
      try {
        const body = (await response.json()) as {errors?: Array<{message?: string}>}
        if (Array.isArray(body.errors) && body.errors.length > 0) {
          const joined = body.errors
            .map((error) => (typeof error?.message === 'string' ? error.message : ''))
            .filter(Boolean)
            .join(', ')
          if (joined) {
            message = joined
          }
        }
      } catch {
        // Ignore parse failures and keep generic message.
      }
      setStatus(statusElement, 'ERROR', message)
    } catch {
      setStatus(statusElement, 'ERROR')
    }
  }

  form.addEventListener('focusin', () => {
    void requestTurnstileScript()
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const formData = new FormData(form)
    void submitFormData(formData)
  })

  setStatus(statusElement, 'IDLE')
}

function bootContactFormRuntime() {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('[data-contact-form]'))
  forms.forEach((form) => {
    if (form.dataset.contactRuntimeInitialized === 'true') {
      return
    }
    form.dataset.contactRuntimeInitialized = 'true'
    initContactForm(form)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootContactFormRuntime)
} else {
  bootContactFormRuntime()
}

export {}
