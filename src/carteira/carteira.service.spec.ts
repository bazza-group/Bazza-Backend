import { Test, TestingModule } from '@nestjs/testing';
import { CarteiraService } from './carteira.service';

describe('CarteiraService', () => {
  let service: CarteiraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarteiraService],
    }).compile();

    service = module.get<CarteiraService>(CarteiraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
