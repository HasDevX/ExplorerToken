let setupReady = false;

export function isSetupReady(): boolean {
  return setupReady;
}

export function setSetupReady(ready: boolean): void {
  setupReady = ready;
}

export function markSetupComplete(): void {
  setupReady = true;
}

export function resetSetupState(): void {
  setupReady = false;
}
