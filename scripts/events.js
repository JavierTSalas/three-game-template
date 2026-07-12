// ponytail: 12-line pub/sub — upgrade to EventTarget if listener removal is ever needed
const listeners = {};
export const events = {
  on(name, fn) { (listeners[name] ||= []).push(fn); },
  emit(name, payload) { (listeners[name] || []).forEach(fn => fn(payload)); },
};
