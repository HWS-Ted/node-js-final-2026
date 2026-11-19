function isUndefined(value) {
  return value === undefined
}

function isNotValidString(value) {
  return typeof value !== 'string' || value.trim().length === 0 || value === ''
}

function isNotValidInteger(value) {
  return typeof value !== 'number' || !Number.isInteger(value) || value <= 0
}

function isNotValidNonNegativeInteger(value) {
  return typeof value !== 'number' || !Number.isInteger(value) || value < 0
}

function isNotValidUuid(value) {
  if (typeof value !== 'string') return true
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return !uuidRegex.test(value)
}

function isValidPassword(value) {
  if (typeof value !== 'string') return false
  const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
  return passwordPattern.test(value)
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(value)
}

function isNotValidHttpsUrl(value) {
  return isNotValidString(value) || !value.startsWith('https://')
}

function isValidDateString(value) {
  return !isNotValidString(value) && !Number.isNaN(Date.parse(value))
}

module.exports = {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidNonNegativeInteger,
  isNotValidUuid,
  isValidPassword,
  isValidEmail,
  isNotValidHttpsUrl,
  isValidDateString
}
