import { Injectable } from '@nestjs/common';
import { GoogleMapsService } from '../google-maps/google-maps.service'; // Caminho corrigido

@Injectable()
export class PrecificacaoService {
  constructor(private googleMaps: GoogleMapsService) {}

  async calcularEstimativa(oLat: number, oLng: number, dLat: number, dLng: number) {
    const { distanciaKm } = await this.googleMaps.calcularDistancia(oLat, oLng, dLat, dLng);
    const preco = this.googleMaps.calcularPreco(distanciaKm);
    
    return {
      distanciaKm,
      precoEstimado: preco,
      moeda: 'AOA',
    };
  }
}