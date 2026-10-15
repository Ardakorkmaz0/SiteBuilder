// The name the app calls an account by. A guest's username is a random handle
// ("guest-x7k2m4pq") nobody chose: until they pick a display name, the app
// says "Guest" rather than greeting them with it. The API fills an unset
// display name with the username, so that counts as not chosen.
export function chosenName(user) {
  const name = user?.display_name || ''
  return name && name !== user?.username ? name : ''
}

export function accountName(user, translate, fallback = '') {
  const chosen = chosenName(user)
  if (chosen) return chosen
  if (user?.is_guest) return translate('Guest')
  return user?.username || fallback
}
