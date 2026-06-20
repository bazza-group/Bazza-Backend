import { Test, TestingModule } from '@nestjs/testing';
import { PlanosService } from './planos.service';

describe('PlanosService', () => {
  let service: PlanosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanosService],
    }).compile();

    service = module.get<PlanosService>(PlanosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
