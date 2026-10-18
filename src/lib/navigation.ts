/** Leave modified clicks and non-primary buttons to the browser. */
export function plainNavigation(event: { button?: number; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean; defaultPrevented?: boolean }, target?: string): boolean {
  return !event.defaultPrevented && (event.button === undefined || event.button === 0)
    && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
    && (!target || target === '_self');
}
