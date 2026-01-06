import prisma from '../../config/database';
import { ApiError } from '../../lib/ApiError';

export interface ShippingCalculation {
  method: string;
  cost: number;
  estimatedDays: number;
  description: string;
}

export class ShippingService {
  // Shipping rates based on distance and weight (in RWF)
  private static readonly BASE_RATE = 1000;
  private static readonly PER_KM_RATE = 50;
  private static readonly PER_KG_RATE = 200;
  private static readonly FREE_SHIPPING_THRESHOLD = 50000; // Free shipping for orders above 50,000 RWF

  static async calculateShipping(
    cooperativeId: string,
    buyerDistrict: string,
    items: Array<{ productId: string; quantity: number }>,
    totalAmount?: number
  ): Promise<ShippingCalculation[]> {
    // Get cooperative location
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { district: true, sector: true },
    });

    if (!cooperative) {
      throw new ApiError(404, 'Cooperative not found');
    }

    // Calculate total weight (estimate based on quantity, assume 1kg per unit for simplicity)
    // In production, products should have weight field
    let totalWeight = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { unit: true },
      });
      if (product) {
        // Estimate weight: assume 1kg per unit for most products
        totalWeight += item.quantity;
      }
    }

    // Calculate distance (simplified - in real app, use Google Maps Distance Matrix API)
    const distance = this.estimateDistance(cooperative.district, buyerDistrict);

    // Check if eligible for free shipping
    const isFreeShippingEligible = totalAmount && totalAmount >= this.FREE_SHIPPING_THRESHOLD;

    // Calculate base cost
    const baseCost = this.BASE_RATE + (distance * this.PER_KM_RATE) + (totalWeight * this.PER_KG_RATE);

    // Calculate costs for different shipping methods
    const standardCost = Math.round(baseCost);
    const expressCost = Math.round(baseCost * 1.5);
    const economyCost = Math.round(baseCost * 0.7);

    const options: ShippingCalculation[] = [
      {
        method: 'STANDARD',
        cost: 0,
        estimatedDays: Math.max(1, Math.ceil(distance / 50)), // Assume 50km per day
        description: 'Free Standard Delivery (3-5 business days)',
      },
      {
        method: 'EXPRESS',
        cost: 0,
        estimatedDays: Math.max(1, Math.ceil(distance / 100)),
        description: 'Free Express delivery (1-2 business days)',
      },
      {
        method: 'ECONOMY',
        cost: 0,
        estimatedDays: Math.max(3, Math.ceil(distance / 30)),
        description: 'Free Economy Delivery (5-7 business days)',
      },
    ];

    return options;
  }

  private static estimateDistance(fromDistrict: string, toDistrict: string): number {
    // Same district
    // if (fromDistrict === toDistrict) return 10;

    // District groups in Rwanda
    // const districtGroups: { [key: string]: string[] } = {
    //   kigali: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
    //   northern: ['Musanze', 'Burera', 'Gakenke', 'Gicumbi', 'Rulindo'],
    //   southern: ['Huye', 'Nyamagabe', 'Nyanza', 'Gisagara', 'Kamonyi', 'Muhanga', 'Nyaruguru', 'Ruhango'],
    //   eastern: ['Nyagatare', 'Kayonza', 'Rwamagana', 'Bugesera', 'Gatsibo', 'Kirehe', 'Ngoma'],
    //   western: ['Rubavu', 'Rusizi', 'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rutsiro'],
    // };

    // const fromRegion = Object.keys(districtGroups).find((region) =>
    //   districtGroups[region].some(d => d.toLowerCase() === fromDistrict.toLowerCase())
    // );
    // const toRegion = Object.keys(districtGroups).find((region) =>
    //   districtGroups[region].some(d => d.toLowerCase() === toDistrict.toLowerCase())
    // );

    // // Same region
    // if (fromRegion && toRegion && fromRegion === toRegion) return 50;

    // // Different regions
    // if (fromRegion && toRegion && fromRegion !== toRegion) return 150;

    // Default distance
    return 100;
  }

  static async getShippingMethods() {
    return [
      {
        id: 'STANDARD',
        name: 'Standard Delivery',
        description: 'Regular delivery within 3-5 business days',
        icon: 'truck',
      },
      {
        id: 'EXPRESS',
        name: 'Express Delivery',
        description: 'Fast delivery within 1-2 business days',
        icon: 'rocket',
      },
      {
        id: 'ECONOMY',
        name: 'Economy Delivery',
        description: 'Budget-friendly delivery within 5-7 business days',
        icon: 'package',
      },
    ];
  }
}

