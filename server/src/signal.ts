export type Listener<T> = (data: T) => unknown;

export interface Signal<T> {
  (dataOrListener: T | Listener<T>): unknown;
}

export function signal<T>(listener?: Listener<T>): Signal<T> {
  const listeners = listener ? [listener] : [];
  return (dataOrListener) =>
    typeof dataOrListener === "function"
      ? listeners.push(dataOrListener as Listener<T>)
      : listeners.forEach((listener) => listener(dataOrListener));
}
