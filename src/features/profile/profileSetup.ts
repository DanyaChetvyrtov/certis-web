const PROFILE_SETUP_PENDING_KEY = 'certis.profileSetupPending'

let isPendingInMemory = false

export const markProfileSetupPending = () => {
  isPendingInMemory = true

  try {
    window.sessionStorage.setItem(PROFILE_SETUP_PENDING_KEY, 'true')
  } catch {
    // The in-memory fallback still covers the current page lifecycle.
  }
}

export const isProfileSetupPending = (): boolean => {
  if (isPendingInMemory) {
    return true
  }

  try {
    return window.sessionStorage.getItem(PROFILE_SETUP_PENDING_KEY) === 'true'
  } catch {
    return false
  }
}

export const clearProfileSetupPending = () => {
  isPendingInMemory = false

  try {
    window.sessionStorage.removeItem(PROFILE_SETUP_PENDING_KEY)
  } catch {
    // There is no persisted state to clear when storage is unavailable.
  }
}
