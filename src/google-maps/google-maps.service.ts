import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string | undefined;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
  }

  // Calcula distância e tempo entre dois pontos
  async calcularDistancia(
    origemLat: number, origemLng: number,
    destinoLat: number, destinoLng: number,
  ): Promise<{ distanciaKm: number; duracaoMinutos: number }> {
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

    const response = await axios.get(url, {
      params: {
        origins:      `${origemLat},${origemLng}`,
        destinations: `${destinoLat},${destinoLng}`,
        mode:         'driving',
        key:          this.apiKey,
      },
    });

    const elemento = response.data.rows[0].elements[0];

    if (elemento.status !== 'OK') {
      throw new Error('Não foi possível calcular a rota.');
    }

    return {
      distanciaKm:     Math.round(elemento.distance.value / 1000 * 10) / 10,
      duracaoMinutos:  Math.round(elemento.duration.value / 60),
    };
  }

  // Converte endereço em coordenadas
  async geocodificar(endereco: string): Promise<{ lat: number; lng: number }> {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';

    const response = await axios.get(url, {
      params: { address: endereco, key: this.apiKey },
    });

    const resultado = response.data.results[0];
    if (!resultado) throw new Error(`Endereço não encontrado: ${endereco}`);

    return {
      lat: resultado.geometry.location.lat,
      lng: resultado.geometry.location.lng,
    };
  }

  // Calcula o preço com base na distância e peso
  calcularPreco(distanciaKm: number, peso?: string): number {
    const precoPorKm = Number(this.config.get('PRECO_BASE_KM', 350));
    const precoMinimo = Number(this.config.get('PRECO_MINIMO', 500));
    const calculado  = distanciaKm * precoPorKm;
    const precoBase = Math.max(calculado, precoMinimo);

    // Taxa por peso
    const pesoTaxa = peso === 'normal' ? 350 : peso === 'pesado' ? 700 : 0;

    return precoBase + pesoTaxa;
  }
}
