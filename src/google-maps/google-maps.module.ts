import { Module } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { PricingService } from './pricing.service';

@Module({
  providers: [GoogleMapsService, PricingService],
  exports: [GoogleMapsService, PricingService],
})
export class GoogleMapsModule {}