export const availableOrders = [

  {
    id: 1,
    price: '£8.40',
    pickup: 'Pizza Palace',
    pickupAddress: 'Oxford Street, London',
    customer: 'John Smith',
    deliveryAddress: 'Baker Street, London',
    status: 'available',
    pin: '482719',
  },

  {
    id: 2,
    price: '£12.20',
    pickup: 'Burger Hub',
    pickupAddress: 'Camden Town, London',
    customer: 'Emily Davis',
    deliveryAddress: 'Soho, London',
    status: 'available',
    pin: '194533',
  },

];

export const myDeliveries: any[] = [];

export const markAsCollected = (
  orderId: number
) => {

  const order =
    myDeliveries.find(
      item => item.id === orderId
    );

  if (order) {
    order.status = 'collected';
  }
};

export const markAsDelivered = (
  orderId: number
) => {

  const order =
    myDeliveries.find(
      item => item.id === orderId
    );

  if (order) {
    order.status = 'delivered';
  }
};