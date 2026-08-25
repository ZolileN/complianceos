export const FIRM_ONBOARDING_OPEN_EVENT = 'praxisone:open-firm-onboarding';
export const FIRM_ONBOARDING_VISIBILITY_EVENT = 'praxisone:firm-onboarding-visibility';

export function openFirmOnboardingWizard(startStep = 0) {
  window.dispatchEvent(
    new CustomEvent(FIRM_ONBOARDING_OPEN_EVENT, { detail: { startStep } })
  );
}

export function setFirmOnboardingVisibility(open: boolean) {
  window.dispatchEvent(
    new CustomEvent(FIRM_ONBOARDING_VISIBILITY_EVENT, { detail: { open } })
  );
}
