import { Test, TestingModule } from '@nestjs/testing';
import { PrecificacaoService } from './precificacao.service';

describe('PrecificacaoService', () => {
  let service: PrecificacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrecificacaoService],
    }).compile();

    service = module.get<PrecificacaoService>(PrecificacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
