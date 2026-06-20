// src/google-maps/pricing.service.ts
import { Injectable } from '@nestjs/common';

interface PricingInput {
  distanciaKm: number;
  tipoEntrega: string;
  hora?: number;
  isDiaFeriado?: boolean;
}

@Injectable()
export class PricingService {
  private readonly PRECO_MINIMO = 500; // Kz
  private readonly PRECO_POR_KM = 350; // Kz/km
  private readonly TAXA_FRAGIL = 200; // Kz

  calcularPreco(input: PricingInput): number {
    let precoBase = Math.max(
      this.PRECO_MINIMO,
      this.PRECO_POR_KM * input.distanciaKm,
    );

    // Multiplicador por hora (noite: 22-06)
    const hora = input.hora || new Date().getHours();
    if (hora >= 22 || hora < 6) {
      precoBase *= 1.5; // Noite
    } else if (hora >= 12 && hora < 14) {
      precoBase *= 1.3; // Almoço
    }

    // Multiplicador fim de semana
    const hoje = new Date();
    if (hoje.getDay() === 0 || hoje.getDay() === 6) {
      precoBase *= 1.2; // Fim de semana
    }

    // Taxa frágil
    const taxaFragil = input.tipoEntrega === 'fragil' ? this.TAXA_FRAGIL : 0;

    return precoBase + taxaFragil;
  }
}