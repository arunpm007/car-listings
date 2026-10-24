export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A wa.me link with the message typed in, so the mediator knows which car it is about. */
export function whatsappHref(message: string, number: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
