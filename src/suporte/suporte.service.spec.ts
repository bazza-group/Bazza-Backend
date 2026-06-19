import { Test, TestingModule } from '@nestjs/testing';
import { SuporteService } from './suporte.service';

describe('SuporteService', () => {
  let service: SuporteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuporteService],
    }).compile();

    service = module.get<SuporteService>(SuporteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
