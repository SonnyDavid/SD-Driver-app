export type DeliveryMode =
  | 'collection'
  | 'delivery'
  | 'completed';

export type DeliveryStep =
  | 'pickup_navigation'
  | 'pickup_verification'
  | 'delivery_navigation'
  | 'delivery_verification'
  | 'finished';

export let currentMode: DeliveryMode =
  'collection';

export let currentStep: DeliveryStep =
  'pickup_navigation';

export let currentOrderIndex = 0;

export const nextOrder = () => {
  currentOrderIndex += 1;
};

export const resetOrders = () => {
  currentOrderIndex = 0;
};

export const switchToDeliveryMode = () => {
  currentMode = 'delivery';

  currentStep =
    'delivery_navigation';

  currentOrderIndex = 0;
};

export const completeSession = () => {
  currentMode = 'completed';

  currentStep = 'finished';
};

export const setStep = (
  step: DeliveryStep
) => {
  currentStep = step;
};