/** Error bodies the API sends, worded for the person reading them in the app. */

export const AUTH_ERRORS = {
  duplicateEmail: { error: 'An account with that email already exists' },
  notVerified: { error: 'Please complete the “verify you are human” check and try again' },
  tooManyLogins: { error: 'Too many failed sign-in attempts — try again later' },
  tooManySignups: { error: 'Too many sign-ups from this address — try again later' },
  signupsPaused: { error: 'New sign-ups are paused for now — please try again tomorrow' },
  wrongCredentials: { error: 'Incorrect email or password' },
}

export const PROJECT_ERRORS = {
  notFound: { error: 'Project not found' },
  storageFull: { error: 'Your saved projects have reached the storage limit — delete some first' },
  tooLarge: 'Project data is too large',
}
